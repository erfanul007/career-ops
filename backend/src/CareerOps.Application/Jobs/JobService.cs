using CareerOps.Application.Common;
using CareerOps.Application.Companies;
using CareerOps.Domain.Common;
using CareerOps.Domain.Jobs;
using Mapster;

namespace CareerOps.Application.Jobs;

public sealed class JobService(
    IJobRepository jobs,
    IJobAttachmentRepository attachments,
    IJobPropertyRepository properties,
    IUnitOfWork uow,
    IClock clock,
    CompanyService companySvc)
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
        // Seed the timeline so a new job's history is never empty.
        job.Transitions.Add(new JobTransition
        {
            FromStatus = null,
            ToStatus = job.Status,
            ChangedAtUtc = clock.UtcNow,
            Actor = TransitionActor.User,
            Notes = "Job created"
        });
        jobs.Add(job);
        await uow.SaveChangesAsync(ct);
        return await GetJobDetailAsync(job.Id, ct)
            ?? throw new InvalidOperationException("Job not found after create");
    }

    public async Task<JobDetailDto?> UpdateJobAsync(int id, UpdateJobRequest req, CancellationToken ct = default)
    {
        var job = await jobs.FindByIdAsync(id, ct);
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

        await uow.SaveChangesAsync(ct);
        return await GetJobDetailAsync(id, ct);
    }

    public async Task<JobDetailDto?> GetJobDetailAsync(int id, CancellationToken ct = default)
    {
        var job = await jobs.GetDetailAsync(id, ct);
        return job?.Adapt<JobDetailDto>();
    }

    public async Task<List<JobDto>> ListJobsAsync(ListJobsQuery query, CancellationToken ct = default)
    {
        var list = await jobs.ListAsync(query, ct);
        return list.Adapt<List<JobDto>>();
    }

    public async Task<bool> DeleteJobAsync(int id, CancellationToken ct = default)
    {
        var job = await jobs.FindByIdAsync(id, ct);
        if (job is null) return false;
        jobs.Remove(job);
        await uow.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> SetPriorityAsync(int id, Priority priority, CancellationToken ct = default)
    {
        var job = await jobs.FindByIdAsync(id, ct);
        if (job is null) return false;
        job.Priority = priority;
        await uow.SaveChangesAsync(ct);
        return true;
    }

    public async Task<JobAttachmentDto?> AddAttachmentAsync(int jobId, AddAttachmentRequest req, CancellationToken ct = default)
    {
        if (!await jobs.ExistsAsync(jobId, ct)) return null;
        var att = new JobAttachment
        {
            JobId = jobId,
            Type = req.Type,
            Title = req.Title,
            FileName = req.FileName,
            Url = req.Url,
            Notes = req.Notes
        };
        attachments.Add(att);
        await uow.SaveChangesAsync(ct);
        return att.Adapt<JobAttachmentDto>();
    }

    public async Task<JobAttachmentDto?> UpdateAttachmentAsync(int jobId, int attachmentId, UpdateAttachmentRequest req, CancellationToken ct = default)
    {
        var att = await attachments.FindForJobAsync(jobId, attachmentId, ct);
        if (att is null) return null;
        att.Type = req.Type;
        att.Title = req.Title;
        att.FileName = req.FileName;
        att.Url = req.Url;
        att.Notes = req.Notes;
        await uow.SaveChangesAsync(ct);
        return att.Adapt<JobAttachmentDto>();
    }

    public async Task<bool> DeleteAttachmentAsync(int jobId, int attachmentId, CancellationToken ct = default)
    {
        var att = await attachments.FindForJobAsync(jobId, attachmentId, ct);
        if (att is null) return false;
        attachments.Remove(att);
        await uow.SaveChangesAsync(ct);
        return true;
    }

    public async Task<JobPropertyDto?> UpsertPropertyAsync(int jobId, string key, UpsertPropertyRequest req, CancellationToken ct = default)
    {
        if (!await jobs.ExistsAsync(jobId, ct)) return null;
        var prop = await properties.FindByKeyAsync(jobId, key, ct);
        var now = clock.UtcNow;
        if (prop is null)
        {
            prop = new JobProperty { JobId = jobId, Key = key, Value = req.Value, ValueType = req.ValueType, CreatedAtUtc = now, UpdatedAtUtc = now };
            properties.Add(prop);
        }
        else
        {
            prop.Value = req.Value;
            prop.ValueType = req.ValueType;
            prop.UpdatedAtUtc = now;
        }
        await uow.SaveChangesAsync(ct);
        return prop.Adapt<JobPropertyDto>();
    }

    public async Task<bool> DeletePropertyAsync(int jobId, string key, CancellationToken ct = default)
    {
        var prop = await properties.FindByKeyAsync(jobId, key, ct);
        if (prop is null) return false;
        properties.Remove(prop);
        await uow.SaveChangesAsync(ct);
        return true;
    }
}
