import fs from 'fs/promises';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';

export class MemoryStore {
  private baseDir: string;
  private logsDir: string;
  private knowledgeFile: string;

  constructor(baseDir: string = 'data/memory') {
    this.baseDir = baseDir;
    this.logsDir = path.join(this.baseDir, 'logs');
    this.knowledgeFile = path.join(this.baseDir, 'MEMORY.md');
    this.init();
  }

  private init() {
    if (!existsSync(this.logsDir)) {
      mkdirSync(this.logsDir, { recursive: true });
    }
  }

  // --- Ephemeral Memory (Daily Logs) ---

  async addLog(content: string, agentId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const logFile = path.join(this.logsDir, `${today}.md`);

    const timestamp = new Date().toISOString();
    const entry = `\n[${timestamp}] [${agentId}] ${content}\n`;

    await fs.appendFile(logFile, entry, 'utf8');
  }

  async getRecentLogs(days: number = 1): Promise<string[]> {
    const logs: string[] = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const logFile = path.join(this.logsDir, `${dateStr}.md`);

      if (existsSync(logFile)) {
        const content = await fs.readFile(logFile, 'utf8');
        logs.push(`--- ${dateStr} ---\n${content}`);
      }
    }
    return logs;
  }

  // --- Durable Memory (Knowledge) ---

  async addKnowledge(content: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const entry = `\n- [${timestamp}] ${content}`;
    await fs.appendFile(this.knowledgeFile, entry, 'utf8');
  }

  async getKnowledge(): Promise<string> {
    if (existsSync(this.knowledgeFile)) {
      return await fs.readFile(this.knowledgeFile, 'utf8');
    }
    return '';
  }
}

export const memory = new MemoryStore();
