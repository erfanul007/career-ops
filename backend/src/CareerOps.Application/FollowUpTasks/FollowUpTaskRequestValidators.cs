using FluentValidation;

namespace CareerOps.Application.FollowUpTasks;

public sealed class CreateFollowUpTaskRequestValidator : AbstractValidator<CreateFollowUpTaskRequest>
{
    public CreateFollowUpTaskRequestValidator()
    {
        RuleFor(r => r.Title).NotEmpty().MaximumLength(300);
        RuleFor(r => r.DueAtUtc).NotEmpty();
        RuleFor(r => r.Priority).IsInEnum();
        RuleFor(r => r.JobActivityId)
            .Null().When(r => !r.JobId.HasValue)
            .WithMessage("JobId must be set when JobActivityId is set");
    }
}

public sealed class UpdateFollowUpTaskRequestValidator : AbstractValidator<UpdateFollowUpTaskRequest>
{
    public UpdateFollowUpTaskRequestValidator()
    {
        RuleFor(r => r.Title).NotEmpty().MaximumLength(300);
        RuleFor(r => r.DueAtUtc).NotEmpty();
        RuleFor(r => r.Priority).IsInEnum();
        RuleFor(r => r.JobActivityId)
            .Null().When(r => !r.JobId.HasValue)
            .WithMessage("JobId must be set when JobActivityId is set");
    }
}
