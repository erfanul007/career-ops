using CareerOps.Application.Common;
using CareerOps.Domain.FollowUpTasks;
using Mapster;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Application.FollowUpTasks;

public sealed class FollowUpTaskService(IAppDbContext db, IClock clock)
{
    public async Task<FollowUpTaskDto> CreateAsync(CreateFollowUpTaskRequest req, CancellationToken ct = default)
    {
        await ValidateActivityLink(req.JobId, req.JobActivityId, ct);

        var task = new FollowUpTask
        {
            JobId = req.JobId,
            JobActivityId = req.JobActivityId,
            Title = req.Title,
            Description = req.Description,
            DueAtUtc = req.DueAtUtc,
            Status = FollowUpStatus.Pending,
            Priority = req.Priority
        };
        db.FollowUpTasks.Add(task);
        await db.SaveChangesAsync(ct);
        return await LoadDto(task.Id, ct);
    }

    public async Task<FollowUpTaskDto?> UpdateAsync(int id, UpdateFollowUpTaskRequest req, CancellationToken ct = default)
    {
        await ValidateActivityLink(req.JobId, req.JobActivityId, ct);

        var task = await db.FollowUpTasks.FindAsync([id], ct);
        if (task is null) return null;
        task.Title = req.Title;
        task.Description = req.Description;
        task.DueAtUtc = req.DueAtUtc;
        task.Priority = req.Priority;
        task.JobId = req.JobId;
        task.JobActivityId = req.JobActivityId;
        await db.SaveChangesAsync(ct);
        return await LoadDto(id, ct);
    }

    public async Task<bool> CompleteAsync(int id, CancellationToken ct = default)
    {
        var task = await db.FollowUpTasks.FindAsync([id], ct);
        if (task is null) return false;
        task.Status = FollowUpStatus.Completed;
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> SkipAsync(int id, CancellationToken ct = default)
    {
        var task = await db.FollowUpTasks.FindAsync([id], ct);
        if (task is null) return false;
        task.Status = FollowUpStatus.Skipped;
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
    {
        var task = await db.FollowUpTasks.FindAsync([id], ct);
        if (task is null) return false;
        db.FollowUpTasks.Remove(task);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<FollowUpTaskDto?> GetAsync(int id, CancellationToken ct = default)
    {
        var task = await db.FollowUpTasks
            .Include(f => f.Job)
            .Include(f => f.JobActivity)
            .FirstOrDefaultAsync(f => f.Id == id, ct);
        return task?.Adapt<FollowUpTaskDto>();
    }

    public async Task<List<FollowUpTaskDto>> ListDueAsync(CancellationToken ct = default)
    {
        var today = clock.UtcNow.Date;
        var tasks = await db.FollowUpTasks
            .Include(f => f.Job)
            .Include(f => f.JobActivity)
            .Where(f => f.Status == FollowUpStatus.Pending && f.DueAtUtc <= today.AddDays(1))
            .OrderBy(f => f.DueAtUtc)
            .ToListAsync(ct);
        return tasks.Adapt<List<FollowUpTaskDto>>();
    }

    public async Task<List<FollowUpTaskDto>> ListByJobAsync(int jobId, CancellationToken ct = default)
    {
        var tasks = await db.FollowUpTasks
            .Include(f => f.Job)
            .Include(f => f.JobActivity)
            .Where(f => f.JobId == jobId)
            .OrderBy(f => f.DueAtUtc)
            .ToListAsync(ct);
        return tasks.Adapt<List<FollowUpTaskDto>>();
    }

    public async Task<List<FollowUpTaskDto>> ListAllAsync(
        FollowUpStatus? status = null,
        int? jobId = null,
        string? due = null,
        CancellationToken ct = default)
    {
        var q = db.FollowUpTasks
            .Include(f => f.Job)
            .Include(f => f.JobActivity)
            .AsQueryable();
        if (status.HasValue) q = q.Where(f => f.Status == status.Value);
        if (jobId.HasValue) q = q.Where(f => f.JobId == jobId.Value);
        if (due == "today")
        {
            var today = clock.UtcNow.Date;
            q = q.Where(f => f.DueAtUtc >= today && f.DueAtUtc < today.AddDays(1));
        }
        else if (due == "overdue")
        {
            q = q.Where(f => f.DueAtUtc < clock.UtcNow.Date);
        }
        return (await q.OrderBy(f => f.DueAtUtc).ToListAsync(ct)).Adapt<List<FollowUpTaskDto>>();
    }

    private async Task ValidateActivityLink(int? jobId, int? jobActivityId, CancellationToken ct)
    {
        if (!jobActivityId.HasValue) return;
        if (!jobId.HasValue)
            throw new ArgumentException("JobId must be set when JobActivityId is set");

        var activity = await db.JobActivities.FirstOrDefaultAsync(a => a.Id == jobActivityId.Value, ct);
        if (activity is null)
            throw new ArgumentException($"Job activity {jobActivityId.Value} not found");
        if (activity.JobId != jobId.Value)
            throw new ArgumentException("Job activity does not belong to the specified job");
    }

    private async Task<FollowUpTaskDto> LoadDto(int id, CancellationToken ct)
    {
        var task = await db.FollowUpTasks
            .Include(f => f.Job)
            .Include(f => f.JobActivity)
            .FirstAsync(f => f.Id == id, ct);
        return task.Adapt<FollowUpTaskDto>();
    }
}
