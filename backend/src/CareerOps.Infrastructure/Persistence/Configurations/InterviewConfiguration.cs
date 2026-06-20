using CareerOps.Domain.Interviews;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CareerOps.Infrastructure.Persistence.Configurations;

public sealed class InterviewConfiguration : IEntityTypeConfiguration<Interview>
{
    public void Configure(EntityTypeBuilder<Interview> b)
    {
        b.ToTable("interviews");
        b.HasKey(i => i.Id);
        b.Property(i => i.InterviewerName).HasMaxLength(200);
        b.Property(i => i.InterviewerRole).HasMaxLength(200);
        b.Property(i => i.MeetingUrl).HasMaxLength(1000);
        b.Property(i => i.PrepNotes).HasMaxLength(4000);
        b.Property(i => i.Feedback).HasMaxLength(4000);
        b.HasOne(i => i.Application).WithMany().HasForeignKey(i => i.ApplicationId).OnDelete(DeleteBehavior.Cascade);
        b.HasIndex(i => i.ApplicationId);
        b.HasIndex(i => i.Status);
        b.HasIndex(i => i.ScheduledAtUtc);
    }
}
