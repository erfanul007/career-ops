using CareerOps.Domain.FollowUpTasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CareerOps.Infrastructure.Persistence.Configurations;

public sealed class FollowUpTaskConfiguration : IEntityTypeConfiguration<FollowUpTask>
{
    public void Configure(EntityTypeBuilder<FollowUpTask> b)
    {
        b.ToTable("follow_up_tasks");
        b.HasKey(t => t.Id);
        b.Property(t => t.Title).HasMaxLength(300).IsRequired();
        b.Property(t => t.Description).HasMaxLength(2000);
        b.HasIndex(t => new { t.Status, t.DueAtUtc });
        b.HasIndex(t => new { t.RelatedEntityType, t.RelatedEntityId });
    }
}
