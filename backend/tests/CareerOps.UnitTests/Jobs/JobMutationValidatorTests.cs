using CareerOps.Application.Jobs;
using CareerOps.Domain.Jobs;
using FluentValidation.TestHelper;
using Xunit;

namespace CareerOps.UnitTests.Jobs;

public sealed class JobMutationValidatorTests
{
    private static AddAttachmentRequest Attachment(string title = "Resume v3") =>
        new(JobAttachmentType.Resume, title, null, null, null);

    [Fact]
    public void AddAttachment_blank_title_fails() =>
        new AddAttachmentRequestValidator().TestValidate(Attachment(title: ""))
            .ShouldHaveValidationErrorFor(x => x.Title);

    [Fact]
    public void AddAttachment_title_over_300_fails() =>
        new AddAttachmentRequestValidator().TestValidate(Attachment(title: new string('x', 301)))
            .ShouldHaveValidationErrorFor(x => x.Title);

    [Fact]
    public void AddAttachment_valid_passes() =>
        new AddAttachmentRequestValidator().TestValidate(Attachment())
            .ShouldNotHaveAnyValidationErrors();

    [Fact]
    public void UpdateAttachment_blank_title_fails() =>
        new UpdateAttachmentRequestValidator()
            .TestValidate(new UpdateAttachmentRequest(JobAttachmentType.Resume, "", null, null, null))
            .ShouldHaveValidationErrorFor(x => x.Title);

    [Fact]
    public void UpsertProperty_value_over_4000_fails() =>
        new UpsertPropertyRequestValidator()
            .TestValidate(new UpsertPropertyRequest(new string('x', 4001), JobPropertyValueType.Text))
            .ShouldHaveValidationErrorFor(x => x.Value);

    [Fact]
    public void UpsertProperty_valid_passes() =>
        new UpsertPropertyRequestValidator()
            .TestValidate(new UpsertPropertyRequest("ok", JobPropertyValueType.Text))
            .ShouldNotHaveAnyValidationErrors();

    [Fact]
    public void CompleteActivity_valid_passes() =>
        new CompleteActivityRequestValidator()
            .TestValidate(new CompleteActivityRequest(JobActivityOutcome.Passed, null, null, false))
            .ShouldNotHaveAnyValidationErrors();
}
