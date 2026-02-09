import fs from 'fs';
import path from 'path';
import {
  Agent,
  Task,
  TaskStatus,
  TaskPriority,
  AgentStatus,
  Artifact,
} from './types';
import { randomUUID } from 'crypto';

const DATA_DIR = path.resolve(process.cwd(), '.agent/data');
const DATA_FILE = path.join(DATA_DIR, 'kanban.json');

/**
 * The central orchestrator for the Vibe Kanban framework.
 * Thread-safe singleton that manages tasks, agents, and their assignments.
 */
export class KanbanBoard {
  private tasks: Map<string, Task> = new Map();
  private agents: Map<string, Agent> = new Map();

  constructor() {
    this.loadState();
  }

  private loadState() {
    if (!fs.existsSync(DATA_FILE)) return;
    try {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      if (data.tasks) this.tasks = new Map(data.tasks);
      if (data.agents) this.agents = new Map(data.agents);
      console.log(
        `[KanbanBoard] Loaded ${this.tasks.size} tasks and ${this.agents.size} agents from disk.`,
      );
    } catch (e) {
      console.error('[KanbanBoard] Failed to load state:', e);
    }
  }

  private saveState() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const data = {
        tasks: Array.from(this.tasks.entries()),
        agents: Array.from(this.agents.entries()),
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('[KanbanBoard] Failed to save state:', e);
    }
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
      validationStatus: 'PENDING',
      retryCount: 0,
      branchName: `agent/${id.substring(0, 8)}`, // Default branch name
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

    this.saveState();
    return task;
  }

  addDependency(taskId: string, dependencyId: string): boolean {
    const task = this.tasks.get(taskId);
    const dependency = this.tasks.get(dependencyId);

    if (task && dependency && taskId !== dependencyId) {
      if (!task.dependencies.includes(dependencyId)) {
        task.dependencies.push(dependencyId);
        this.tasks.set(taskId, task);
        this.saveState();
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

  updateTaskStatus(
    id: string,
    status?: TaskStatus,
    message?: string,
    result?: string,
    artifacts?: Artifact[],
    progress?: string,
  ): Task | undefined {
    const task = this.tasks.get(id);
    if (task) {
      if (status !== undefined) task.status = status;
      if (message !== undefined) task.statusMessage = message;
      if (result !== undefined) task.result = result;
      if (progress !== undefined) task.progress = progress;
      if (artifacts !== undefined) {
        // Append or replace? Let's append if it exists, roughly, or just replace for simplicity in this MVP.
        // Actually, let's treat it as a replace/update for now to keep API simple.
        // Or better: if artifacts are sent, they are added to the list.
        const existing = task.artifacts || [];
        // deduplicate by ID
        const newArtifacts = [...existing, ...artifacts].filter(
          (a, i, self) => i === self.findIndex((t) => t.id === a.id),
        );
        task.artifacts = newArtifacts;
      }
      this.tasks.set(id, task);
      this.saveState();
    }
    return task;
  }

  updateTaskStatusMessage(id: string, message: string): void {
    const task = this.tasks.get(id);
    if (task) {
      task.statusMessage = message;
      this.tasks.set(id, task);
      this.saveState();
    }
  }

  deleteTask(id: string): boolean {
    if (this.tasks.has(id)) {
      this.tasks.delete(id);
      this.saveState();
      return true;
    }
    return false;
  }

  archiveTask(id: string): boolean {
    const task = this.tasks.get(id);
    if (task) {
      task.status = 'ARCHIVED';
      this.tasks.set(id, task);
      this.saveState();
      return true;
    }
    return false;
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
    this.saveState();
    return agent;
  }

  getAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  removeAgent(id: string): boolean {
    if (this.agents.has(id)) {
      this.agents.delete(id);
      this.saveState();
      return true;
    }
    return false;
  }

  updateAgent(id: string, updates: Partial<Agent>): Agent | undefined {
    const agent = this.agents.get(id);
    if (agent) {
      if (updates.name) agent.name = updates.name;
      if (updates.status) agent.status = updates.status;
      if (updates.config) {
        agent.config = { ...agent.config, ...updates.config };
      }
      this.agents.set(id, agent);
      this.saveState();
      return agent;
    }
    return undefined;
  }

  updateAgentActivity(id: string, activity: string): void {
    const agent = this.agents.get(id);
    if (agent) {
      agent.currentActivity = activity;
      this.agents.set(id, agent);
      this.saveState();
    }
  }

  setAgentInput(id: string, input: string): void {
    const agent = this.agents.get(id);
    if (agent) {
      agent.pendingInput = input;
      // If agent was paused/waiting, resume it
      if (agent.status === 'PAUSED') {
        agent.status = 'WORKING';
      }
      this.agents.set(id, agent);
      this.saveState();
    }
  }

  clearAgentInput(id: string): void {
    const agent = this.agents.get(id);
    if (agent) {
      agent.pendingInput = undefined;
      this.agents.set(id, agent);
      this.saveState();
    }
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
      task.validationStatus = 'PENDING'; // Reset validation status on new assignment
      // We do NOT reset retryCount here, as retries are global for the task?
      // Actually, if a new agent takes it, maybe we should keep the history.

      agent.status = 'WORKING';
      agent.currentTaskId = task.id;

      this.tasks.set(taskId, task);
      this.agents.set(agentId, agent);
      this.saveState();
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
