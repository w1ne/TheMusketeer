import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import fs_sync from 'fs';
import fs from 'fs/promises';
import { board } from '../core/KanbanBoard';
import { memory } from '../core/MemoryStore';
import { AgentLoop } from '../core/AgentLoop';
import { mcpManager } from '../core/mcp/MCPManager';
import {
  UserAccountManager,
  DEFAULT_MODEL_CONFIGS,
  getDisplayString,
} from '@google/gemini-cli-core';
import { workspaceManager } from '../core/WorkspaceManager';

const app = express();
const port = process.env.PORT || 3000;

// Global error handling to prevent server crashes from child processes
process.on('uncaughtException', (err) => {
  console.error('[Fatal] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Fatal] Unhandled Rejection at:', promise, 'reason:', reason);
});

app.use(express.json());
app.use(cors());
app.use(helmet());

// Initialize MCP
if (process.env.NODE_ENV !== 'test') {
  const mcpConfigPath = path.resolve(process.cwd(), '.agent/mcp.json');
  mcpManager.loadConfig(mcpConfigPath).then(() => {
    console.log('MCP Managers Initialized');
  });
}

// Map to store active loops
const activeLoops: Map<string, AgentLoop> = new Map();

/**
 * Automatically resume agent execution loops for agents that were
 * in WORKING state before a server restart/crash.
 */
function bootstrapAgentLoops() {
  const agents = board.getAgents();
  let resumedCount = 0;
  for (const agent of agents) {
    if (agent.status === 'WORKING' && agent.currentTaskId) {
      console.log(
        `[Bootstrap] Resuming agent loop for ${agent.name} (${agent.id})`,
      );
      const loop = new AgentLoop(agent.id);
      activeLoops.set(agent.id, loop);
      loop.start().catch((err) => {
        console.error(`[Bootstrap] Agent loop ${agent.id} failed:`, err);
        activeLoops.delete(agent.id);
      });
      resumedCount++;
    }
  }
  if (resumedCount > 0) {
    console.log(
      `[Bootstrap] Successfully resumed ${resumedCount} agent loops.`,
    );
  }
}

// --- Auth Store ---
interface User {
  name: string;
  email: string;
  avatar: string;
  apiKey: string;
}

// --- Antigravity Discovery ---

let agServer: { ports: number[]; token: string } | null = null;

function discoverAntigravityServer() {
  try {
    const output = execSync(
      'ps aux | grep "[l]anguage_server" | grep "antigravity"',
    ).toString();
    const lines = output
      .split('\n')
      .filter((l) => l.includes('--extension_server_port'));

    if (lines.length > 0) {
      const line = lines[0];
      const tokenMatch = line.match(/--csrf_token[ =]([a-f0-9-]+)/);
      const portMatch = line.match(/--extension_server_port[ =](\d+)/);

      if (tokenMatch) {
        const token = tokenMatch[1];
        // Find ALL listening ports for this process
        const pidMatch = line.trim().split(/\s+/)[1];
        const ports: number[] = [];

        if (portMatch) ports.push(parseInt(portMatch[1], 10));

        try {
          const lsofOutput = execSync(
            `lsof -nP -iTCP -sTCP:LISTEN -p ${pidMatch}`,
          ).toString();
          const lsofLines = lsofOutput.split('\n');
          for (const l of lsofLines) {
            const m = l.match(/:(\d+)\s+\(LISTEN\)/);
            if (m) {
              const p = parseInt(m[1], 10);
              if (!ports.includes(p)) ports.push(p);
            }
          }
        } catch (e) {
          // lsof might fail or not be present, fallback to the one from ps
        }

        agServer = { ports, token };
        console.log(
          `[Discovery] Found Antigravity Server. Ports: ${ports.join(', ')}`,
        );
        return;
      }
    }
  } catch (e: any) {
    // console.warn('[Discovery] Failed to find Antigravity Server via ps');
  }
}

// Initial discovery
if (process.env.NODE_ENV !== 'test') {
  discoverAntigravityServer();
  // Refresh every 5 minutes
  setInterval(discoverAntigravityServer, 5 * 60 * 1000);
}

