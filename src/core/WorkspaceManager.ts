import fs from 'fs/promises';
import path from 'path';

export class WorkspaceManager {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), '.agent/workspaces');
  }

  async ensureBaseDir() {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch (_e) {
      // Ignore if exists
    }
  }

  async createWorkspace(agentId: string): Promise<string> {
    await this.ensureBaseDir();
    const workspaceDir = path.join(this.baseDir, agentId);

    // Clean up old workspace if exists
    try {
      await fs.rm(workspaceDir, { recursive: true, force: true });
    } catch (_e) {
      // Ignore
    }

    await fs.mkdir(workspaceDir, { recursive: true });
    return workspaceDir;
  }

  async getWorkspace(agentId: string): Promise<string> {
    return path.join(this.baseDir, agentId);
  }

  getWorkspaceRoot(agentId: string): string {
    return path.join(this.baseDir, agentId);
  }

  async cleanupWorkspace(agentId: string) {
    const workspaceDir = path.join(this.baseDir, agentId);
    try {
      await fs.rm(workspaceDir, { recursive: true, force: true });
    } catch (e) {
      console.error(`Failed to cleanup workspace for ${agentId}:`, e);
    }
  }
}

export const workspaceManager = new WorkspaceManager();
