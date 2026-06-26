using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Jobs;

public record UpsertPropertyRequest(string? Value, JobPropertyValueType ValueType);
