using System.Reflection;
using CareerOps.Application.Settings;
using FluentValidation;
using Mapster;
using Microsoft.Extensions.DependencyInjection;

namespace CareerOps.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        var assembly = Assembly.GetExecutingAssembly();
        TypeAdapterConfig.GlobalSettings.Scan(assembly);
        services.AddValidatorsFromAssembly(assembly);
        services.AddScoped<UserProfileService>();
        return services;
    }
}
