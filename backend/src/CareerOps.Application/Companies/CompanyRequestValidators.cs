using FluentValidation;

namespace CareerOps.Application.Companies;

public sealed class CreateCompanyRequestValidator : AbstractValidator<CreateCompanyRequest>
{
    public CreateCompanyRequestValidator()
    {
        RuleFor(r => r.Name).NotEmpty().MaximumLength(200);
        RuleFor(r => r.WebsiteUrl).Must(CompanyValidation.BeHttpUrl)
            .When(r => !string.IsNullOrWhiteSpace(r.WebsiteUrl))
            .WithMessage("WebsiteUrl must be a valid http(s) URL.");
        RuleFor(r => r.LinkedInUrl).Must(CompanyValidation.BeHttpUrl)
            .When(r => !string.IsNullOrWhiteSpace(r.LinkedInUrl))
            .WithMessage("LinkedInUrl must be a valid http(s) URL.");
        RuleFor(r => r.CompanyType).IsInEnum();
        RuleFor(r => r.MarketType).IsInEnum();
        RuleFor(r => r.CompensationFit).IsInEnum();
    }
}

public sealed class UpdateCompanyRequestValidator : AbstractValidator<UpdateCompanyRequest>
{
    public UpdateCompanyRequestValidator()
    {
        RuleFor(r => r.Name).NotEmpty().MaximumLength(200);
        RuleFor(r => r.WebsiteUrl).Must(CompanyValidation.BeHttpUrl)
            .When(r => !string.IsNullOrWhiteSpace(r.WebsiteUrl))
            .WithMessage("WebsiteUrl must be a valid http(s) URL.");
        RuleFor(r => r.LinkedInUrl).Must(CompanyValidation.BeHttpUrl)
            .When(r => !string.IsNullOrWhiteSpace(r.LinkedInUrl))
            .WithMessage("LinkedInUrl must be a valid http(s) URL.");
        RuleFor(r => r.CompanyType).IsInEnum();
        RuleFor(r => r.MarketType).IsInEnum();
        RuleFor(r => r.CompensationFit).IsInEnum();
    }
}

internal static class CompanyValidation
{
    public static bool BeHttpUrl(string? value) =>
        Uri.TryCreate(value, UriKind.Absolute, out var uri)
        && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
}
