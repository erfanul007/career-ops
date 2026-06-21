using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;
using CareerOps.Presentation.Endpoints;
using CareerOps.Presentation.HealthChecks;
using CareerOps.Application;
using CareerOps.Infrastructure;
using CareerOps.Infrastructure.Persistence;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((ctx, cfg) => cfg.ReadFrom.Configuration(ctx.Configuration)
    .WriteTo.Console());

builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddApplication();
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();
builder.Services.AddHealthChecks()
    .AddCheck<DatabaseHealthCheck>("db", tags: ["db"]);

// MCP server over HTTP, sharing the same services. Enum names (not ints);
// TypeInfoResolver is required on .NET 10 when passing JsonSerializerOptions to the SDK.
// WithToolsFromAssembly requires explicit Assembly arg (single overload in 1.4.0).
var mcpJson = new JsonSerializerOptions(JsonSerializerDefaults.Web) { TypeInfoResolver = new DefaultJsonTypeInfoResolver() };
mcpJson.Converters.Add(new JsonStringEnumConverter());
builder.Services.AddMcpServer().WithHttpTransport().WithToolsFromAssembly(typeof(Program).Assembly, mcpJson);

var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options => options.AddPolicy("frontend", policy =>
    policy.WithOrigins(corsOrigins).AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

if (app.Environment.IsDevelopment() && !EF.IsDesignTime)
{
    using var scope = app.Services.CreateScope();
    await scope.ServiceProvider.GetRequiredService<CareerOpsDbContext>().Database.MigrateAsync();
}

app.UseExceptionHandler();
app.UseSerilogRequestLogging();
app.UseCors("frontend");
app.MapOpenApi();
app.MapScalarApiReference();

app.MapGet("/", () => Results.Redirect("/scalar/v1")).ExcludeFromDescription();

app.MapHealthChecks("/health", new HealthCheckOptions { Predicate = _ => false }).ExcludeFromDescription();
app.MapHealthChecks("/health/db", new HealthCheckOptions { Predicate = c => c.Tags.Contains("db") }).ExcludeFromDescription();

app.MapGroup("/api/settings").WithTags("Settings").MapSettings();
app.MapGroup("/api/companies").WithTags("Companies").MapCompanies();
app.MapGroup("/api/job-leads").WithTags("JobLeads").MapJobLeads();
app.MapGroup("/api/job-leads").WithTags("Applications").MapConvertToApplication();
app.MapGroup("/api/resume-variants").WithTags("ResumeVariants").MapResumeVariants();
app.MapGroup("/api/applications").WithTags("Applications").MapApplications();
app.MapGroup("/api/follow-up-tasks").WithTags("FollowUpTasks").MapFollowUpTasks();
app.MapGroup("/api/interviews").WithTags("Interviews").MapInterviews();
app.MapGroup("/api/dashboard").WithTags("Dashboard").MapDashboard();

app.MapMcp("/mcp");

app.Run();

public partial class Program { } // exposed for WebApplicationFactory in tests
