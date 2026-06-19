namespace CareerOps.Application.Common;

public interface IClock
{
    DateTime UtcNow { get; }
    DateOnly Today { get; }
}