const userStore = {
  // ... existing userStore code
  users: new Map<string, User>(), // email -> User
  activeEmail: '',

  getActiveUser(): User | null {
    if (!this.activeEmail) return null;
    return this.users.get(this.activeEmail) || null;
  },

  syncWithAntigravity(): boolean {
    const paths = [
      path.join(
        os.homedir(),
        '.config/Antigravity/User/globalStorage/state.vscdb',
      ),
      path.join(os.homedir(), '.config/Code/User/globalStorage/state.vscdb'),
    ];

    let vscdbPath = '';
    for (const p of paths) {
      if (fs_sync.existsSync(p)) {
        vscdbPath = p;
        break;
      }
    }

    if (!vscdbPath) return false;

    try {
      const buffer = fs_sync.readFileSync(vscdbPath);
      const content = buffer.toString('binary');

      // Look for the specific key that holds the active user state
      // The format in the database holds the JSON object.
      // We use a broader match and try to find the first valid JSON block.
      const match = content.match(/antigravityAuthStatus(\{.*?\})/);

      if (match && match[1]) {
        try {
          const cleanJson = match[1].replace(/[^\x20-\x7E]/g, '');
          const userData = JSON.parse(cleanJson);
          if (userData.email && userData.name) {
            const email = userData.email;
            const name = userData.name;
            const rawApiKey = userData.apiKey || '';
            const apiKey = rawApiKey.startsWith('AIza') ? rawApiKey : '';
            const user: User = {
              name,
              email,
              avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
              apiKey,
            };
            this.users.set(email, user);
            this.activeEmail = email;
            if (apiKey && apiKey.startsWith('AIza')) {
              process.env.GEMINI_API_KEY = apiKey;
              process.env.GOOGLE_API_KEY = apiKey;
              console.log(
                `[Auth] Propagating inherited API key to environment: ${email}`,
              );
            } else if (email) {
              console.log(
                `[Auth] Using account-based auth for: ${email} (no valid API key found)`,
              );
            }
            console.log(
              `[Auth] Inherited Antigravity Identity: ${name} (${email})`,
            );
            return true;
          }
        } catch (e: any) {
          // skip
        }
      }

      // Fallback: If specific key not found, try the old regex
      const emailMatch = content.match(
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
      );

      if (emailMatch) {
        const email = emailMatch[0];
        if (!email.includes('google.com') && !email.includes('example.com')) {
          const name = email.split('@')[0].toUpperCase();
          const apiKeyMatch = content.match(
            /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/,
          );
          const rawApiKey = apiKeyMatch ? apiKeyMatch[0] : '';
          const apiKey = rawApiKey.startsWith('AIza') ? rawApiKey : '';

          const user: User = {
            name,
            email,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
            apiKey,
          };
          this.users.set(email, user);
          this.activeEmail = email;
          if (apiKey && apiKey.startsWith('AIza')) {
            process.env.GEMINI_API_KEY = apiKey;
            process.env.GOOGLE_API_KEY = apiKey;
            console.log(
              `[Auth] Propagating inherited API key (fallback) to environment: ${email}`,
            );
          } else if (email) {
            console.log(
              `[Auth] Using account-based auth (fallback) for: ${email}`,
            );
          }
          console.log(
            `[Auth] Inherited Identity (Fallback): ${name} (${email})`,
          );
          return true;
        }
      }
    } catch (_e: any) {
      console.warn('[Auth] Antigravity sync skipped', _e);
    }
    return false;
  },

  syncWithGeminiCLI() {
    // First, try Antigravity (Google AI Pro subscribers get enhanced benefits here)
    if (this.syncWithAntigravity()) return;

    // Then try Gemini CLI
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
        return;
      }
    } catch (_error) {
      console.warn('[Auth] Gemini CLI sync error');
    }

    // If both fail, setup guest
    this.setupGuest();
  },

  setupGuest() {
    console.log('[Auth] Defaulting to Guest Mode.');
    const osUser = process.env.USER || 'Guest';
    const name = osUser.charAt(0).toUpperCase() + osUser.slice(1);

    const guestUser: User = {
      name: name,
      email: `${osUser}@localhost`,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
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

// --- Models ---
app.get('/api/models', async (req: Request, res: Response) => {
  // 1. Try to get models from Antigravity Server via Usage Status
  let subscriptionModels: any[] = [];
  let useSubscriptionOnly = false;

  if (agServer) {
    for (const port of agServer.ports) {
      try {
        const url = `http://localhost:${port}/exa.language_server_pb.LanguageServerService/GetUserStatus`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Codeium-Csrf-Token': agServer.token,
          },
          body: JSON.stringify({
            metadata: { ideName: 'antigravity' },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          // Strictly map from userStatus.cascadeModelConfigData.clientModelConfigs
          const configs =
            data.userStatus?.cascadeModelConfigData?.clientModelConfigs;
          if (configs && Array.isArray(configs)) {
            subscriptionModels = configs.map((m: any) => ({
              id: m.label,
              name: m.label,
              subscription: true,
            }));
            useSubscriptionOnly = true;
          }
          break;
        }
      } catch (e) {
        /* continue */
      }
    }
  }

  // 2. Fallback models (Generic SDK aliases) - Only if not using subscription
  let fallbackModels: any[] = [];
  if (!useSubscriptionOnly) {
    const aliases = (DEFAULT_MODEL_CONFIGS as any)?.aliases || {};
    fallbackModels = Object.entries(aliases)
      .filter(([alias, config]) => {
        const id = (config as any).modelConfig?.model;
        return (
          id &&
          (id.startsWith('gemini') ||
            id.startsWith('claude') ||
            id.startsWith('gpt'))
        );
      })
      .map(([alias, config]) => ({
        id: alias,
        name: getDisplayString(alias),
      }));
  }

  const models = [
    { id: 'auto', name: 'Auto (Recommended)' },
    ...subscriptionModels,
    ...fallbackModels,
  ];

  // De-duplicate by ID
  const seen = new Set();
  const uniqueModels = models.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });

  res.json(uniqueModels);
});

