using FluentValidation;

namespace CareerOps.Application.FollowUpTasks;

public sealed class CreateFollowUpTaskRequestValidator : AbstractValidator<CreateFollowUpTaskRequest>
{
    public CreateFollowUpTaskRequestValidator()
    {
        RuleFor(r => r.Title).NotEmpty().MaximumLength(300);
        RuleFor(r => r.DueAtUtc).NotEmpty();
        RuleFor(r => r.Status).IsInEnum();
        RuleFor(r => r.Priority).IsInEnum();
        RuleFor(r => r.RelatedEntityType).IsInEnum();
    }
}

public sealed class UpdateFollowUpTaskRequestValidator : AbstractValidator<UpdateFollowUpTaskRequest>
{
    public UpdateFollowUpTaskRequestValidator()
    {
        RuleFor(r => r.Title).NotEmpty().MaximumLength(300);
        RuleFor(r => r.DueAtUtc).NotEmpty();
        RuleFor(r => r.Status).IsInEnum();
        RuleFor(r => r.Priority).IsInEnum();
        RuleFor(r => r.RelatedEntityType).IsInEnum();
    }
}
