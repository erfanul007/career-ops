using CareerOps.Domain.Jobs;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CareerOps.Infrastructure.Persistence.Configurations;

public sealed class JobAttachmentConfiguration : IEntityTypeConfiguration<JobAttachment>
{
    public void Configure(EntityTypeBuilder<JobAttachment> b)
    {
        b.ToTable("job_attachments");
        b.HasKey(a => a.Id);
        b.Property(a => a.Title).IsRequired().HasMaxLength(300);
        b.Property(a => a.FileName).HasMaxLength(500);
        b.Property(a => a.Url).HasMaxLength(2000);
        b.Property(a => a.StoragePath).HasMaxLength(1000);
        b.HasIndex(a => a.JobId);
    }
}
