using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Jobs;

public record JobPropertyDto(
    int Id,
    int JobId,
    string Key,
    string? Value,
    JobPropertyValueType ValueType,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc
);
