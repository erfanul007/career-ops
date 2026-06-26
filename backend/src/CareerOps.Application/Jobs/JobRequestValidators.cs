using FluentValidation;

namespace CareerOps.Application.Jobs;

public sealed class CreateJobRequestValidator : AbstractValidator<CreateJobRequest>
{
    public CreateJobRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(300);
        RuleFor(x => x.CompanyId).GreaterThan(0).When(x => x.CompanyId.HasValue);
        RuleFor(x => x.SourceUrl).MaximumLength(2000).When(x => x.SourceUrl is not null);
        RuleFor(x => x.FitScore).InclusiveBetween(1, 10).When(x => x.FitScore is not null);
        RuleFor(x => x)
            .Must(x => x.CompanyId.HasValue || !string.IsNullOrWhiteSpace(x.CompanyName))
            .WithMessage("Either CompanyId or CompanyName must be provided");
    }
}

public sealed class UpdateJobRequestValidator : AbstractValidator<UpdateJobRequest>
{
    public UpdateJobRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(300);
        RuleFor(x => x.CompanyId).GreaterThan(0);
        RuleFor(x => x.SourceUrl).MaximumLength(2000).When(x => x.SourceUrl is not null);
        RuleFor(x => x.FitScore).InclusiveBetween(1, 10).When(x => x.FitScore is not null);
    }
}

public sealed class TransitionJobRequestValidator : AbstractValidator<TransitionJobRequest>
{
    public TransitionJobRequestValidator()
    {
        RuleFor(x => x.ToStatus).IsInEnum();
        RuleFor(x => x.Notes).MaximumLength(1000).When(x => x.Notes is not null);
    }
}

public sealed class CreateActivityRequestValidator : AbstractValidator<CreateActivityRequest>
{
    public CreateActivityRequestValidator()
    {
        RuleFor(x => x.Label).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Type).IsInEnum();
        RuleFor(x => x.MeetingUrl).MaximumLength(2000).When(x => x.MeetingUrl is not null);
    }
}
