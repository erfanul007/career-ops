namespace CareerOps.Domain.Jobs;

public sealed class JobTransition
{
    public int Id { get; set; }
    public int JobId { get; set; }
    public Job? Job { get; set; }

    public JobStatus? FromStatus { get; set; }
    public JobStatus ToStatus { get; set; }

    public DateTime ChangedAtUtc { get; set; }
    public TransitionActor Actor { get; set; }
    public string? Notes { get; set; }
}
