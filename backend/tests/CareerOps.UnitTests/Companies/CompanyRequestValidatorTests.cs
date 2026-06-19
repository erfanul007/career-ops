using CareerOps.Application.Companies;
using CareerOps.Domain.Companies;
using FluentValidation.TestHelper;

namespace CareerOps.UnitTests.Companies;

public class CompanyRequestValidatorTests
{
    private readonly CreateCompanyRequestValidator _validator = new();

    private static CreateCompanyRequest Valid() => new(
        Name: "Equinor", WebsiteUrl: "https://equinor.com", LinkedInUrl: null,
        Country: "Norway", City: "Stavanger",
        CompanyType: CompanyType.Enterprise, MarketType: MarketType.Hybrid,
        CompensationFit: CompensationFit.High, Notes: null);

    [Fact]
    public void Valid_request_passes()
        => _validator.TestValidate(Valid()).ShouldNotHaveAnyValidationErrors();

    [Fact]
    public void Blank_name_fails()
        => _validator.TestValidate(Valid() with { Name = "" })
            .ShouldHaveValidationErrorFor(r => r.Name);

    [Fact]
    public void Bad_website_url_fails()
        => _validator.TestValidate(Valid() with { WebsiteUrl = "ftp://nope" })
            .ShouldHaveValidationErrorFor(r => r.WebsiteUrl);

    [Fact]
    public void Out_of_range_enum_fails()
        => _validator.TestValidate(Valid() with { CompanyType = (CompanyType)99 })
            .ShouldHaveValidationErrorFor(r => r.CompanyType);
}
