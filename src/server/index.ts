import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import os from 'os';
import fs_sync from 'fs';
import fs from 'fs/promises';
import { board } from '../core/KanbanBoard';
import { memory } from '../core/MemoryStore';
import { AgentLoop } from '../core/AgentLoop';
import { mcpManager } from '../core/mcp/MCPManager';
import { UserAccountManager } from '@google/gemini-cli-core';
import { workspaceManager } from '../core/WorkspaceManager';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(helmet());

// Initialize MCP
const mcpConfigPath = path.resolve(process.cwd(), '.agent/mcp.json');
mcpManager.loadConfig(mcpConfigPath).then(() => {
  console.log('MCP Managers Initialized');
});

// Map to store active loops
const activeLoops: Map<string, AgentLoop> = new Map();

// --- Auth Store ---
interface User {
  name: string;
  email: string;
  avatar: string;
  apiKey: string;
}

const userStore = {
  users: new Map<string, User>(), // email -> User
  activeEmail: '',

  getActiveUser(): User | null {
    if (!this.activeEmail) return null;
    return this.users.get(this.activeEmail) || null;
  },

  syncWithAntigravity(): boolean {
    const vscdbPath = path.join(
      os.homedir(),
      '.config/Code/User/globalStorage/state.vscdb',
    );
    if (!fs_sync.existsSync(vscdbPath)) return false;

    try {
      const buffer = fs_sync.readFileSync(vscdbPath);
      const content = buffer.toString('binary');
      const emailMatch = content.match(/[a-zA-Z0-9._%+-]+@gmail\.com/);

      if (emailMatch) {
        const email = emailMatch[0];
        const name = email.split('@')[0].toUpperCase();
        const apiKeyMatch = content.match(
          /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/,
        );
        const apiKey = apiKeyMatch ? apiKeyMatch[0] : '';

        const user: User = {
          name,
          email,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
          apiKey,
        };
        this.users.set(email, user);
        this.activeEmail = email;
        console.log(
          `[Auth] Inherited Antigravity Identity: ${name} (${email})`,
        );
        return true;
      }
    } catch (_e: any) {
      console.warn('[Auth] Antigravity sync skipped');
    }
    return false;
  },

  syncWithGeminiCLI() {
    if (this.syncWithAntigravity()) return;

    try {
      const manager = new UserAccountManager();
      const email = manager.getCachedGoogleAccount();

      if (email) {
        console.log(`[Auth] Syncing with Gemini CLI: ${email}`);
        const name = email.split('@')[0].toUpperCase();
        const user: User = {
          name,
          email,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
          apiKey: '',
        };
        this.users.set(email, user);
        this.activeEmail = email;
      } else {
        this.setupGuest();
      }
    } catch (_error) {
      this.setupGuest();
    }
  },

  setupGuest() {
    console.log('[Auth] Defaulting to Guest Mode.');
    const guestUser: User = {
      name: 'Guest User',
      email: 'guest@example.com',
      avatar: 'https://ui-avatars.com/api/?name=Guest+User',
      apiKey: '',
    };
    this.users.set(guestUser.email, guestUser);
    this.activeEmail = guestUser.email;
  },
};

// Initialize identities
userStore.syncWithGeminiCLI();

// --- API Routes ---

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { name, email, key } = req.body;
  if (name && email) {
    const newUser: User = {
      name,
      email,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      apiKey: key || '',
    };
    userStore.users.set(email, newUser);
    userStore.activeEmail = email;
  }
  const active = userStore.getActiveUser();
  res.json({ status: 'ok', user: active });
});

app.post('/api/auth/switch', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || !userStore.users.has(email)) {
    return res.status(400).json({ error: 'User not found' });
  }
  userStore.activeEmail = email;
  res.json({ status: 'ok', user: userStore.getActiveUser() });
});

app.get('/api/user', (req: Request, res: Response) => {
  const active = userStore.getActiveUser();
  res.json(active);
});

app.get('/api/users', (req: Request, res: Response) => {
  const users = Array.from(userStore.users.values());
  res.json(users);
});

