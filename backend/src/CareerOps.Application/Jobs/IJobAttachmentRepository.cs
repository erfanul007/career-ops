using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Jobs;

public interface IJobAttachmentRepository
{
    Task<JobAttachment?> FindForJobAsync(int jobId, int attachmentId, CancellationToken ct = default);
    void Add(JobAttachment attachment);
    void Remove(JobAttachment attachment);
}
