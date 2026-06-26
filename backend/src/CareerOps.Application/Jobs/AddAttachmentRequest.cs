using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Jobs;

public record AddAttachmentRequest(
    JobAttachmentType Type,
    string Title,
    string? FileName,
    string? Url,
    string? Notes
);
