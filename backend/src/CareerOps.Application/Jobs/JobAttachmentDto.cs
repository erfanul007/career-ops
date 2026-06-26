using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Jobs;

public record JobAttachmentDto(
    int Id,
    int JobId,
    JobAttachmentType Type,
    string Title,
    string? FileName,
    string? Url,
    string? Notes,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc
);
