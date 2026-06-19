using FluentValidation;

namespace CareerOps.Application.JobLeads;

public sealed class CreateJobLeadRequestValidator : AbstractValidator<CreateJobLeadRequest>
{
    public CreateJobLeadRequestValidator()
    {
        RuleFor(r => r.Title).NotEmpty().MaximumLength(300);
        RuleFor(r => r.Priority).IsInEnum();
        RuleFor(r => r.Status).IsInEnum();
        RuleFor(r => r.Source).IsInEnum();
        RuleFor(r => r.RemoteMode).IsInEnum();
        RuleFor(r => r.EmploymentType).IsInEnum();
        RuleFor(r => r.SalaryPeriod).IsInEnum();
        RuleFor(r => r.FitScore).InclusiveBetween(0, 100).When(r => r.FitScore.HasValue);
        RuleFor(r => r.SalaryCurrency).Length(3).When(r => !string.IsNullOrWhiteSpace(r.SalaryCurrency));
        RuleFor(r => r.SalaryMax).GreaterThanOrEqualTo(r => r.SalaryMin!.Value)
            .When(r => r.SalaryMin.HasValue && r.SalaryMax.HasValue)
            .WithMessage("SalaryMax must be greater than or equal to SalaryMin.");
        RuleFor(r => r.SourceUrl).Must(JobLeadValidation.BeHttpUrl)
            .When(r => !string.IsNullOrWhiteSpace(r.SourceUrl))
            .WithMessage("SourceUrl must be a valid http(s) URL.");
        RuleFor(r => r)
            .Must(r => r.CompanyId.HasValue ^ !string.IsNullOrWhiteSpace(r.NewCompanyName))
            .WithName("Company")
            .WithMessage("Provide exactly one of CompanyId or NewCompanyName.");
    }
}

public sealed class UpdateJobLeadRequestValidator : AbstractValidator<UpdateJobLeadRequest>
{
    public UpdateJobLeadRequestValidator()
    {
        RuleFor(r => r.CompanyId).GreaterThan(0);
        RuleFor(r => r.Title).NotEmpty().MaximumLength(300);
        RuleFor(r => r.Priority).IsInEnum();
        RuleFor(r => r.Status).IsInEnum();
        RuleFor(r => r.Source).IsInEnum();
        RuleFor(r => r.RemoteMode).IsInEnum();
        RuleFor(r => r.EmploymentType).IsInEnum();
        RuleFor(r => r.SalaryPeriod).IsInEnum();
        RuleFor(r => r.FitScore).InclusiveBetween(0, 100).When(r => r.FitScore.HasValue);
        RuleFor(r => r.SalaryCurrency).Length(3).When(r => !string.IsNullOrWhiteSpace(r.SalaryCurrency));
        RuleFor(r => r.SalaryMax).GreaterThanOrEqualTo(r => r.SalaryMin!.Value)
            .When(r => r.SalaryMin.HasValue && r.SalaryMax.HasValue)
            .WithMessage("SalaryMax must be greater than or equal to SalaryMin.");
        RuleFor(r => r.SourceUrl).Must(JobLeadValidation.BeHttpUrl)
            .When(r => !string.IsNullOrWhiteSpace(r.SourceUrl))
            .WithMessage("SourceUrl must be a valid http(s) URL.");
    }
}

internal static class JobLeadValidation
{
    public static bool BeHttpUrl(string? value) =>
        Uri.TryCreate(value, UriKind.Absolute, out var uri)
        && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
}
