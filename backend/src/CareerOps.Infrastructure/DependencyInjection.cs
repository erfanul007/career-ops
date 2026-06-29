using CareerOps.Application.Common;
using CareerOps.Application.Companies;
using CareerOps.Application.Dashboard;
using CareerOps.Application.FollowUpTasks;
using CareerOps.Application.Jobs;
using CareerOps.Application.Settings;
using CareerOps.Infrastructure.Persistence;
using CareerOps.Infrastructure.Persistence.Repositories;
using CareerOps.Infrastructure.Time;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CareerOps.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        services.AddSingleton<IClock, SystemClock>();
        services.AddDbContext<CareerOpsDbContext>(opt =>
            opt.UseNpgsql(config.GetConnectionString("DefaultConnection"))
               .UseSnakeCaseNamingConvention());

        services.AddScoped<IUnitOfWork>(sp => sp.GetRequiredService<CareerOpsDbContext>());

        services.AddScoped<ICompanyRepository, CompanyRepository>();
        services.AddScoped<IUserProfileRepository, UserProfileRepository>();
        services.AddScoped<IFollowUpTaskRepository, FollowUpTaskRepository>();
        services.AddScoped<IJobRepository, JobRepository>();
        services.AddScoped<IJobActivityRepository, JobActivityRepository>();
        services.AddScoped<IJobAttachmentRepository, JobAttachmentRepository>();
        services.AddScoped<IJobPropertyRepository, JobPropertyRepository>();
        services.AddScoped<IJobTimelineReadRepository, JobTimelineReadRepository>();
        services.AddScoped<IDashboardReadRepository, DashboardReadRepository>();

        return services;
    }
}
