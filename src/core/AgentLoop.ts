import { board } from './KanbanBoard';
import { memory } from './MemoryStore';
import { llm, LLMMessage } from './llm/LLMService';
import { tools } from './tools/ToolRegistry';

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
    this.isRunning = true;

    while (this.isRunning) {
      // 1. Observe: Check current task
      // Re-fetch agent to get latest status
      const currentAgent = board.getAgent(this.agentId);
      if (!currentAgent) break; // Agent deleted?

      if (currentAgent.status === 'IDLE') {
        // Try to get a task
        const task = board.assignNextTask(this.agentId);
        if (task) {
          console.log(`[Loop] Picked up task: ${task.title}`);
          await memory.addLog(`Picked up task: ${task.title}`, this.agentId);
        } else {
          // console.log('[Loop] No tasks available. Sleeping...');
          await new Promise((r) => setTimeout(r, 5000)); // Sleep 5s
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

      await this.executeCycle(taskId);

      // For demo purposes, we might want to stop after one task or loop forever
      // this.isRunning = false;
      await new Promise((r) => setTimeout(r, 2000)); // Pace the loop
    }
  }

  async stop() {
    this.isRunning = false;
  }

  private async executeCycle(taskId: string) {
    const task = board.getTask(taskId);
    if (!task) return;

    // 2. Think: Construct Prompt
    const logs = await memory.getRecentLogs(1);
    const knowledge = await memory.getKnowledge();

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: `You are an autonomous agent working on: "${task.title}".
            
            Context:
            ${knowledge}
            
            Recent Logs:
            ${logs[0] || 'No recent logs'}
            
            Available Tools:
            ${tools
              .getTools()
              .map((t) => `- ${t.name}: ${t.description}`)
              .join('\n')}
            
            Respond in JSON format:
            { "thought": "reasoning", "action": "tool_name", "args": { ... } }
            `,
      },
      {
        role: 'user',
        content: 'Current Status: WORKING. What is your next step?',
      },
    ];

    // Re-fetch to ensure we have latest config
    const currentAgent = board.getAgent(this.agentId);
    if (!currentAgent) return;

    try {
      const responseStr = await llm.generate(
        messages,
        currentAgent.config.provider,
        currentAgent.config,
      );

      // 3. Act: Parse and Execute
      // Basic parsing (in real app, use schema validation)
      const response = JSON.parse(responseStr);
      console.log(`[Loop] Thought: ${response.thought}`);

      if (response.action === 'task_complete') {
        console.log('[Loop] Task Completed!');
        board.updateTaskStatus(taskId, 'DONE');
        // We need to free the agent, but KanbanBoard logic handles status.
        // Ideally we need a 'completeTask' method on Board.
        // For now, let's just make Agent IDLE manually (hack for demo)
        const agent = board.getAgent(this.agentId);
        if (agent) {
          agent.status = 'IDLE';
          agent.currentTaskId = undefined;
        }
        await memory.addLog(`Completed task: ${task.title}`, this.agentId);
        return;
      }

      const tool = tools.getTool(response.action);
      if (tool) {
        console.log(`[Loop] Executing ${tool.name}...`);
        const result = await tool.execute(response.args);
        console.log(`[Loop] Result: ${result.substring(0, 50)}...`);
        await memory.addLog(
          `Executed ${tool.name}: ${response.thought}`,
          this.agentId,
        );
      } else {
        console.log(`[Loop] Unknown tool: ${response.action}`);
      }
    } catch (e) {
      console.error('[Loop] Cycle Failed:', e);
    }
  }
}
