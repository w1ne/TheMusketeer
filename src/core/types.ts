export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type AgentStatus = 'IDLE' | 'WORKING';
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
}
