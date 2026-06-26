using CareerOps.Domain.Jobs;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CareerOps.Infrastructure.Persistence.Configurations;

public sealed class JobTransitionConfiguration : IEntityTypeConfiguration<JobTransition>
{
    public void Configure(EntityTypeBuilder<JobTransition> b)
    {
        b.ToTable("job_transitions");
        b.HasKey(t => t.Id);
        b.Property(t => t.Notes).HasMaxLength(1000);
        b.HasIndex(t => t.JobId);
        b.HasIndex(t => t.ChangedAtUtc);
    }
}
