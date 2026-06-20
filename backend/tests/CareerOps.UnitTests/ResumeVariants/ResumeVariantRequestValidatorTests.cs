using CareerOps.Application.ResumeVariants;
using FluentValidation.TestHelper;

namespace CareerOps.UnitTests.ResumeVariants;

public class ResumeVariantRequestValidatorTests
{
    private readonly CreateResumeVariantRequestValidator _validator = new();

    [Fact]
    public void Name_is_required() =>
        _validator.TestValidate(new CreateResumeVariantRequest("", null, null, null))
                  .ShouldHaveValidationErrorFor(r => r.Name);

    [Fact]
    public void Valid_request_passes() =>
        _validator.TestValidate(new CreateResumeVariantRequest("Backend .NET", "Backend Engineer", null, null))
                  .ShouldNotHaveAnyValidationErrors();
}
