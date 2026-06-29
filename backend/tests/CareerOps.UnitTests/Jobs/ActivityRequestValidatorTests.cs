using CareerOps.Application.Jobs;
using CareerOps.Domain.Jobs;
using FluentValidation.TestHelper;
using Xunit;

namespace CareerOps.UnitTests.Jobs;

public sealed class ActivityRequestValidatorTests
{
    private readonly UpdateActivityRequestValidator _validator = new();

    private static UpdateActivityRequest Valid(string label = "Round 1") => new(
        Label: label, Type: JobActivityType.Interview, Status: JobActivityStatus.Planned,
        ScheduledAtUtc: null, DurationMinutes: null, ContactName: null, ContactRole: null,
        MeetingUrl: null, PrepNotes: null, Notes: null);

    [Fact]
    public void Label_is_required() =>
        _validator.TestValidate(Valid(label: "")).ShouldHaveValidationErrorFor(r => r.Label);

    [Fact]
    public void MeetingUrl_over_2000_chars_fails() =>
        _validator.TestValidate(Valid() with { MeetingUrl = new string('x', 2001) })
            .ShouldHaveValidationErrorFor(r => r.MeetingUrl);

    [Fact]
    public void Valid_request_passes() =>
        _validator.TestValidate(Valid()).ShouldNotHaveAnyValidationErrors();
}
