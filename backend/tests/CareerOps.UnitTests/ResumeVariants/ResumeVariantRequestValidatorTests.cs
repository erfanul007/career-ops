using CareerOps.Application.ResumeVariants;
using FluentValidation.TestHelper;

namespace CareerOps.UnitTests.ResumeVariants;

public class ResumeVariantRequestValidatorTests
{
    private readonly CreateResumeVariantRequestValidator _createValidator = new();
    private readonly UpdateResumeVariantRequestValidator _updateValidator = new();

    [Fact]
    public void Name_is_required() =>
        _createValidator.TestValidate(new CreateResumeVariantRequest("", null, null, null))
                        .ShouldHaveValidationErrorFor(r => r.Name);

    [Fact]
    public void Valid_request_passes() =>
        _createValidator.TestValidate(new CreateResumeVariantRequest("Backend .NET", "Backend Engineer", null, null))
                        .ShouldNotHaveAnyValidationErrors();

    [Fact]
    public void Update_name_is_required() =>
        _updateValidator.TestValidate(new UpdateResumeVariantRequest("", null, null, null))
                        .ShouldHaveValidationErrorFor(r => r.Name);

    [Fact]
    public void Update_valid_request_passes() =>
        _updateValidator.TestValidate(new UpdateResumeVariantRequest("Backend .NET", "Backend Engineer", null, null))
                        .ShouldNotHaveAnyValidationErrors();
}
