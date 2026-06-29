using CareerOps.Application.Common;
using CareerOps.Application.Jobs;
using CareerOps.Domain.FollowUpTasks;
using Mapster;

namespace CareerOps.Application.FollowUpTasks;

public sealed class FollowUpTaskService(
    IFollowUpTaskRepository tasks,
    IJobActivityRepository activities,
    IUnitOfWork uow,
    IClock clock)
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
        tasks.Add(task);
        await uow.SaveChangesAsync(ct);
        return await LoadDto(task.Id, ct);
    }

    public async Task<FollowUpTaskDto?> UpdateAsync(int id, UpdateFollowUpTaskRequest req, CancellationToken ct = default)
    {
        await ValidateActivityLink(req.JobId, req.JobActivityId, ct);

        var task = await tasks.FindByIdAsync(id, ct);
        if (task is null) return null;
        task.Title = req.Title;
        task.Description = req.Description;
        task.DueAtUtc = req.DueAtUtc;
        task.Priority = req.Priority;
        task.JobId = req.JobId;
        task.JobActivityId = req.JobActivityId;
        await uow.SaveChangesAsync(ct);
        return await LoadDto(id, ct);
    }

    public async Task<bool> CompleteAsync(int id, CancellationToken ct = default)
    {
        var task = await tasks.FindByIdAsync(id, ct);
        if (task is null) return false;
        task.Status = FollowUpStatus.Completed;
        await uow.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> SkipAsync(int id, CancellationToken ct = default)
    {
        var task = await tasks.FindByIdAsync(id, ct);
        if (task is null) return false;
        task.Status = FollowUpStatus.Skipped;
        await uow.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
    {
        var task = await tasks.FindByIdAsync(id, ct);
        if (task is null) return false;
        tasks.Remove(task);
        await uow.SaveChangesAsync(ct);
        return true;
    }

    public async Task<FollowUpTaskDto?> GetAsync(int id, CancellationToken ct = default)
    {
        var task = await tasks.GetDetailAsync(id, ct);
        return task?.Adapt<FollowUpTaskDto>();
    }

    public async Task<List<FollowUpTaskDto>> ListDueAsync(CancellationToken ct = default)
    {
        var today = clock.UtcNow.Date;
        var list = await tasks.ListDueAsync(today.AddDays(1), ct);
        return list.Adapt<List<FollowUpTaskDto>>();
    }

    public async Task<List<FollowUpTaskDto>> ListByJobAsync(int jobId, CancellationToken ct = default)
    {
        var list = await tasks.ListByJobAsync(jobId, ct);
        return list.Adapt<List<FollowUpTaskDto>>();
    }

    public async Task<List<FollowUpTaskDto>> ListAllAsync(
        FollowUpStatus? status = null,
        int? jobId = null,
        string? due = null,
        CancellationToken ct = default)
    {
        DateTime? from = null;
        DateTime? to = null;
        if (due == "today")
        {
            var today = clock.UtcNow.Date;
            from = today;
            to = today.AddDays(1);
        }
        else if (due == "overdue")
        {
            to = clock.UtcNow.Date;
        }

        var list = await tasks.ListAsync(new FollowUpTaskFilter(status, jobId, from, to), ct);
        return list.Adapt<List<FollowUpTaskDto>>();
    }

    private async Task ValidateActivityLink(int? jobId, int? jobActivityId, CancellationToken ct)
    {
        if (!jobActivityId.HasValue) return;
        if (!jobId.HasValue)
            throw new ArgumentException("JobId must be set when JobActivityId is set");

        var activity = await activities.FindByIdAsync(jobActivityId.Value, ct);
        if (activity is null)
            throw new ArgumentException($"Job activity {jobActivityId.Value} not found");
        if (activity.JobId != jobId.Value)
            throw new ArgumentException("Job activity does not belong to the specified job");
    }

    private async Task<FollowUpTaskDto> LoadDto(int id, CancellationToken ct)
    {
        var task = await tasks.GetDetailAsync(id, ct)
            ?? throw new InvalidOperationException($"Follow-up task {id} not found after save");
        return task.Adapt<FollowUpTaskDto>();
    }
}
