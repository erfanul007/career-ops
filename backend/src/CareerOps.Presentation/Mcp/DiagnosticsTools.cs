using System.ComponentModel;
using ModelContextProtocol.Server;

namespace CareerOps.Presentation.Mcp;

[McpServerToolType]
public static class DiagnosticsTools
{
    [McpServerTool, Description("Health check — returns 'pong'. Confirms the MCP server is reachable.")]
    public static string ping() => "pong";
}
