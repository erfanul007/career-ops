using FluentValidation;

namespace CareerOps.Application.Settings;

public sealed class UpdateUserProfileRequestValidator : AbstractValidator<UpdateUserProfileRequest>
{
    public UpdateUserProfileRequestValidator()
    {
        RuleFor(r => r.FullName).NotEmpty().MaximumLength(200);
        RuleFor(r => r.Email).EmailAddress().When(r => !string.IsNullOrWhiteSpace(r.Email));
        RuleFor(r => r.TargetSalaryMin).GreaterThanOrEqualTo(0).When(r => r.TargetSalaryMin.HasValue);
        RuleFor(r => r.TargetSalaryCurrency).Length(3).When(r => !string.IsNullOrWhiteSpace(r.TargetSalaryCurrency));
        RuleFor(r => r.LinkedInUrl).Must(BeHttpUrl).When(r => !string.IsNullOrWhiteSpace(r.LinkedInUrl));
        RuleFor(r => r.GitHubUrl).Must(BeHttpUrl).When(r => !string.IsNullOrWhiteSpace(r.GitHubUrl));
        RuleFor(r => r.PortfolioUrl).Must(BeHttpUrl).When(r => !string.IsNullOrWhiteSpace(r.PortfolioUrl));
    }

    private static bool BeHttpUrl(string? value) =>
        Uri.TryCreate(value, UriKind.Absolute, out var uri)
        && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
}
