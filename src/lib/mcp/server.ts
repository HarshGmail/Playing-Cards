import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z, ZodError } from 'zod';
import { logError } from '@/lib/logger';
import { MatchServiceError } from '@/lib/matches/service';
import { McpToolError, mcpTools, McpToolName, RegisteredTool, ToolContext } from './tools';

const SERVER_INFO = { name: 'playing-cards', version: '1.0.0' };

function errorMessage(err: unknown): string {
  if (err instanceof McpToolError || err instanceof MatchServiceError) return err.message;
  if (err instanceof ZodError) return err.issues[0]?.message ?? 'Invalid input';
  return 'Internal error';
}

async function runTool(tool: RegisteredTool, context: ToolContext, args: unknown) {
  try {
    const parsedArgs = z.object(tool.inputSchema).parse(args);
    const result = await tool.handler(context, parsedArgs);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
  } catch (err) {
    const expected = err instanceof McpToolError || err instanceof MatchServiceError || err instanceof ZodError;
    if (!expected) logError(crypto.randomUUID(), err);
    return { isError: true, content: [{ type: 'text' as const, text: errorMessage(err) }] };
  }
}

function buildServer(context: ToolContext): McpServer {
  const server = new McpServer(SERVER_INFO);
  for (const name of Object.keys(mcpTools) as McpToolName[]) {
    const tool: RegisteredTool = mcpTools[name];
    server.registerTool(
      name,
      { description: tool.description, inputSchema: tool.inputSchema },
      async (args: unknown) => runTool(tool, context, args)
    );
  }
  return server;
}

export async function handleMcpRequest(request: Request, context: ToolContext): Promise<Response> {
  const server = buildServer(context);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    return await transport.handleRequest(request);
  } finally {
    await server.close();
  }
}
