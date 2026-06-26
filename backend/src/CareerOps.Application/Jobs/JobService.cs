using CareerOps.Application.Common;
using CareerOps.Application.Companies;
using CareerOps.Domain.Jobs;
using Mapster;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Application.Jobs;

public sealed class JobService(IAppDbContext db, IClock clock, CompanyService companySvc)
{
    public async Task<JobDetailDto> CreateJobAsync(CreateJobRequest req, CancellationToken ct = default)
    {
        var companyId = req.CompanyId
            ?? (await companySvc.FindOrCreateByNameAsync(req.CompanyName!, ct)).Id;

        var job = new Job
        {
            CompanyId = companyId,
            Title = req.Title,
            Status = req.Status,
            Priority = req.Priority,
            Source = req.Source,
            SourceUrl = req.SourceUrl,
            JobDescription = req.JobDescription,
            Country = req.Country,
            City = req.City,
            LocationText = req.LocationText,
            RemoteMode = req.RemoteMode,
            EmploymentType = req.EmploymentType,
            SalaryMin = req.SalaryMin,
            SalaryMax = req.SalaryMax,
            SalaryCurrency = req.SalaryCurrency,
            SalaryPeriod = req.SalaryPeriod,
            DeadlineAtUtc = req.DeadlineAtUtc,
            FitScore = req.FitScore,
            ResumeLabel = req.ResumeLabel,
            ResumeAngle = req.ResumeAngle,
            CoverLetterNotes = req.CoverLetterNotes,
            Notes = req.Notes
        };
        db.Jobs.Add(job);
        // Seed the timeline so a new job's history is never empty.
        db.JobTransitions.Add(new JobTransition
        {
            Job = job,
            FromStatus = null,
            ToStatus = job.Status,
            ChangedAtUtc = clock.UtcNow,
            Actor = TransitionActor.User,
            Notes = "Job created"
        });
        await db.SaveChangesAsync(ct);
        return await GetJobDetailAsync(job.Id, ct)
            ?? throw new InvalidOperationException("Job not found after create");
    }

    public async Task<JobDetailDto?> UpdateJobAsync(int id, UpdateJobRequest req, CancellationToken ct = default)
    {
        var job = await db.Jobs.FindAsync([id], ct);
        if (job is null) return null;

        job.CompanyId = req.CompanyId;
        job.Title = req.Title;
        job.Priority = req.Priority;
        job.Source = req.Source;
        job.SourceUrl = req.SourceUrl;
        job.JobDescription = req.JobDescription;
        job.Country = req.Country;
        job.City = req.City;
        job.LocationText = req.LocationText;
        job.RemoteMode = req.RemoteMode;
        job.EmploymentType = req.EmploymentType;
        job.SalaryMin = req.SalaryMin;
        job.SalaryMax = req.SalaryMax;
        job.SalaryCurrency = req.SalaryCurrency;
        job.SalaryPeriod = req.SalaryPeriod;
        job.DeadlineAtUtc = req.DeadlineAtUtc;
        job.AppliedAtUtc = req.AppliedAtUtc;
        job.LastContactedAtUtc = req.LastContactedAtUtc;
        job.NextActionAtUtc = req.NextActionAtUtc;
        job.FitScore = req.FitScore;
        job.ResumeLabel = req.ResumeLabel;
        job.ResumeAngle = req.ResumeAngle;
        job.CoverLetterNotes = req.CoverLetterNotes;
        job.OfferSalary = req.OfferSalary;
        job.OfferCurrency = req.OfferCurrency;
        job.OfferDeadlineAtUtc = req.OfferDeadlineAtUtc;
        job.OfferNotes = req.OfferNotes;
        job.RejectionReason = req.RejectionReason;
        job.Notes = req.Notes;

        await db.SaveChangesAsync(ct);
        return await GetJobDetailAsync(id, ct);
    }

    public async Task<JobDetailDto?> GetJobDetailAsync(int id, CancellationToken ct = default)
    {
        var job = await db.Jobs
            .Include(j => j.Company)
            .Include(j => j.Activities)
            .Include(j => j.Properties)
            .Include(j => j.Attachments)
            .Include(j => j.FollowUps)
            .FirstOrDefaultAsync(j => j.Id == id, ct);

        return job?.Adapt<JobDetailDto>();
    }

