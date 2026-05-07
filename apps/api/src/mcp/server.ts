import type { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { logger } from "../logger.js";
import { registerTools } from "./tools.js";

const buildServer = (): McpServer => {
  const server = new McpServer(
    { name: "sundae-leads", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );
  registerTools(server);
  return server;
};

// Stateless: a fresh server + transport per request. Simpler for v1; we can
// switch to a session-based model later if we need streaming/notifications
// across requests.
export const handleMcpRequest = async (req: Request, res: Response): Promise<void> => {
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  res.on("close", () => {
    transport.close().catch(() => {});
    server.close().catch(() => {});
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    logger.error({ err }, "mcp request failed");
    if (!res.headersSent) {
      res.status(500).json({ error: "mcp_internal_error" });
    }
  }
};
