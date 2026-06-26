using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Jobs;

public record UpdateAttachmentRequest(
    JobAttachmentType Type,
    string Title,
    string? FileName,
    string? Url,
    string? Notes
);
