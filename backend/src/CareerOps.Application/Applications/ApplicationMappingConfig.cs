using DomainApplication = CareerOps.Domain.Applications.Application;
using Mapster;

namespace CareerOps.Application.Applications;

public sealed class ApplicationMappingConfig : IRegister
{
    public void Register(TypeAdapterConfig config)
    {
        config.NewConfig<DomainApplication, ApplicationDto>()
              .Map(d => d.JobTitle, s => s.JobLead == null ? "" : s.JobLead.Title)
              .Map(d => d.CompanyName, s => s.JobLead == null || s.JobLead.Company == null ? "" : s.JobLead.Company.Name)
              .Map(d => d.ResumeVariantName, s => s.ResumeVariant == null ? "" : s.ResumeVariant.Name);
    }
}
