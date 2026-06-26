using CareerOps.Application.FollowUpTasks;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.Jobs;
using Mapster;

namespace CareerOps.Application.Jobs;

public sealed class JobMappingConfig : IRegister
{
    public void Register(TypeAdapterConfig config)
    {
        config.NewConfig<Job, JobDto>()
            .Map(d => d.CompanyName, s => s.Company != null ? s.Company.Name : "");

        config.NewConfig<Job, JobDetailDto>()
            .Map(d => d.CompanyName, s => s.Company != null ? s.Company.Name : "")
            .Map(d => d.Activities, s => s.Activities)
            .Map(d => d.Properties, s => s.Properties)
            .Map(d => d.Attachments, s => s.Attachments)
            .Map(d => d.FollowUps, s => s.FollowUps);

        config.NewConfig<FollowUpTask, FollowUpTaskDto>()
            .Map(d => d.JobTitle, s => s.Job != null ? s.Job.Title : null)
            .Map(d => d.JobActivityLabel, s => s.JobActivity != null ? s.JobActivity.Label : null);
    }
}
