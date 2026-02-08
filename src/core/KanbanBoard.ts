import { Agent, Task, TaskStatus, AgentStatus, TaskPriority } from './types';
import { randomUUID } from 'crypto';

/**
 * The central orchestrator for the Vibe Kanban framework.
 * Thread-safe singleton that manages tasks, agents, and their assignments.
 */
export class KanbanBoard {
  private tasks: Map<string, Task> = new Map();
  private agents: Map<string, Agent> = new Map();

  constructor() {
    // Empty constructor
  }

  // --- Tasks ---

  createTask(
    title: string,
    priority: TaskPriority = 'MEDIUM',
    parentId?: string,
  ): Task {
    const id = randomUUID();
    const task: Task = {
      id,
      title,
      status: 'TODO',
      priority,
      dependencies: [],
      subtasks: [],
      parentId,
    };

    this.tasks.set(id, task);

    // If parent exists, add this as subtask
    if (parentId) {
      const parent = this.tasks.get(parentId);
      if (parent) {
        parent.subtasks.push(id);
        this.tasks.set(parentId, parent);
      }
    }

    return task;
  }

  addDependency(taskId: string, dependencyId: string): boolean {
    const task = this.tasks.get(taskId);
    const dependency = this.tasks.get(dependencyId);

    if (task && dependency && taskId !== dependencyId) {
      if (!task.dependencies.includes(dependencyId)) {
        task.dependencies.push(dependencyId);
        this.tasks.set(taskId, task);
        return true;
      }
    }
    return false;
  }

  getTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  updateTaskStatus(id: string, status: TaskStatus): Task | undefined {
    const task = this.tasks.get(id);
    if (task) {
      task.status = status;
      this.tasks.set(id, task);
    }
    return task;
  }

  // --- Agents ---

  spawnAgent(
    name: string,
    config: {
      provider: 'gemini' | 'anthropic' | 'gemini-cli';
      model: string;
      apiKey?: string;
    },
  ): Agent {
    const id = randomUUID();
    const agent: Agent = {
      id,
      name,
      status: 'IDLE',
      config: {
        provider: config.provider || 'gemini',
        model: config.model || 'gemini-1.5-pro',
        apiKey: config.apiKey,
      },
    };
    this.agents.set(id, agent);
    return agent;
  }

  getAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  // --- Assignment ---

  assignTask(taskId: string, agentId: string): boolean {
    const task = this.tasks.get(taskId);
    const agent = this.agents.get(agentId);

    if (task && agent && agent.status === 'IDLE' && task.status === 'TODO') {
      // Check Dependencies
      const allDependenciesDone = task.dependencies.every((depId) => {
        const dep = this.tasks.get(depId);
        return dep && dep.status === 'DONE';
      });

      if (!allDependenciesDone) {
        return false; // Cannot start yet
      }

      task.status = 'IN_PROGRESS';
      task.assignedAgentId = agent.id;

      agent.status = 'WORKING';
      agent.currentTaskId = task.id;

      this.tasks.set(taskId, task);
      this.agents.set(agentId, agent);
      return true;
    }
    return false;
  }

  /**
   * Auto-assign best available task to an agent
   */
  assignNextTask(agentId: string): Task | undefined {
    const agent = this.agents.get(agentId);
    if (!agent || agent.status !== 'IDLE') return undefined;

    // Find candidate tasks
    const candidates = Array.from(this.tasks.values()).filter(
      (t) => t.status === 'TODO',
    );

    // Sort by Priority (HIGH > MEDIUM > LOW)
    const priorityWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    candidates.sort(
      (a, b) => priorityWeight[b.priority] - priorityWeight[a.priority],
    );

    for (const task of candidates) {
      if (this.assignTask(task.id, agentId)) {
        return task;
      }
    }
    return undefined;
  }
}

// Singleton instance
export const board = new KanbanBoard();
