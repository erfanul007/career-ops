var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/", () => "CareerOps API");

app.Run();

public partial class Program { } // exposed for WebApplicationFactory in tests
