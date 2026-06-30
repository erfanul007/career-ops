using CareerOps.Application.Jobs;
using CareerOps.Domain.Common;
using Xunit;

namespace CareerOps.UnitTests.Jobs;

public sealed class SetJobPriorityValidatorTests
{
    [Fact]
    public void Rejects_undefined_priority()
        => Assert.False(new SetJobPriorityRequestValidator()
            .Validate(new SetJobPriorityRequest((Priority)99)).IsValid);

    [Theory]
    [InlineData(Priority.Low)]
    [InlineData(Priority.Medium)]
    [InlineData(Priority.High)]
    public void Accepts_defined_priority(Priority p)
        => Assert.True(new SetJobPriorityRequestValidator()
            .Validate(new SetJobPriorityRequest(p)).IsValid);
}
