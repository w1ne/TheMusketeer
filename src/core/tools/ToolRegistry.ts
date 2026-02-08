import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export interface ToolContext {
  cwd?: string; // Workspace Root
  agentId?: string;
  // TODO: Logger?
}

export interface Tool {
  name: string;
  description: string;
  execute: (args: any, context?: ToolContext) => Promise<string>;
  schema: any; // JSON Schema for argument
}

import { mcpManager } from '../mcp/MCPManager';
import path from 'path';

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

  private registerBuiltIns() {
    // 1. Read File
    this.register({
      name: 'read_file',
      description: 'Read contents of a file',
      execute: async ({ path: filePath }, context) => {
        try {
          const cwd = context?.cwd || process.cwd();
          const safePath = path.resolve(cwd, filePath);

          if (!safePath.startsWith(cwd)) {
            return 'Security Error: Access Denied (Outside Workspace)';
          }

          return await fs.readFile(safePath, 'utf-8');
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
      execute: async ({ path: filePath, content }, context) => {
        try {
          const cwd = context?.cwd || process.cwd();
          const safePath = path.resolve(cwd, filePath);

          if (!safePath.startsWith(cwd)) {
            return 'Security Error: Access Denied (Outside Workspace)';
          }

          await fs.mkdir(path.dirname(safePath), { recursive: true });
          await fs.writeFile(safePath, content, 'utf-8');
          return `Successfully wrote to ${safePath}`;
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
      execute: async ({ command }, context) => {
        try {
          const cwd = context?.cwd || process.cwd();
          const { stdout, stderr } = await execAsync(command, { cwd }); // Use CWD
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
    // 4. Ask User for Input
    this.register({
      name: 'ask_user',
      description:
        'Pause the loop and ask the user for clarification or input.',
      execute: async ({ question }) => {
        // This is a marker tool. The AgentLoop will handle the actual pausing logic.
        return `AWAITING_INPUT: ${question}`;
      },
      schema: {
        type: 'object',
        properties: {
          question: {
            type: 'string',
            description: 'The question to ask the user.',
          },
        },
        required: ['question'],
      },
    });
  }
}

export const tools = new ToolRegistry();
