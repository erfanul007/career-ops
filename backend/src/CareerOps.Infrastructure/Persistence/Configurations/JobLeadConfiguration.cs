using CareerOps.Domain.JobLeads;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CareerOps.Infrastructure.Persistence.Configurations;

public sealed class JobLeadConfiguration : IEntityTypeConfiguration<JobLead>
{
    public void Configure(EntityTypeBuilder<JobLead> b)
    {
        b.ToTable("job_leads");
        b.HasKey(l => l.Id);
        b.Property(l => l.Title).HasMaxLength(300).IsRequired();
        b.Property(l => l.SourceUrl).HasMaxLength(2048);
        b.Property(l => l.Location).HasMaxLength(200);
        b.Property(l => l.SalaryCurrency).HasMaxLength(3);
        b.Property(l => l.SuggestedResumeAngle).HasMaxLength(2000);
        b.Property(l => l.SalaryMin).HasPrecision(18, 2);
        b.Property(l => l.SalaryMax).HasPrecision(18, 2);

        b.HasOne(l => l.Company)
         .WithMany()
         .HasForeignKey(l => l.CompanyId)
         .OnDelete(DeleteBehavior.Cascade);

        b.HasIndex(l => l.CompanyId);
        b.HasIndex(l => l.Status);
        b.HasIndex(l => l.Priority);
    }
}
