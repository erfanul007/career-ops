using CareerOps.Application.Jobs;
using CareerOps.Domain.Common;
using CareerOps.Domain.Jobs;
using ModelContextProtocol.Server;
using System.ComponentModel;

namespace CareerOps.Presentation.Mcp;

[McpServerToolType]
public sealed class JobTools(JobService jobSvc, JobWorkflowService workflowSvc, JobActivityService activitySvc)
{
    [McpServerTool, Description("List jobs with optional filters. Statuses, source, remoteMode, priority, countries (multi-value) can all be filtered. Search matches title, company name, source URL, and notes.")]
    public async Task<object> list_jobs(
        [Description("Filter by statuses (e.g. Applied, Interviewing)")] JobStatus[]? statuses = null,
        [Description("Filter by source")] JobSource? source = null,
        [Description("Filter by remote mode")] RemoteMode? remoteMode = null,
        [Description("Filter by employment type")] EmploymentType? employmentType = null,
        [Description("Filter by countries (e.g. [\"BD\",\"DE\",\"IE\"])")] string[]? countries = null,
        [Description("Filter by company name (partial match)")] string? companySearch = null,
        [Description("Filter by priority")] Priority? priority = null,
        [Description("Free-text search across title, company, sourceUrl, notes")] string? search = null)
        => await jobSvc.ListJobsAsync(new ListJobsQuery(
            Statuses: statuses,
            Source: source,
            RemoteMode: remoteMode,
            EmploymentType: employmentType,
            Countries: countries,
            CompanySearch: companySearch,
            Priority: priority,
            Search: search));

    [McpServerTool, Description("Get full job detail including activities, follow-ups, properties, and attachments.")]
    public async Task<object?> get_job([Description("Job ID")] int jobId)
        => await jobSvc.GetJobDetailAsync(jobId);

    [McpServerTool, Description("Create a new job. Provide either companyId (if company already exists) or companyName (auto find-or-create). Status defaults to Discovered if not specified.")]
    public async Task<object> create_job(
        [Description("Job title")] string title,
        [Description("Job source")] JobSource source,
        [Description("Company ID (provide this OR companyName)")] int? companyId = null,
        [Description("Company name — used to find or create the company (provide this OR companyId)")] string? companyName = null,
        [Description("Starting status")] JobStatus status = JobStatus.Discovered,
        [Description("Priority")] Priority priority = Priority.Medium,
        [Description("Source URL (job posting link)")] string? sourceUrl = null,
        [Description("Job description text")] string? jobDescription = null,
        [Description("Country code or name (e.g. BD, DE, IE, GB, NO)")] string? country = null,
        [Description("City")] string? city = null,
        [Description("Remote mode")] RemoteMode remoteMode = RemoteMode.OnSite,
        [Description("Employment type")] EmploymentType employmentType = EmploymentType.FullTime,
        [Description("Notes")] string? notes = null)
    {
        if (!companyId.HasValue && string.IsNullOrWhiteSpace(companyName))
            throw new ArgumentException("Either companyId or companyName must be provided");
        return await jobSvc.CreateJobAsync(new CreateJobRequest(
            CompanyId: companyId,
            Title: title,
            Status: status,
            Priority: priority,
            Source: source,
            SourceUrl: sourceUrl,
            JobDescription: jobDescription,
            Country: country,
            City: city,
            LocationText: null,
            RemoteMode: remoteMode,
            EmploymentType: employmentType,
            SalaryMin: null,
            SalaryMax: null,
            SalaryCurrency: null,
            SalaryPeriod: SalaryPeriod.Annual,
            DeadlineAtUtc: null,
            FitScore: null,
            ResumeLabel: null,
            ResumeAngle: null,
            CoverLetterNotes: null,
            Notes: notes,
            CompanyName: companyName));
    }

    [McpServerTool, Description("Update job details (patch — only provided fields change). Does not change status — use transition_job for that.")]
    public async Task<object?> update_job(
        [Description("Job ID")] int jobId,
        [Description("Job title (optional)")] string? title = null,
        [Description("Priority (optional)")] Priority? priority = null,
        [Description("Source (optional)")] JobSource? source = null,
        [Description("Source URL (optional)")] string? sourceUrl = null,
        [Description("Notes (optional)")] string? notes = null,
        [Description("Next action date UTC (optional)")] DateTime? nextActionAtUtc = null,
        [Description("FitScore 1-10 (optional)")] int? fitScore = null,
        [Description("Resume label (optional)")] string? resumeLabel = null,
        [Description("Offer salary (optional)")] decimal? offerSalary = null,
        [Description("Offer notes (optional)")] string? offerNotes = null,
        [Description("Rejection reason (optional)")] string? rejectionReason = null)
    {
        var existing = await jobSvc.GetJobDetailAsync(jobId);
        if (existing is null) return null;
        return await jobSvc.UpdateJobAsync(jobId, new UpdateJobRequest(
            existing.CompanyId,
            title ?? existing.Title,
            priority ?? existing.Priority,
            source ?? existing.Source,
            sourceUrl ?? existing.SourceUrl,
            existing.JobDescription,
            existing.Country,
            existing.City,
            existing.LocationText,
            existing.RemoteMode,
            existing.EmploymentType,
            existing.SalaryMin,
            existing.SalaryMax,
            existing.SalaryCurrency,
            existing.SalaryPeriod,
            existing.DeadlineAtUtc,
            existing.AppliedAtUtc,
            existing.LastContactedAtUtc,
            nextActionAtUtc ?? existing.NextActionAtUtc,
            fitScore ?? existing.FitScore,
            resumeLabel ?? existing.ResumeLabel,
            existing.ResumeAngle,
            existing.CoverLetterNotes,
            offerSalary ?? existing.OfferSalary,
            existing.OfferCurrency,
            existing.OfferDeadlineAtUtc,
            offerNotes ?? existing.OfferNotes,
            rejectionReason ?? existing.RejectionReason,
            notes ?? existing.Notes));
    }

