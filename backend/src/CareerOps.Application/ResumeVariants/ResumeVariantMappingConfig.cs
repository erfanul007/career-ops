using CareerOps.Domain.ResumeVariants;
using Mapster;

namespace CareerOps.Application.ResumeVariants;

public sealed class ResumeVariantMappingConfig : IRegister
{
    public void Register(TypeAdapterConfig config)
    {
        config.NewConfig<CreateResumeVariantRequest, ResumeVariant>()
              .Ignore(d => d.Id).Ignore(d => d.IsDefault)
              .Ignore(d => d.CreatedAtUtc).Ignore(d => d.UpdatedAtUtc);
        config.NewConfig<UpdateResumeVariantRequest, ResumeVariant>()
              .Ignore(d => d.Id).Ignore(d => d.IsDefault)
              .Ignore(d => d.CreatedAtUtc).Ignore(d => d.UpdatedAtUtc);
    }
}
