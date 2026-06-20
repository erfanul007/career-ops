using CareerOps.Application.Common;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.Interviews;
using CareerOps.Domain.JobLeads;
using Mapster;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Application.Interviews;

public sealed class InterviewService(IAppDbContext db, IClock clock)
{
    private IQueryable<Interview> WithRelations() =>
        db.Interviews.Include(i => i.Application).ThenInclude(a => a!.JobLead).ThenInclude(l => l!.Company);

    public async Task<IReadOnlyList<InterviewDto>> ListAsync(CancellationToken ct = default) =>
        (await WithRelations().OrderByDescending(i => i.ScheduledAtUtc).ToListAsync(ct)).Adapt<List<InterviewDto>>();

    public async Task<IReadOnlyList<InterviewDto>> GetUpcomingAsync(CancellationToken ct = default)
    {
        var now = clock.UtcNow;
        var until = now.AddDays(7);
        return (await WithRelations()
            .Where(i => i.Status == InterviewStatus.Scheduled && i.ScheduledAtUtc >= now && i.ScheduledAtUtc <= until)
            .OrderBy(i => i.ScheduledAtUtc).ToListAsync(ct)).Adapt<List<InterviewDto>>();
    }

    public async Task<InterviewDto?> GetAsync(int id, CancellationToken ct = default) =>
        (await WithRelations().FirstOrDefaultAsync(i => i.Id == id, ct))?.Adapt<InterviewDto>();

    // Returns null when the parent application does not exist (endpoint -> 404).
    public async Task<InterviewDto?> CreateAsync(CreateInterviewRequest request, CancellationToken ct = default)
    {
        var app = await db.Applications.Include(a => a.JobLead).FirstOrDefaultAsync(a => a.Id == request.ApplicationId, ct);
        if (app is null) return null;

        var interview = request.Adapt<Interview>();
        db.Interviews.Add(interview);
        if (app.JobLead is { } lead)
            lead.Status = JobLeadStatusTransitions.Advance(lead.Status, ApplicationTrigger.EnteredInterviewStage);
        await db.SaveChangesAsync(ct);
        return await GetAsync(interview.Id, ct);
    }

    public async Task<InterviewDto?> UpdateAsync(int id, UpdateInterviewRequest request, CancellationToken ct = default)
    {
        var interview = await db.Interviews.FirstOrDefaultAsync(i => i.Id == id, ct);
        if (interview is null) return null;
        interview.RoundType = request.RoundType;
        interview.ScheduledAtUtc = request.ScheduledAtUtc;
        interview.DurationMinutes = request.DurationMinutes;
        interview.InterviewerName = request.InterviewerName;
        interview.InterviewerRole = request.InterviewerRole;
        interview.MeetingUrl = request.MeetingUrl;
        interview.Status = request.Status;
        interview.PrepNotes = request.PrepNotes;
        await db.SaveChangesAsync(ct);
        return await GetAsync(id, ct);
    }

    public async Task<InterviewDto?> MarkCompletedAsync(int id, MarkInterviewCompletedRequest request, CancellationToken ct = default)
    {
        var interview = await db.Interviews.FirstOrDefaultAsync(i => i.Id == id, ct);
        if (interview is null) return null;

        var firstCompletion = interview.Complete(request.Outcome, request.Feedback, request.FollowUpRequired, request.FollowUpAtUtc);
        if (firstCompletion && request.FollowUpRequired && request.FollowUpAtUtc is { } due)
        {
            db.FollowUpTasks.Add(new FollowUpTask
            {
                Title = $"Follow up — {interview.RoundType} interview",
                RelatedEntityType = RelatedEntityType.Interview,
                RelatedEntityId = interview.Id,
                DueAtUtc = due,
                Status = FollowUpStatus.Pending,
                Priority = Priority.Medium,
            });
        }
        await db.SaveChangesAsync(ct);
        return await GetAsync(id, ct);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
    {
        var interview = await db.Interviews.FirstOrDefaultAsync(i => i.Id == id, ct);
        if (interview is null) return false;
        await FollowUpCleanup.RemoveForAsync(db, RelatedEntityType.Interview, [id], ct);
        db.Interviews.Remove(interview);
        await db.SaveChangesAsync(ct);
        return true;
    }
}
