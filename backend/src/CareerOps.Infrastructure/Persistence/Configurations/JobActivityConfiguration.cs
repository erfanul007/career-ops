using CareerOps.Domain.Jobs;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CareerOps.Infrastructure.Persistence.Configurations;

public sealed class JobActivityConfiguration : IEntityTypeConfiguration<JobActivity>
{
    public void Configure(EntityTypeBuilder<JobActivity> b)
    {
        b.ToTable("job_activities");
        b.HasKey(a => a.Id);

        b.Property(a => a.Label).IsRequired().HasMaxLength(200);
        b.Property(a => a.ContactName).HasMaxLength(200);
        b.Property(a => a.ContactRole).HasMaxLength(200);
        b.Property(a => a.MeetingUrl).HasMaxLength(2000);

        // FollowUps linked to this activity: nullify JobActivityId on delete, keep Job link
        b.HasMany(a => a.FollowUps)
            .WithOne(f => f.JobActivity)
            .HasForeignKey(f => f.JobActivityId)
            .OnDelete(DeleteBehavior.SetNull);

        b.HasIndex(a => a.JobId);
    }
}
