using CareerOps.Domain.Companies;
using Mapster;

namespace CareerOps.Application.Companies;

public sealed class CompanyMappingConfig : IRegister
{
    public void Register(TypeAdapterConfig config)
    {
        config.NewConfig<Company, CompanyDto>();
        config.NewConfig<CreateCompanyRequest, Company>()
              .Ignore(d => d.Id).Ignore(d => d.CreatedAtUtc).Ignore(d => d.UpdatedAtUtc);
        config.NewConfig<UpdateCompanyRequest, Company>()
              .Ignore(d => d.Id).Ignore(d => d.CreatedAtUtc).Ignore(d => d.UpdatedAtUtc);
    }
}
