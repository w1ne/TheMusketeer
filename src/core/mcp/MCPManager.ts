import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Tool } from '../tools/ToolRegistry';
import fs from 'fs/promises';

interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

interface MCPConfig {
  mcpServers: Record<string, MCPServerConfig>;
}

/**
 * Manager for Model Context Protocol (MCP) clients.
 * Handles server connections, tool discovery, and dynamic tool invocation.
 */
export class MCPManager {
  private clients: Map<string, Client> = new Map();
  private tools: Map<string, Tool> = new Map();

  constructor() {}

  async loadConfig(configPath: string) {
    try {
      const content = await fs.readFile(configPath, 'utf-8');
      const config: MCPConfig = JSON.parse(content);

      for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
        await this.connect(name, serverConfig);
      }
    } catch (e: any) {
      if (e.code !== 'ENOENT') {
        console.error(`Failed to load MCP config: ${e.message}`);
      }
    }
  }

  async connect(name: string, config: MCPServerConfig) {
    console.log(`[MCP] Connecting to server: ${name}...`);
    try {
      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: { ...process.env, ...config.env } as Record<string, string>,
      });

      const client = new Client(
        { name: 'themusketeer-client', version: '1.0.0' },
        { capabilities: {} },
      );

      await client.connect(transport);
      this.clients.set(name, client);

      // Discover Tools
      const result = await client.listTools();
      for (const mcpTool of result.tools) {
        const toolName = `${name}__${mcpTool.name}`; // Namespacing
        console.log(`[MCP] Discovered tool: ${toolName}`);

        this.tools.set(toolName, {
          name: toolName,
          description: mcpTool.description || '',
          // MCP Schema is a Zod schema or JSON Schema. SDK returns JSON Schema.
          schema: mcpTool.inputSchema as any,
          execute: async (args: any) => {
            const callResult = await client.callTool({
              name: mcpTool.name,
              arguments: args,
            });
            // Simplify result for LLM (concat text blocks)
            return JSON.stringify(callResult);
          },
        });
      }
    } catch (e: any) {
      console.error(`[MCP] Failed to connect to ${name}: ${e.message}`);
    }
  }

  getTools(): Tool[] {
    return Array.from(this.tools.values());
  }
}

export const mcpManager = new MCPManager();
