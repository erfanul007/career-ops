using CareerOps.Domain.FollowUpTasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CareerOps.Infrastructure.Persistence.Configurations;

public sealed class FollowUpTaskConfiguration : IEntityTypeConfiguration<FollowUpTask>
{
    public void Configure(EntityTypeBuilder<FollowUpTask> b)
    {
        b.ToTable("follow_up_tasks");
        b.HasKey(f => f.Id);
        b.Property(f => f.Title).IsRequired().HasMaxLength(300);
        b.Property(f => f.Description).HasMaxLength(2000);

        // Job FK — cascade on Job delete
        b.HasOne(f => f.Job)
            .WithMany(j => j.FollowUps)
            .HasForeignKey(f => f.JobId)
            .OnDelete(DeleteBehavior.Cascade);

        // Activity FK — set null on Activity delete (Job remains)
        // Relationship defined in JobActivityConfiguration

        b.HasIndex(f => f.JobId);
        b.HasIndex(f => f.JobActivityId);
        b.HasIndex(f => f.DueAtUtc);
        b.HasIndex(f => f.Status);
    }
}
