namespace CareerOps.Application.Settings;

public sealed record UpdateUserProfileRequest(
    string FullName, string? Email, string? Phone,
    string? LinkedInUrl, string? GitHubUrl, string? PortfolioUrl,
    string? CurrentLocation, string? TargetRoles,
    decimal? TargetSalaryMin, string? TargetSalaryCurrency,
    DateTime? SearchDeadlineUtc, string? PreferredTechStack, string? CareerSummary);
