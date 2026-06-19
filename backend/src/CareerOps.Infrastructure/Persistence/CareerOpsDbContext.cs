using CareerOps.Application.Common;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Infrastructure.Persistence;

public sealed class CareerOpsDbContext(DbContextOptions<CareerOpsDbContext> options)
    : DbContext(options), IAppDbContext
{
    public Task<bool> CanConnectAsync(CancellationToken cancellationToken = default)
        => Database.CanConnectAsync(cancellationToken);

    protected override void OnModelCreating(ModelBuilder modelBuilder)
        => modelBuilder.ApplyConfigurationsFromAssembly(typeof(CareerOpsDbContext).Assembly);
}
