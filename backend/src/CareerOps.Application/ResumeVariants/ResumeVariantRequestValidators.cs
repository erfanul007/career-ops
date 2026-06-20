using FluentValidation;

namespace CareerOps.Application.ResumeVariants;

public sealed class CreateResumeVariantRequestValidator : AbstractValidator<CreateResumeVariantRequest>
{
    public CreateResumeVariantRequestValidator()
    {
        RuleFor(r => r.Name).NotEmpty().MaximumLength(200);
        RuleFor(r => r.TargetRole).MaximumLength(200);
    }
}

public sealed class UpdateResumeVariantRequestValidator : AbstractValidator<UpdateResumeVariantRequest>
{
    public UpdateResumeVariantRequestValidator()
    {
        RuleFor(r => r.Name).NotEmpty().MaximumLength(200);
        RuleFor(r => r.TargetRole).MaximumLength(200);
    }
}
