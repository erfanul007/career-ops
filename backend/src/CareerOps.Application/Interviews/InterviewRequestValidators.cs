using FluentValidation;

namespace CareerOps.Application.Interviews;

public sealed class CreateInterviewRequestValidator : AbstractValidator<CreateInterviewRequest>
{
    public CreateInterviewRequestValidator()
    {
        RuleFor(r => r.ApplicationId).GreaterThan(0);
        RuleFor(r => r.RoundType).IsInEnum();
        RuleFor(r => r.ScheduledAtUtc).NotEmpty();
        RuleFor(r => r.DurationMinutes).GreaterThan(0).When(r => r.DurationMinutes.HasValue);
        RuleFor(r => r.MeetingUrl).MaximumLength(1000);
        RuleFor(r => r.InterviewerName).MaximumLength(200);
        RuleFor(r => r.InterviewerRole).MaximumLength(200);
    }
}

public sealed class UpdateInterviewRequestValidator : AbstractValidator<UpdateInterviewRequest>
{
    public UpdateInterviewRequestValidator()
    {
        RuleFor(r => r.RoundType).IsInEnum();
        RuleFor(r => r.Status).IsInEnum();
        RuleFor(r => r.ScheduledAtUtc).NotEmpty();
        RuleFor(r => r.DurationMinutes).GreaterThan(0).When(r => r.DurationMinutes.HasValue);
        RuleFor(r => r.MeetingUrl).MaximumLength(1000);
    }
}

public sealed class MarkInterviewCompletedRequestValidator : AbstractValidator<MarkInterviewCompletedRequest>
{
    public MarkInterviewCompletedRequestValidator()
    {
        RuleFor(r => r.Outcome).IsInEnum();
        RuleFor(r => r.FollowUpAtUtc).NotNull().When(r => r.FollowUpRequired)
            .WithMessage("A follow-up date is required when follow-up is requested.");
    }
}
