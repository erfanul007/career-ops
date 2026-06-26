namespace CareerOps.Domain.Jobs;

public sealed class JobProperty
{
    public int Id { get; set; }
    public int JobId { get; set; }
    public Job? Job { get; set; }

    public string Key { get; set; } = "";
    public string? Value { get; set; }
    public JobPropertyValueType ValueType { get; set; }

    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}
