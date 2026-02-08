import { board } from './KanbanBoard';
import { memory } from './MemoryStore';
import { llm, LLMMessage } from './llm/LLMService';
import { tools } from './tools/ToolRegistry';
import { workspaceManager } from './WorkspaceManager';

export class AgentLoop {
  private agentId: string;
  private isRunning: boolean = false;

  constructor(agentId: string) {
    this.agentId = agentId;
  }

  async start() {
    const agent = board.getAgent(this.agentId);
    if (!agent) {
      console.error(`Agent ${this.agentId} not found.`);
      return;
    }

    console.log(`Starting loop for agent: ${agent.name} (${agent.id})`);

    // 0. Initialize Workspace
    const workspaceRoot = await workspaceManager.createWorkspace(this.agentId);
    console.log(`[Loop] Workspace created: ${workspaceRoot}`);

    this.isRunning = true;

    while (this.isRunning) {
      // 1. Observe: Check current task
      // Re-fetch agent to get latest status
      const currentAgent = board.getAgent(this.agentId);
      if (!currentAgent) break; // Agent deleted?

      if (currentAgent.status === 'IDLE') {
        board.updateAgentActivity(this.agentId, 'Waiting for new tasks...');
        const task = board.assignNextTask(this.agentId);
        if (task) {
          console.log(`[Loop] Picked up task: ${task.title}`);
          await memory.addLog(
            `### 🚀 Task Initiative\n**Mission:** ${task.title}\nAgent is initializing the workspace.`,
            this.agentId,
          );
        } else {
          await new Promise((r) => setTimeout(r, 5000));
          continue;
        }
      }

      // If we are here, we are WORKING
      const taskId = board.getAgent(this.agentId)?.currentTaskId;
      if (!taskId) {
        // Inconsistent state, reset to IDLE
        console.error('[Loop] Agent WORKING but no Task ID. Resetting.');
        // In real app, we'd have a board.resetAgent(id)
        continue;
      }

      if (currentAgent.status === 'PAUSED') {
        board.updateAgentActivity(this.agentId, 'Waiting for user input...');
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }

      await this.executeCycle(taskId, workspaceRoot);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  async stop() {
    this.isRunning = false;
  }

  private async executeCycle(taskId: string, workspaceRoot: string) {
    const task = board.getTask(taskId);
    if (!task) return;

    // 2. Think: Construct Prompt
    const currentAgent = board.getAgent(this.agentId);
    if (!currentAgent) return;

    const logs = await memory.getRecentLogs(1);
    const knowledge = await memory.getKnowledge();

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: `You are an autonomous agent working on: "${task.title}".
            
            Context:
            ${knowledge}
            
            Current Workspace: ${workspaceRoot}
            (All file operations are relative to this directory)
            
            Recent Logs:
            ${logs[0] || 'No recent logs'}
            
            Available Tools:
            ${tools
              .getTools()
              .map((t) => `- ${t.name}: ${t.description}`)
              .join('\n')}
            
            ${currentAgent.pendingInput ? `USER MESSAGE: ${currentAgent.pendingInput}\nRespond to this user message specifically.` : ''}

            Respond in JSON format:
            { "thought": "reasoning", "action": "tool_name", "args": { ... } }
            `,
      },
      {
        role: 'user',
        content: 'Current Status: WORKING. What is your next step?',
      },
    ];

    try {
      board.updateAgentActivity(this.agentId, `Thinking about: ${task.title}`);
      const responseStr = await llm.generate(
        messages,
        currentAgent.config.provider,
        currentAgent.config,
      );

      // 3. Act: Parse and Execute
      // Basic parsing (in real app, use schema validation)
      let response: any;
      try {
        response = JSON.parse(responseStr);
      } catch (e) {
        console.error('Failed to parse LLM response:', responseStr);
        return;
      }

      console.log(`[Loop] Thought: ${response.thought}`);

      if (response.action === 'task_complete') {
        board.updateAgentActivity(this.agentId, 'Finalizing task...');
        console.log('[Loop] Task Completed!');
        board.updateTaskStatus(taskId, 'DONE');
        const agent = board.getAgent(this.agentId);
        if (agent) {
          agent.status = 'IDLE';
          agent.currentTaskId = undefined;
          agent.pendingInput = undefined; // Clear input
        }
        await memory.addLog(
          `## ✅ Mission Accomplished\nTask **${task.title}** has been successfully completed.`,
          this.agentId,
        );
        board.updateAgentActivity(this.agentId, 'Mission complete.');
        return;
      }

      if (response.action === 'ask_user') {
        const question = response.args.question || 'No question provided.';
        board.updateAgentActivity(this.agentId, 'Paused for input.');
        board.updateTaskStatus(taskId, 'AWAITING_INPUT', question);
        const agent = board.getAgent(this.agentId);
        if (agent) agent.status = 'PAUSED';

        await memory.addLog(
          `### ⚠️ Attention Required\n**Agent asks:** ${question}`,
          this.agentId,
        );
        return;
      }

      const tool = tools.getTool(response.action);
      if (tool) {
        board.updateAgentActivity(this.agentId, `Executing tool: ${tool.name}`);
        console.log(`[Loop] Executing ${tool.name}...`);

        // Pass Context
        const result = await tool.execute(response.args, {
          cwd: workspaceRoot,
          agentId: this.agentId,
        });

        console.log(`[Loop] Result: ${result.substring(0, 50)}...`);
        await memory.addLog(
          `#### 🛠 Tool Execution: ${tool.name}\n**Thought:** ${response.thought}\n\n**Result Snippet:**\n\`\`\`\n${result.substring(0, 200)}${result.length > 200 ? '...' : ''}\n\`\`\``,
          this.agentId,
        );
        board.updateAgentActivity(
          this.agentId,
          `Finished ${tool.name}. Pacing...`,
        );

        // Clear pending input after ONE cycle if it was processed
        if (currentAgent.pendingInput) {
          board.clearAgentInput(this.agentId);
        }
      } else {
        console.log(`[Loop] Unknown tool: ${response.action}`);
      }
    } catch (e) {
      console.error('[Loop] Cycle Failed:', e);
    }
  }
}
