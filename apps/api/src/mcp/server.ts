import type { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { logger } from "../logger.js";
import { registerTools, type McpAuthContext } from "./tools.js";

const buildServer = (auth: McpAuthContext): McpServer => {
  const server = new McpServer(
    { name: "sundae-leads", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );
  registerTools(server, auth);
  return server;
};

// Stateless: a fresh server + transport per request. The auth context comes
// from requireLeadsAuth (req.user) and is captured in the tool closures so
// every invocation is tenant-scoped and credit-billed.
export const handleMcpRequest = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const server = buildServer({
    tenantId: req.user.tenantId,
    userId: req.user.id,
  });
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
