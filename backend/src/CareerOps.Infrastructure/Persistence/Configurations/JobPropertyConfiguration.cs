using CareerOps.Domain.Jobs;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CareerOps.Infrastructure.Persistence.Configurations;

public sealed class JobPropertyConfiguration : IEntityTypeConfiguration<JobProperty>
{
    public void Configure(EntityTypeBuilder<JobProperty> b)
    {
        b.ToTable("job_properties");
        b.HasKey(p => p.Id);
        b.Property(p => p.Key).IsRequired().HasMaxLength(200);
        b.Property(p => p.Value).HasMaxLength(4000);

        // Upsert semantics: (JobId, Key) must be unique
        b.HasIndex(p => new { p.JobId, p.Key }).IsUnique();
    }
}
