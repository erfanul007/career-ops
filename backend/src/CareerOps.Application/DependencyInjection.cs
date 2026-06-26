using System.Reflection;
using CareerOps.Application.Companies;
using CareerOps.Application.Dashboard;
using CareerOps.Application.FollowUpTasks;
using CareerOps.Application.Jobs;
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

        services.AddScoped<JobService>();
        services.AddScoped<JobWorkflowService>();
        services.AddScoped<JobActivityService>();
        services.AddScoped<JobTimelineService>();
        services.AddScoped<FollowUpTaskService>();
        services.AddScoped<DashboardService>();
        services.AddScoped<CompanyService>();
        services.AddScoped<UserProfileService>();
        return services;
    }
}
