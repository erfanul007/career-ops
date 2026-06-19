using CareerOps.Domain.UserProfiles;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CareerOps.Infrastructure.Persistence.Configurations;

public sealed class UserProfileConfiguration : IEntityTypeConfiguration<UserProfile>
{
    public void Configure(EntityTypeBuilder<UserProfile> b)
    {
        b.ToTable("user_profiles");
        b.HasKey(p => p.Id);
        b.Property(p => p.Id).ValueGeneratedNever();
        b.Property(p => p.FullName).HasMaxLength(200).IsRequired();
        b.Property(p => p.Email).HasMaxLength(256);
        b.Property(p => p.TargetSalaryCurrency).HasMaxLength(3);
        b.Property(p => p.TargetSalaryMin).HasPrecision(18, 2);
    }
}
