using System.ComponentModel;
using ModelContextProtocol.Server;

namespace CareerOps.Mcp.Tools;

[McpServerToolType]
public static class DiagnosticsTools
{
    [McpServerTool, Description("Health check — returns 'pong'. Confirms the MCP server is reachable.")]
    public static string Ping() => "pong";
}