    [McpServerTool, Description("Transition a job to a new status. Actor is set to Agent automatically.")]
    public async Task<object> transition_job(
        [Description("Job ID")] int jobId,
        [Description("Target status")] JobStatus toStatus,
        [Description("Optional notes about the transition")] string? notes = null)
        => await workflowSvc.TransitionJobAsync(jobId, toStatus, notes, TransitionActor.Agent);

    [McpServerTool, Description("Archive a job (shorthand for transition to Archived).")]
    public async Task<object> archive_job(
        [Description("Job ID")] int jobId,
        [Description("Optional reason")] string? notes = null)
        => await workflowSvc.TransitionJobAsync(jobId, JobStatus.Archived, notes, TransitionActor.Agent);

    [McpServerTool, Description("Add an activity (interview, screening, etc.) to a job.")]
    public async Task<object?> add_job_activity(
        [Description("Job ID")] int jobId,
        [Description("Activity label, e.g. 'Technical Round 1'")] string label,
        [Description("Activity type")] JobActivityType type,
        [Description("Scheduled datetime (UTC)")] DateTime? scheduledAtUtc = null,
        [Description("Contact name")] string? contactName = null,
        [Description("Meeting URL")] string? meetingUrl = null,
        [Description("Prep notes")] string? prepNotes = null)
        => await activitySvc.AddActivityAsync(jobId, new CreateActivityRequest(
            label, type, JobActivityStatus.Planned, scheduledAtUtc, null, contactName, null, meetingUrl, prepNotes, null));

    [McpServerTool, Description("Update a job activity.")]
    public async Task<object?> update_job_activity(
        [Description("Job ID")] int jobId,
        [Description("Activity ID")] int activityId,
        [Description("Activity label")] string label,
        [Description("Activity type")] JobActivityType type,
        [Description("Status")] JobActivityStatus status,
        [Description("Scheduled datetime (UTC)")] DateTime? scheduledAtUtc = null,
        [Description("Contact name")] string? contactName = null,
        [Description("Meeting URL")] string? meetingUrl = null,
        [Description("Notes")] string? notes = null)
        => await activitySvc.UpdateActivityAsync(jobId, activityId, new UpdateActivityRequest(
            label, type, status, scheduledAtUtc, null, contactName, null, meetingUrl, null, notes));

    [McpServerTool, Description("Mark a job activity as completed with outcome and optional feedback.")]
    public async Task<object> complete_job_activity(
        [Description("Job ID")] int jobId,
        [Description("Activity ID")] int activityId,
        [Description("Outcome")] JobActivityOutcome outcome,
        [Description("Feedback notes")] string? feedback = null,
        [Description("General notes")] string? notes = null,
        [Description("Create a follow-up task?")] bool createFollowUp = false)
    {
        var (activity, suggestion) = await activitySvc.CompleteActivityAsync(
            jobId, activityId, new CompleteActivityRequest(outcome, feedback, notes, createFollowUp));
        return new { activity, suggestion };
    }

    [McpServerTool, Description("Create or update a job attachment (metadata only — no file upload). Omit attachmentId to create; provide it to update.")]
    public async Task<object?> upsert_job_attachment(
        [Description("Job ID")] int jobId,
        [Description("Attachment type")] JobAttachmentType type,
        [Description("Title / display name")] string title,
        [Description("Attachment ID (omit to create, provide to update)")] int? attachmentId = null,
        [Description("File name")] string? fileName = null,
        [Description("URL")] string? url = null,
        [Description("Notes")] string? notes = null)
    {
        if (attachmentId.HasValue)
            return await jobSvc.UpdateAttachmentAsync(jobId, attachmentId.Value, new UpdateAttachmentRequest(type, title, fileName, url, notes));
        return await jobSvc.AddAttachmentAsync(jobId, new AddAttachmentRequest(type, title, fileName, url, notes));
    }

    [McpServerTool, Description("Remove a job attachment.")]
    public async Task<bool> remove_job_attachment(
        [Description("Job ID")] int jobId,
        [Description("Attachment ID")] int attachmentId)
        => await jobSvc.DeleteAttachmentAsync(jobId, attachmentId);

    [McpServerTool, Description("Create or update a job property (key-value metadata). Idempotent by key.")]
    public async Task<object?> upsert_job_property(
        [Description("Job ID")] int jobId,
        [Description("Property key")] string key,
        [Description("Property value")] string? value,
        [Description("Value type")] JobPropertyValueType valueType = JobPropertyValueType.Text)
        => await jobSvc.UpsertPropertyAsync(jobId, key, new UpsertPropertyRequest(value, valueType));

    [McpServerTool, Description("Remove a job property by key.")]
    public async Task<bool> remove_job_property(
        [Description("Job ID")] int jobId,
        [Description("Property key")] string key)
        => await jobSvc.DeletePropertyAsync(jobId, key);
}
