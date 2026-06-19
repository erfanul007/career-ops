using CareerOps.Application.Common;
using CareerOps.Infrastructure.Persistence;
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
        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<CareerOpsDbContext>());
        return services;
    }
}