// --- Agents ---
app.get('/api/agents', (req: Request, res: Response) => {
  res.json(board.getAgents());
});

app.post('/api/agents', (req: Request, res: Response) => {
  const { name, provider, model, apiKey } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  const agent = board.spawnAgent(name, {
    provider: provider || 'gemini',
    model: model || 'gemini-1.5-pro',
    apiKey,
  });
  res.status(201).json(agent);
});

app.post('/api/agents/:id/start', async (req: Request, res: Response) => {
  const { id } = req.params;
  const agent = board.getAgent(id);

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  if (activeLoops.has(id)) {
    return res.status(400).json({ error: 'Agent loop already running' });
  }

  const loop = new AgentLoop(id);
  activeLoops.set(id, loop);

  loop.start().catch((err) => {
    console.error(`Agent loop ${id} failed:`, err);
    activeLoops.delete(id);
  });

  res.json({ status: 'Agent loop started', agentId: id });
});

app.post('/api/agents/:id/stop', async (req: Request, res: Response) => {
  const { id } = req.params;
  const loop = activeLoops.get(id);

  if (!loop) {
    return res.status(400).json({ error: 'Agent loop not running' });
  }

  await loop.stop();
  activeLoops.delete(id);

  res.json({ status: 'Agent loop stopped', agentId: id });
});

app.post('/api/agents/:id/input', (req: Request, res: Response) => {
  const { id } = req.params;
  const { input } = req.body;
  if (!input) {
    return res.status(400).json({ error: 'Input is required' });
  }
  const agent = board.getAgent(id);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  board.setAgentInput(id, input);
  res.json({ status: 'ok', agentId: id });
});

app.get('/api/agents/:id/files', async (req: Request, res: Response) => {
  const { id } = req.params;
  const agent = board.getAgent(id);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  try {
    const workspaceRoot = workspaceManager.getWorkspaceRoot(id);
    const files = await fs.readdir(workspaceRoot, { recursive: true });
    res.json(files);
  } catch (_error) {
    res.status(500).json({ error: 'Failed to list workspace files' });
  }
});

// --- Tasks ---
app.get('/api/tasks', (req: Request, res: Response) => {
  res.json(board.getTasks());
});

app.post('/api/tasks', (req: Request, res: Response) => {
  const { title, priority, parentId } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const task = board.createTask(title, priority, parentId);
  res.status(201).json(task);
});

app.put('/api/tasks/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, dependencyId } = req.body;

  const task = board.getTask(id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  if (status) {
    board.updateTaskStatus(id, status);
  }

  if (dependencyId) {
    if (!board.addDependency(id, dependencyId)) {
      return res
        .status(400)
        .json({ error: 'Failed to add dependency (cycle or invalid id)' });
    }
  }

  res.json(board.getTask(id));
});

// --- Memory ---
app.get('/api/memory/logs', async (req: Request, res: Response) => {
  try {
    const logs = await memory.getRecentLogs(7);
    res.json(logs);
  } catch (_error) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

app.post('/api/memory/logs', async (req: Request, res: Response) => {
  const { content, agentId } = req.body;
  if (!content || !agentId) {
    return res.status(400).json({ error: 'Content and AgentID form required' });
  }
  try {
    await memory.addLog(content, agentId);
    res.status(201).json({ success: true });
  } catch (_error) {
    res.status(500).json({ error: 'Failed to add log' });
  }
});

app.get('/api/memory/knowledge', async (req: Request, res: Response) => {
  try {
    const knowledge = await memory.getKnowledge();
    res.json({ content: knowledge });
  } catch (_error) {
    res.status(500).json({ error: 'Failed to fetch knowledge' });
  }
});

app.post('/api/memory/knowledge', async (req: Request, res: Response) => {
  const { content } = req.body;
  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }
  try {
    await memory.addKnowledge(content);
    res.status(201).json({ success: true });
  } catch (_error) {
    res.status(500).json({ error: 'Failed to add knowledge' });
  }
});

// Serve Frontend in Production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../web/dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../web/dist/index.html'));
  });
}

export { app };

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`API Docs available at http://localhost:${port}/api-docs`);
  });
}
