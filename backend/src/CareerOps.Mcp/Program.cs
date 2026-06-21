using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;
using CareerOps.Application;
using CareerOps.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

var builder = Host.CreateApplicationBuilder(new HostApplicationBuilderSettings { ContentRootPath = AppContext.BaseDirectory, Args = args });

// stdout is reserved for MCP JSON-RPC. Route ALL logs to stderr.
builder.Logging.ClearProviders();
builder.Logging.AddConsole(o => o.LogToStandardErrorThreshold = LogLevel.Trace);

builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddApplication();

// Agent-friendly enum names (e.g. "Applied" not 2) for tool inputs/outputs.
// TypeInfoResolver is required in .NET 10 when JsonSerializerOptions is used by the MCP SDK.
var jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web);
jsonOptions.TypeInfoResolver = new DefaultJsonTypeInfoResolver();
jsonOptions.Converters.Add(new JsonStringEnumConverter());

builder.Services
    .AddMcpServer()
    .WithStdioServerTransport()
    .WithToolsFromAssembly(serializerOptions: jsonOptions);

await builder.Build().RunAsync();
