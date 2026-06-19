using CareerOps.Domain.Common;

namespace CareerOps.Domain.Companies;

public sealed class Company : AuditableEntity
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? WebsiteUrl { get; set; }
    public string? LinkedInUrl { get; set; }
    public string? Country { get; set; }
    public string? City { get; set; }
    public CompanyType CompanyType { get; set; }
    public MarketType MarketType { get; set; }
    public CompensationFit CompensationFit { get; set; }
    public string? Notes { get; set; }
}
