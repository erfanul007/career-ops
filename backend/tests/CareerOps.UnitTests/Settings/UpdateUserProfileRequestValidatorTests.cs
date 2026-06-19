using CareerOps.Application.Settings;
using FluentValidation.TestHelper;

namespace CareerOps.UnitTests.Settings;

public class UpdateUserProfileRequestValidatorTests
{
    private readonly UpdateUserProfileRequestValidator _validator = new();

    private static UpdateUserProfileRequest Valid() => new(
        FullName: "Ada Lovelace", Email: "ada@example.com", Phone: null,
        LinkedInUrl: null, GitHubUrl: null, PortfolioUrl: null,
        CurrentLocation: null, TargetRoles: null, TargetSalaryMin: 800000m,
        TargetSalaryCurrency: "NOK", SearchDeadlineUtc: null,
        PreferredTechStack: null, CareerSummary: null);

    [Fact]
    public void Valid_request_passes()
        => _validator.TestValidate(Valid()).ShouldNotHaveAnyValidationErrors();

    [Fact]
    public void Blank_full_name_fails()
        => _validator.TestValidate(Valid() with { FullName = "" })
            .ShouldHaveValidationErrorFor(r => r.FullName);

    [Fact]
    public void Bad_email_fails()
        => _validator.TestValidate(Valid() with { Email = "not-an-email" })
            .ShouldHaveValidationErrorFor(r => r.Email);

    [Fact]
    public void Negative_salary_fails()
        => _validator.TestValidate(Valid() with { TargetSalaryMin = -1m })
            .ShouldHaveValidationErrorFor(r => r.TargetSalaryMin);

    [Fact]
    public void Bad_url_fails()
        => _validator.TestValidate(Valid() with { LinkedInUrl = "ftp://nope" })
            .ShouldHaveValidationErrorFor(r => r.LinkedInUrl);
}
