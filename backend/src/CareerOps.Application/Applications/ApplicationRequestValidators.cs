using FluentValidation;

namespace CareerOps.Application.Applications;

public sealed class ConvertToApplicationRequestValidator : AbstractValidator<ConvertToApplicationRequest>
{
    public ConvertToApplicationRequestValidator()
    {
        RuleFor(r => r.ResumeVariantId).GreaterThan(0);
        RuleFor(r => r.AppliedAtUtc).NotEmpty();
    }
}

public sealed class UpdateApplicationRequestValidator : AbstractValidator<UpdateApplicationRequest>
{
    public UpdateApplicationRequestValidator()
    {
        RuleFor(r => r.ResumeVariantId).GreaterThan(0);
        RuleFor(r => r.AppliedAtUtc).NotEmpty();
        RuleFor(r => r.ExpectedSalaryCurrency).Length(3).When(r => !string.IsNullOrWhiteSpace(r.ExpectedSalaryCurrency));
    }
}

public sealed class ChangeStageRequestValidator : AbstractValidator<ChangeStageRequest>
{
    public ChangeStageRequestValidator() => RuleFor(r => r.Stage).IsInEnum();
}
