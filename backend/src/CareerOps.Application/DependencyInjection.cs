using System.Reflection;
using CareerOps.Application.Applications;
using CareerOps.Application.Companies;
using CareerOps.Application.Dashboard;
using CareerOps.Application.FollowUpTasks;
using CareerOps.Application.Interviews;
using CareerOps.Application.JobLeads;
using CareerOps.Application.ResumeVariants;
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
        services.AddScoped<CompanyService>();
        services.AddScoped<JobLeadService>();
        services.AddScoped<ResumeVariantService>();
        services.AddScoped<ApplicationService>();
        services.AddScoped<FollowUpTaskService>();
        services.AddScoped<InterviewService>();
        services.AddScoped<DashboardService>();
        return services;
    }
}
