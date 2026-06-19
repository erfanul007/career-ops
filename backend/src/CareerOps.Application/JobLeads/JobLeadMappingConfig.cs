using CareerOps.Domain.JobLeads;
using Mapster;

namespace CareerOps.Application.JobLeads;

public sealed class JobLeadMappingConfig : IRegister
{
    public void Register(TypeAdapterConfig config)
    {
        config.NewConfig<JobLead, JobLeadDto>()
              .Map(d => d.CompanyName, s => s.Company == null ? "" : s.Company.Name);

        // CompanyId is set by the service (find-or-create, D25); audit + identity are set elsewhere.
        // AI fields and the Company nav have no source member, so Mapster never maps them.
        config.NewConfig<CreateJobLeadRequest, JobLead>()
              .Ignore(d => d.Id).Ignore(d => d.CompanyId)
              .Ignore(d => d.CreatedAtUtc).Ignore(d => d.UpdatedAtUtc);

        config.NewConfig<UpdateJobLeadRequest, JobLead>()
              .Ignore(d => d.Id).Ignore(d => d.CompanyId)
              .Ignore(d => d.CreatedAtUtc).Ignore(d => d.UpdatedAtUtc);
    }
}
