using CareerOps.Application.Jobs;
using CareerOps.Domain.Jobs;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Infrastructure.Persistence.Repositories;

public sealed class JobAttachmentRepository(CareerOpsDbContext db) : IJobAttachmentRepository
{
    public async Task<JobAttachment?> FindForJobAsync(int jobId, int attachmentId, CancellationToken ct = default)
        => await db.JobAttachments.FirstOrDefaultAsync(a => a.Id == attachmentId && a.JobId == jobId, ct);

    public void Add(JobAttachment attachment) => db.JobAttachments.Add(attachment);

    public void Remove(JobAttachment attachment) => db.JobAttachments.Remove(attachment);
}
