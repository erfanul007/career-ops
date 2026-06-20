using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using DomainApplication = CareerOps.Domain.Applications.Application;

namespace CareerOps.Infrastructure.Persistence.Configurations;

public sealed class ApplicationConfiguration : IEntityTypeConfiguration<DomainApplication>
{
    public void Configure(EntityTypeBuilder<DomainApplication> b)
    {
        b.ToTable("applications");
        b.HasKey(a => a.Id);
        b.Ignore(a => a.LastTrigger);
        b.Property(a => a.ExpectedSalary).HasPrecision(18, 2);
        b.Property(a => a.ExpectedSalaryCurrency).HasMaxLength(3);
        b.Property(a => a.NoticePeriod).HasMaxLength(100);
        b.Property(a => a.NextStep).HasMaxLength(500);
        b.Property(a => a.RejectionReason).HasMaxLength(1000);
        b.Property(a => a.Notes).HasMaxLength(4000);

        b.HasOne(a => a.JobLead).WithMany().HasForeignKey(a => a.JobLeadId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(a => a.ResumeVariant).WithMany().HasForeignKey(a => a.ResumeVariantId).OnDelete(DeleteBehavior.Restrict);

        b.HasIndex(a => a.JobLeadId).IsUnique(); // one application per lead (D29)
        b.HasIndex(a => a.CurrentStage);
        b.HasIndex(a => a.Status);
    }
}