    public async Task<List<JobDto>> ListJobsAsync(ListJobsQuery query, CancellationToken ct = default)
    {
        var q = db.Jobs.Include(j => j.Company).AsQueryable();

        if (query.Statuses is { Length: > 0 })
            q = q.Where(j => query.Statuses.Contains(j.Status));
        if (query.Source.HasValue)
            q = q.Where(j => j.Source == query.Source.Value);
        if (query.RemoteMode.HasValue)
            q = q.Where(j => j.RemoteMode == query.RemoteMode.Value);
        if (query.EmploymentType.HasValue)
            q = q.Where(j => j.EmploymentType == query.EmploymentType.Value);
        if (query.Countries is { Length: > 0 })
            q = q.Where(j => query.Countries.Contains(j.Country));
        if (query.CompanyIds is { Length: > 0 })
            q = q.Where(j => query.CompanyIds.Contains(j.CompanyId));
        if (query.CompanySearch is not null)
        {
            var cs = query.CompanySearch.ToLower();
            q = q.Where(j => j.Company!.Name.ToLower().Contains(cs));
        }
        if (query.Priority.HasValue)
            q = q.Where(j => j.Priority == query.Priority.Value);
        if (query.SalaryMin.HasValue)
            q = q.Where(j => j.SalaryMin >= query.SalaryMin.Value);
        if (query.SalaryMax.HasValue)
            q = q.Where(j => j.SalaryMax <= query.SalaryMax.Value);
        if (query.AppliedFrom.HasValue)
            q = q.Where(j => j.AppliedAtUtc >= query.AppliedFrom.Value);
        if (query.AppliedTo.HasValue)
            q = q.Where(j => j.AppliedAtUtc <= query.AppliedTo.Value);
        if (query.Search is not null)
        {
            var s = query.Search.ToLower();
            q = q.Where(j =>
                j.Title.ToLower().Contains(s) ||
                j.Company!.Name.ToLower().Contains(s) ||
                (j.SourceUrl != null && j.SourceUrl.ToLower().Contains(s)) ||
                (j.Notes != null && j.Notes.ToLower().Contains(s)));
        }

        return (await q.OrderByDescending(j => j.UpdatedAtUtc).ToListAsync(ct))
            .Adapt<List<JobDto>>();
    }

    public async Task<bool> DeleteJobAsync(int id, CancellationToken ct = default)
    {
        var job = await db.Jobs.FindAsync([id], ct);
        if (job is null) return false;
        db.Jobs.Remove(job);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<JobAttachmentDto?> AddAttachmentAsync(int jobId, AddAttachmentRequest req, CancellationToken ct = default)
    {
        if (!await db.Jobs.AnyAsync(j => j.Id == jobId, ct)) return null;
        var att = new JobAttachment
        {
            JobId = jobId,
            Type = req.Type,
            Title = req.Title,
            FileName = req.FileName,
            Url = req.Url,
            Notes = req.Notes
        };
        db.JobAttachments.Add(att);
        await db.SaveChangesAsync(ct);
        return att.Adapt<JobAttachmentDto>();
    }

    public async Task<JobAttachmentDto?> UpdateAttachmentAsync(int jobId, int attachmentId, UpdateAttachmentRequest req, CancellationToken ct = default)
    {
        var att = await db.JobAttachments.FirstOrDefaultAsync(a => a.Id == attachmentId && a.JobId == jobId, ct);
        if (att is null) return null;
        att.Type = req.Type;
        att.Title = req.Title;
        att.FileName = req.FileName;
        att.Url = req.Url;
        att.Notes = req.Notes;
        await db.SaveChangesAsync(ct);
        return att.Adapt<JobAttachmentDto>();
    }

    public async Task<bool> DeleteAttachmentAsync(int jobId, int attachmentId, CancellationToken ct = default)
    {
        var att = await db.JobAttachments.FirstOrDefaultAsync(a => a.Id == attachmentId && a.JobId == jobId, ct);
        if (att is null) return false;
        db.JobAttachments.Remove(att);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<JobPropertyDto?> UpsertPropertyAsync(int jobId, string key, UpsertPropertyRequest req, CancellationToken ct = default)
    {
        if (!await db.Jobs.AnyAsync(j => j.Id == jobId, ct)) return null;
        var prop = await db.JobProperties.FirstOrDefaultAsync(p => p.JobId == jobId && p.Key == key, ct);
        var now = clock.UtcNow;
        if (prop is null)
        {
            prop = new JobProperty { JobId = jobId, Key = key, Value = req.Value, ValueType = req.ValueType, CreatedAtUtc = now, UpdatedAtUtc = now };
            db.JobProperties.Add(prop);
        }
        else
        {
            prop.Value = req.Value;
            prop.ValueType = req.ValueType;
            prop.UpdatedAtUtc = now;
        }
        await db.SaveChangesAsync(ct);
        return prop.Adapt<JobPropertyDto>();
    }

    public async Task<bool> DeletePropertyAsync(int jobId, string key, CancellationToken ct = default)
    {
        var prop = await db.JobProperties.FirstOrDefaultAsync(p => p.JobId == jobId && p.Key == key, ct);
        if (prop is null) return false;
        db.JobProperties.Remove(prop);
        await db.SaveChangesAsync(ct);
        return true;
    }
}
