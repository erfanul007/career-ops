using CareerOps.Domain.ResumeVariants;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CareerOps.Infrastructure.Persistence.Configurations;

public sealed class ResumeVariantConfiguration : IEntityTypeConfiguration<ResumeVariant>
{
    public void Configure(EntityTypeBuilder<ResumeVariant> b)
    {
        b.ToTable("resume_variants");
        b.HasKey(v => v.Id);
        b.Property(v => v.Name).HasMaxLength(200).IsRequired();
        b.Property(v => v.TargetRole).HasMaxLength(200);
        b.Property(v => v.Summary).HasMaxLength(4000);
        b.Property(v => v.Notes).HasMaxLength(4000);
        b.HasIndex(v => v.IsDefault);
    }
}
