using CareerOps.Application.Common;
using CareerOps.Domain.Applications;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.JobLeads;
using Mapster;
using Microsoft.EntityFrameworkCore;
using DomainApplication = CareerOps.Domain.Applications.Application;

namespace CareerOps.Application.Applications;

public sealed class ApplicationService(IAppDbContext db)
{
    private IQueryable<DomainApplication> WithRelations() =>
        db.Applications.Include(a => a.JobLead).ThenInclude(l => l!.Company).Include(a => a.ResumeVariant);

    public async Task<IReadOnlyList<ApplicationDto>> ListAsync(CancellationToken ct = default) =>
        (await WithRelations().OrderByDescending(a => a.UpdatedAtUtc).ToListAsync(ct)).Adapt<List<ApplicationDto>>();

    public async Task<ApplicationDto?> GetAsync(int id, CancellationToken ct = default) =>
        (await WithRelations().FirstOrDefaultAsync(a => a.Id == id, ct))?.Adapt<ApplicationDto>();

    public async Task<ConvertResult> ConvertAsync(int leadId, ConvertToApplicationRequest request, CancellationToken ct = default)
    {
        var lead = await db.JobLeads.FirstOrDefaultAsync(l => l.Id == leadId, ct);
        if (lead is null) return new(ConvertOutcome.LeadNotFound, null);
        if (await db.Applications.AnyAsync(a => a.JobLeadId == leadId, ct))
            return new(ConvertOutcome.AlreadyConverted, null);

        var app = new DomainApplication
        {
            JobLeadId = leadId,
            ResumeVariantId = request.ResumeVariantId,
            AppliedAtUtc = request.AppliedAtUtc,
            CurrentStage = ApplicationStage.Applied,
            Status = ApplicationStatus.Active,
            NextStep = request.NextStep,
            NextActionAtUtc = request.NextActionAtUtc,
            Notes = request.Notes,
        };
        db.Applications.Add(app);
        lead.Status = JobLeadStatusTransitions.Advance(lead.Status, ApplicationTrigger.Created);
        await db.SaveChangesAsync(ct);
        return new(ConvertOutcome.Created, (await GetAsync(app.Id, ct))!);
    }

    public async Task<ApplicationDto?> UpdateAsync(int id, UpdateApplicationRequest request, CancellationToken ct = default)
    {
        var app = await db.Applications.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (app is null) return null;
        app.ResumeVariantId = request.ResumeVariantId;
        app.AppliedAtUtc = request.AppliedAtUtc;
        app.ExpectedSalary = request.ExpectedSalary;
        app.ExpectedSalaryCurrency = request.ExpectedSalaryCurrency;
        app.NoticePeriod = request.NoticePeriod;
        app.NextStep = request.NextStep;
        app.NextActionAtUtc = request.NextActionAtUtc;
        app.Notes = request.Notes;
        await db.SaveChangesAsync(ct);
        return await GetAsync(id, ct);
    }

    public Task<ApplicationDto?> ChangeStageAsync(int id, ChangeStageRequest request, CancellationToken ct = default) =>
        ApplyAsync(id, app => app.ChangeStage(request.Stage), ct);

    public Task<ApplicationDto?> MarkRejectedAsync(int id, MarkRejectedRequest request, CancellationToken ct = default) =>
        ApplyAsync(id, app => app.MarkRejected(request.RejectionReason), ct);

    public Task<ApplicationDto?> MarkOfferAsync(int id, CancellationToken ct = default) =>
        ApplyAsync(id, app => app.MarkOffer(), ct);

    public Task<ApplicationDto?> MarkGhostedAsync(int id, CancellationToken ct = default) =>
        ApplyAsync(id, app => app.MarkGhosted(), ct);

    private async Task<ApplicationDto?> ApplyAsync(int id, Action<DomainApplication> mutate, CancellationToken ct)
    {
        var app = await db.Applications.Include(a => a.JobLead).FirstOrDefaultAsync(a => a.Id == id, ct);
        if (app is null) return null;
        mutate(app);
        if (app.LastTrigger is { } trigger && app.JobLead is { } lead)
            lead.Status = JobLeadStatusTransitions.Advance(lead.Status, trigger);
        await db.SaveChangesAsync(ct);
        return await GetAsync(id, ct);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
    {
        var app = await db.Applications.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (app is null) return false;

        var tasks = await db.FollowUpTasks
            .Where(t => t.RelatedEntityType == RelatedEntityType.Application && t.RelatedEntityId == id)
            .ToListAsync(ct);
        db.FollowUpTasks.RemoveRange(tasks);

        db.Applications.Remove(app);
        await db.SaveChangesAsync(ct);
        return true;
    }
}
