using CareerOps.Domain.Jobs;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CareerOps.Infrastructure.Persistence.Configurations;

public sealed class JobConfiguration : IEntityTypeConfiguration<Job>
{
    public void Configure(EntityTypeBuilder<Job> b)
    {
        b.ToTable("jobs");
        b.HasKey(j => j.Id);

        b.Property(j => j.Title).IsRequired().HasMaxLength(300);
        b.Property(j => j.SourceUrl).HasMaxLength(2000);
        b.Property(j => j.Country).HasMaxLength(100);
        b.Property(j => j.City).HasMaxLength(100);
        b.Property(j => j.LocationText).HasMaxLength(200);
        b.Property(j => j.SalaryCurrency).HasMaxLength(10);
        b.Property(j => j.OfferCurrency).HasMaxLength(10);
        b.Property(j => j.ResumeLabel).HasMaxLength(200);
        b.Property(j => j.ResumeAngle).HasMaxLength(500);
        b.Property(j => j.SalaryMin).HasPrecision(18, 2);
        b.Property(j => j.SalaryMax).HasPrecision(18, 2);
        b.Property(j => j.OfferSalary).HasPrecision(18, 2);

        b.HasOne(j => j.Company)
            .WithMany()
            .HasForeignKey(j => j.CompanyId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasMany(j => j.Activities)
            .WithOne(a => a.Job)
            .HasForeignKey(a => a.JobId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasMany(j => j.Transitions)
            .WithOne(t => t.Job)
            .HasForeignKey(t => t.JobId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasMany(j => j.FollowUps)
            .WithOne(f => f.Job)
            .HasForeignKey(f => f.JobId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasMany(j => j.Properties)
            .WithOne(p => p.Job)
            .HasForeignKey(p => p.JobId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasMany(j => j.Attachments)
            .WithOne(a => a.Job)
            .HasForeignKey(a => a.JobId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasIndex(j => j.Status);
        b.HasIndex(j => j.CompanyId);
    }
}
