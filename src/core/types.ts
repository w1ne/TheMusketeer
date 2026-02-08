export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'AWAITING_INPUT';
export type AgentStatus = 'IDLE' | 'WORKING' | 'PAUSED' | 'ERROR';
export type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedAgentId?: string;

  // Dependencies
  dependencies: string[]; // IDs of tasks that must be DONE before this one starts

  // Hierarchy
  parentId?: string;
  subtasks: string[];

  // Detailed Status
  statusMessage?: string; // e.g. "Waiting for approval on branch agent/x"
}

export interface AgentConfig {
  provider: 'gemini' | 'anthropic' | 'gemini-cli';
  model: string;
  apiKey?: string;
}

export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  config: AgentConfig;
  currentTaskId?: string;
  currentActivity?: string; // e.g. "Analyzing project structure..."
  pendingInput?: string; // User message waiting for the agent
}