// --- Providers ---
app.get('/api/providers', (req: Request, res: Response) => {
  // Providers supported by the current SDK version
  const providers = [
    { id: 'gemini', name: 'Google Gemini' },
    { id: 'anthropic', name: 'Anthropic Claude' },
  ];
  res.json(providers);
});

// --- Usage ---
app.get('/api/usage', async (req: Request, res: Response) => {
  if (!agServer) discoverAntigravityServer();
  if (!agServer)
    return res.status(503).json({ error: 'Antigravity server not found' });

  for (const port of agServer.ports) {
    try {
      const url = `http://localhost:${port}/exa.language_server_pb.LanguageServerService/GetUserStatus`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Codeium-Csrf-Token': agServer.token,
        },
        body: JSON.stringify({
          metadata: { ideName: 'antigravity' },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return res.json(data);
      }
    } catch (e: any) {
      // Try next port
    }
  }

  // If we reach here, all ports failed or returned non-200
  agServer = null; // force rediscovery next time
  res
    .status(502)
    .json({
      error: 'Failed to reach Antigravity usage API on all known ports',
    });
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

  // Use the active user's API key (from Antigravity/Google AI Pro) if not explicitly provided
  const activeUser = userStore.getActiveUser();
  const effectiveApiKey = apiKey || activeUser?.apiKey || '';

  if (effectiveApiKey) {
    console.log(`[Agent] Using API key from ${activeUser?.email || 'request'}`);
  }

  const agent = board.spawnAgent(name, {
    provider: provider || 'gemini-cli',
    model: model || 'auto',
    apiKey: effectiveApiKey,
  });
  res.status(201).json(agent);
});

app.patch('/api/agents/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  const agent = board.updateAgent(id, updates);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  res.json(agent);
});

app.delete('/api/agents/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  // Stop loop if active
  const loop = activeLoops.get(id);
  if (loop) {
    await loop.stop();
    activeLoops.delete(id);
  }

  if (board.removeAgent(id)) {
    res.json({ status: 'ok', message: 'Agent removed' });
  } else {
    res.status(404).json({ error: 'Agent not found' });
  }
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
    if (!fs_sync.existsSync(workspaceRoot)) {
      return res.json([]);
    }
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
  const { status, dependencyId, result, artifacts, progress } = req.body;

  const task = board.getTask(id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  if (status) {
    board.updateTaskStatus(id, status, undefined, result);
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

app.delete('/api/tasks/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  if (board.deleteTask(id)) {
    res.json({ status: 'ok', message: 'Task deleted' });
  } else {
    res.status(404).json({ error: 'Task not found' });
  }
});

app.patch('/api/tasks/:id/archive', (req: Request, res: Response) => {
  const { id } = req.params;
  if (board.archiveTask(id)) {
    res.json({ status: 'ok', message: 'Task archived' });
  } else {
    res.status(404).json({ error: 'Task not found' });
  }
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
    bootstrapAgentLoops();
  });
}
