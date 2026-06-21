using CareerOps.Application.JobLeads;
using CareerOps.Domain.JobLeads;
using FluentValidation.TestHelper;

namespace CareerOps.UnitTests.JobLeads;

public class JobLeadRequestValidatorTests
{
    private readonly CreateJobLeadRequestValidator _validator = new();

    private static CreateJobLeadRequest Valid() => new(
        CompanyId: 1, NewCompanyName: null, Title: "Backend Engineer",
        Source: JobSource.LinkedIn, SourceUrl: "https://jobs.example.com/1", JobDescription: null, Location: "Oslo",
        RemoteMode: RemoteMode.Hybrid, EmploymentType: EmploymentType.FullTime,
        SalaryMin: 800000m, SalaryMax: 950000m, SalaryCurrency: "NOK", SalaryPeriod: SalaryPeriod.Yearly,
        Priority: Priority.High, Status: JobLeadStatus.Discovered,
        FitScore: 75, AiSummary: null, MissingKeywords: null, SuggestedResumeAngle: null,
        NextActionAtUtc: null, DeadlineAtUtc: null, Notes: null);

    [Fact]
    public void Valid_request_passes()
        => _validator.TestValidate(Valid()).ShouldNotHaveAnyValidationErrors();

    [Fact]
    public void Blank_title_fails()
        => _validator.TestValidate(Valid() with { Title = "" })
            .ShouldHaveValidationErrorFor(r => r.Title);

    [Fact]
    public void Both_company_options_fails()
        => _validator.TestValidate(Valid() with { CompanyId = 1, NewCompanyName = "X" })
            .ShouldHaveValidationErrorFor("Company");

    [Fact]
    public void Neither_company_option_fails()
        => _validator.TestValidate(Valid() with { CompanyId = null, NewCompanyName = null })
            .ShouldHaveValidationErrorFor("Company");

    [Fact]
    public void New_company_name_only_passes()
        => _validator.TestValidate(Valid() with { CompanyId = null, NewCompanyName = "Cognite" })
            .ShouldNotHaveValidationErrorFor("Company");

    [Fact]
    public void Fit_score_over_100_fails()
        => _validator.TestValidate(Valid() with { FitScore = 101 })
            .ShouldHaveValidationErrorFor(r => r.FitScore);

    [Fact]
    public void Salary_max_below_min_fails()
        => _validator.TestValidate(Valid() with { SalaryMin = 900000m, SalaryMax = 800000m })
            .ShouldHaveValidationErrorFor(r => r.SalaryMax);
}
