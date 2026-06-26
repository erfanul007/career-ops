using CareerOps.Domain.Common;

namespace CareerOps.Domain.Jobs;

public sealed class JobAttachment : AuditableEntity
{
    public int Id { get; set; }
    public int JobId { get; set; }
    public Job? Job { get; set; }

    public JobAttachmentType Type { get; set; }
    public string Title { get; set; } = "";

    public string? FileName { get; set; }
    public string? Url { get; set; }
    public string? StoragePath { get; set; }
    public string? Notes { get; set; }
}
