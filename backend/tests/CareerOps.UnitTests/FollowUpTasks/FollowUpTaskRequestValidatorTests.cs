using CareerOps.Application.FollowUpTasks;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.JobLeads;
using FluentValidation.TestHelper;

namespace CareerOps.UnitTests.FollowUpTasks;

public class FollowUpTaskRequestValidatorTests
{
    private readonly CreateFollowUpTaskRequestValidator _validator = new();

    [Fact]
    public void Title_is_required() =>
        _validator.TestValidate(new CreateFollowUpTaskRequest(
            "", null, RelatedEntityType.None, null, new DateTime(2026, 6, 20, 0, 0, 0, DateTimeKind.Utc),
            FollowUpStatus.Pending, Priority.Medium)).ShouldHaveValidationErrorFor(r => r.Title);
}
