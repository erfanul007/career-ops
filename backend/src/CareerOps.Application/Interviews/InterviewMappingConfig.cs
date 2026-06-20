using CareerOps.Domain.Interviews;
using Mapster;

namespace CareerOps.Application.Interviews;

public sealed class InterviewMappingConfig : IRegister
{
    public void Register(TypeAdapterConfig config)
    {
        config.NewConfig<Interview, InterviewDto>()
            .Map(d => d.CompanyName, s => s.Application == null || s.Application.JobLead == null || s.Application.JobLead.Company == null ? "" : s.Application.JobLead.Company.Name)
            .Map(d => d.JobTitle, s => s.Application == null || s.Application.JobLead == null ? "" : s.Application.JobLead.Title);

        config.NewConfig<CreateInterviewRequest, Interview>()
            .Ignore(d => d.Id).Ignore(d => d.CreatedAtUtc).Ignore(d => d.UpdatedAtUtc);
    }
}
