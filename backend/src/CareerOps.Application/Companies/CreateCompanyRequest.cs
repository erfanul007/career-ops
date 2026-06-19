using CareerOps.Domain.Companies;

namespace CareerOps.Application.Companies;

public sealed record CreateCompanyRequest(
    string Name, string? WebsiteUrl, string? LinkedInUrl,
    string? Country, string? City,
    CompanyType CompanyType, MarketType MarketType, CompensationFit CompensationFit,
    string? Notes);
