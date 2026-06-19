namespace CareerOps.Application.Settings;

public sealed record UserProfileDto(
    int Id, string FullName, string? Email, string? Phone,
    string? LinkedInUrl, string? GitHubUrl, string? PortfolioUrl,
    string? CurrentLocation, string? TargetRoles,
    decimal? TargetSalaryMin, string? TargetSalaryCurrency,
    DateTime? SearchDeadlineUtc, string? PreferredTechStack, string? CareerSummary,
    DateTime CreatedAtUtc, DateTime UpdatedAtUtc);
