// Bridges the MCP server's tools into a Vercel AI-SDK ToolSet. We connect to
// /mcp using a tenant-scoped API key (so the chat agent dogfoods the same
// transport an external integrator would), enumerate the available tools, and
// wrap each one so streamText can call them.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { jsonSchema, tool, type Tool } from 'ai';
import { logger } from '../logger.js';

interface BuildToolsParams {
  mcpUrl: string;
  apiKey: string;
}

interface BuiltTools {
  tools: Record<string, Tool>;
  /** Always call this after the chat run completes. */
  close: () => Promise<void>;
}

/**
 * Connect to the MCP server, list its tools, and return an ai-sdk ToolSet
 * that proxies tool calls through the MCP client. The caller MUST invoke
 * `close()` when done to release the HTTP transport.
 */
export async function buildMcpTools(params: BuildToolsParams): Promise<BuiltTools> {
  const transport = new StreamableHTTPClientTransport(new URL(params.mcpUrl), {
    requestInit: {
      headers: { Authorization: `Bearer ${params.apiKey}` },
    },
  });

  const client = new Client(
    { name: 'sundae-chat-agent', version: '0.1.0' },
    { capabilities: {} },
  );
  await client.connect(transport);

  const { tools: mcpTools } = await client.listTools();

  const tools: Record<string, Tool> = {};
  for (const t of mcpTools) {
    // MCP tool input schemas are JSON Schema; wrap with the ai-sdk jsonSchema
    // helper so streamText can validate inputs before calling.
    const schema = jsonSchema(
      (t.inputSchema ?? { type: 'object', properties: {} }) as Parameters<typeof jsonSchema>[0],
    );

    tools[t.name] = tool({
      description: t.description ?? t.title ?? t.name,
      inputSchema: schema,
      execute: async (args) => {
        logger.info({ tool: t.name, args }, 'chat agent invoking MCP tool');
        const result = await client.callTool({
          name: t.name,
          arguments: args as Record<string, unknown>,
        });

        if (result.isError) {
          // Surface the error text back to the model so it can react.
          const textPart = Array.isArray(result.content)
            ? result.content.find((c) => c.type === 'text')
            : undefined;
          return { error: textPart?.text ?? 'tool error' };
        }

        // Prefer the structured payload; fall back to text content.
        if (result.structuredContent) return result.structuredContent;
        const textPart = Array.isArray(result.content)
          ? result.content.find((c) => c.type === 'text')
          : undefined;
        if (textPart?.text) {
          try {
            return JSON.parse(textPart.text);
          } catch {
            return { text: textPart.text };
          }
        }
        return result;
      },
    });
  }

  return {
    tools,
    close: async () => {
      try {
        await client.close();
      } catch {
        // already closed
      }
    },
  };
}
