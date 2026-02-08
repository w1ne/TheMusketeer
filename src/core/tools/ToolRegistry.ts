import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export interface Tool {
  name: string;
  description: string;
  execute: (args: any) => Promise<string>;
  schema: any; // JSON Schema for arguments
}

import { mcpManager } from '../mcp/MCPManager';

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  constructor() {
    this.registerBuiltIns();
  }

  register(tool: Tool) {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): Tool | undefined {
    // Check built-ins first
    if (this.tools.has(name)) return this.tools.get(name);

    // Check MCP tools
    return mcpManager.getTools().find((t) => t.name === name);
  }

  getTools(): Tool[] {
    return [...Array.from(this.tools.values()), ...mcpManager.getTools()];
  }
  // ... (rest of file)

  private registerBuiltIns() {
    // 1. Read File
    this.register({
      name: 'read_file',
      description: 'Read contents of a file',
      execute: async ({ path }) => {
        try {
          return await fs.readFile(path, 'utf-8');
        } catch (e: any) {
          return `Error reading file: ${e.message}`;
        }
      },
      schema: {
        type: 'object',
        properties: { path: { type: 'string' } },
        required: ['path'],
      },
    });

    // 2. Write File
    this.register({
      name: 'write_file',
      description: 'Write content to a file',
      execute: async ({ path, content }) => {
        try {
          await fs.writeFile(path, content, 'utf-8');
          return `Successfully wrote to ${path}`;
        } catch (e: any) {
          return `Error writing file: ${e.message}`;
        }
      },
      schema: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          content: { type: 'string' },
        },
        required: ['path', 'content'],
      },
    });

    // 3. Run Command
    this.register({
      name: 'run_command',
      description: 'Run a shell command',
      execute: async ({ command }) => {
        try {
          const { stdout, stderr } = await execAsync(command);
          return stdout || stderr;
        } catch (e: any) {
          return `Error executing command: ${e.message}`;
        }
      },
      schema: {
        type: 'object',
        properties: { command: { type: 'string' } },
        required: ['command'],
      },
    });
  }
}

export const tools = new ToolRegistry();
