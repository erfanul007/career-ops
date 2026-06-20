using CareerOps.Application.Common;
using CareerOps.Domain.FollowUpTasks;
using Mapster;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Application.FollowUpTasks;

public sealed class FollowUpTaskService(IAppDbContext db, IClock clock)
{
    public async Task<IReadOnlyList<FollowUpTaskDto>> ListAsync(CancellationToken ct = default) =>
        (await db.FollowUpTasks.OrderBy(t => t.DueAtUtc).ToListAsync(ct)).Adapt<List<FollowUpTaskDto>>();

    public async Task<IReadOnlyList<FollowUpTaskDto>> GetDueAsync(CancellationToken ct = default)
    {
        var now = clock.UtcNow;
        return (await db.FollowUpTasks
            .Where(t => t.Status == FollowUpStatus.Pending && t.DueAtUtc <= now)
            .OrderBy(t => t.DueAtUtc).ToListAsync(ct)).Adapt<List<FollowUpTaskDto>>();
    }

    public async Task<FollowUpTaskDto?> GetAsync(int id, CancellationToken ct = default) =>
        (await db.FollowUpTasks.FirstOrDefaultAsync(t => t.Id == id, ct))?.Adapt<FollowUpTaskDto>();

    public async Task<FollowUpTaskDto> CreateAsync(CreateFollowUpTaskRequest request, CancellationToken ct = default)
    {
        var task = request.Adapt<FollowUpTask>();
        db.FollowUpTasks.Add(task);
        await db.SaveChangesAsync(ct);
        return task.Adapt<FollowUpTaskDto>();
    }

    public async Task<FollowUpTaskDto?> UpdateAsync(int id, UpdateFollowUpTaskRequest request, CancellationToken ct = default)
    {
        var task = await db.FollowUpTasks.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (task is null) return null;
        request.Adapt(task);
        await db.SaveChangesAsync(ct);
        return task.Adapt<FollowUpTaskDto>();
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
    {
        var task = await db.FollowUpTasks.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (task is null) return false;
        db.FollowUpTasks.Remove(task);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public Task<FollowUpTaskDto?> CompleteAsync(int id, CancellationToken ct = default) => SetStatusAsync(id, t => t.Complete(), ct);
    public Task<FollowUpTaskDto?> SkipAsync(int id, CancellationToken ct = default) => SetStatusAsync(id, t => t.Skip(), ct);

    private async Task<FollowUpTaskDto?> SetStatusAsync(int id, Action<FollowUpTask> mutate, CancellationToken ct)
    {
        var task = await db.FollowUpTasks.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (task is null) return null;
        mutate(task);
        await db.SaveChangesAsync(ct);
        return task.Adapt<FollowUpTaskDto>();
    }
}
