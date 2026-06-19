using CareerOps.Domain.Companies;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CareerOps.Infrastructure.Persistence.Configurations;

public sealed class CompanyConfiguration : IEntityTypeConfiguration<Company>
{
    public void Configure(EntityTypeBuilder<Company> b)
    {
        b.ToTable("companies");
        b.HasKey(c => c.Id);
        b.Property(c => c.Name).HasMaxLength(200).IsRequired();
        b.Property(c => c.WebsiteUrl).HasMaxLength(2048);
        b.Property(c => c.LinkedInUrl).HasMaxLength(2048);
        b.Property(c => c.Country).HasMaxLength(100);
        b.Property(c => c.City).HasMaxLength(100);
        b.HasIndex(c => c.Name);
    }
}
