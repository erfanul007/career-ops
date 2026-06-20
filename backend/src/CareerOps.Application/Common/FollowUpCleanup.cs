using CareerOps.Domain.FollowUpTasks;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Application.Common;

// D12 / D35: remove loose-reference FollowUpTask rows (no FK) so deletes leave no orphans.
internal static class FollowUpCleanup
{
    public static async Task RemoveForAsync(IAppDbContext db, RelatedEntityType type, IEnumerable<int> ids, CancellationToken ct)
    {
        var idList = ids.Distinct().ToList();
        if (idList.Count == 0) return;
        var tasks = await db.FollowUpTasks
            .Where(t => t.RelatedEntityType == type && t.RelatedEntityId != null && idList.Contains(t.RelatedEntityId.Value))
            .ToListAsync(ct);
        db.FollowUpTasks.RemoveRange(tasks);
    }
}
