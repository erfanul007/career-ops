using CareerOps.Application.FollowUpTasks;
using CareerOps.Domain.Common;
using FluentValidation.TestHelper;
using Xunit;

namespace CareerOps.UnitTests.FollowUpTasks;

public sealed class FollowUpTaskRequestValidatorTests
{
    private readonly CreateFollowUpTaskRequestValidator _validator = new();

    [Fact]
    public void Title_is_required() =>
        _validator.TestValidate(new CreateFollowUpTaskRequest(
            "", null, new DateTime(2026, 6, 20, 0, 0, 0, DateTimeKind.Utc),
            Priority.Medium, null, null))
            .ShouldHaveValidationErrorFor(r => r.Title);

    [Fact]
    public void Valid_request_passes()
    {
        var result = _validator.TestValidate(new CreateFollowUpTaskRequest(
            "Call recruiter", null, new DateTime(2026, 6, 20, 0, 0, 0, DateTimeKind.Utc),
            Priority.Medium, null, null));
        result.ShouldNotHaveAnyValidationErrors();
    }
}
