using CareerOps.Domain.Common;

namespace CareerOps.Domain.UserProfiles;

public sealed class UserProfile : AuditableEntity
{
    public int Id { get; set; }
    public string FullName { get; set; } = "";
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? LinkedInUrl { get; set; }
    public string? GitHubUrl { get; set; }
    public string? PortfolioUrl { get; set; }
    public string? CurrentLocation { get; set; }
    public string? TargetRoles { get; set; }
    public decimal? TargetSalaryMin { get; set; }
    public string? TargetSalaryCurrency { get; set; }
    public DateTime? SearchDeadlineUtc { get; set; }
    public string? PreferredTechStack { get; set; }
    public string? CareerSummary { get; set; }
}
