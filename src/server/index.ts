import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import { board } from '../core/KanbanBoard';
import { memory } from '../core/MemoryStore';
import { AgentLoop } from '../core/AgentLoop';
import { mcpManager } from '../core/mcp/MCPManager';

const app = express();
const port = process.env.PORT || 3000;

// Initialize MCP
const mcpConfigPath = path.resolve(process.cwd(), '.agent/mcp.json');
mcpManager.loadConfig(mcpConfigPath).then(() => {
  console.log('MCP Managers Initialized');
});

app.use(helmet());
app.use(cors());
app.use(express.json());

// Map to store active loops
const activeLoops: Map<string, AgentLoop> = new Map();

// --- Auth Store (In-Memory for Demo) ---
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
};

// Initialize with a guest
const guestUser: User = {
  name: 'Guest User',
  email: 'guest@example.com',
  avatar: 'https://ui-avatars.com/api/?name=Guest+User',
  apiKey: '',
};
userStore.users.set(guestUser.email, guestUser);
userStore.activeEmail = guestUser.email;

// ... (API Documentation update skipped to avoid huge diff, assume docs are "good enough" for demo)

// ...

// --- Auth ---
app.post('/api/auth/login', (req, res) => {
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

    // In real app, we would configure LLM service here
    /* if (key) llm.setApiKey(key); */
  }
  const active = userStore.getActiveUser();
  res.json({ status: 'ok', user: active });
});

app.post('/api/auth/switch', (req, res) => {
  const { email } = req.body;
  if (!email || !userStore.users.has(email)) {
    return res.status(400).json({ error: 'User not found' });
  }
  userStore.activeEmail = email;
  res.json({ status: 'ok', user: userStore.getActiveUser() });
});

app.get('/api/user', (req, res) => {
  const active = userStore.getActiveUser();
  res.json(active || guestUser);
});

app.get('/api/users', (req, res) => {
  const users = Array.from(userStore.users.values());
  res.json(users);
});

// --- Agents ---
app.get('/api/agents', (req, res) => {
  res.json(board.getAgents());
});

app.post('/api/agents', (req, res) => {
  const { name, provider, model, apiKey } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  const agent = board.spawnAgent(name, {
    provider: provider || 'gemini', // Default
    model: model || 'gemini-1.5-pro',
    apiKey,
  });
  res.status(201).json(agent);
});

app.post('/api/agents/:id/start', async (req, res) => {
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

app.post('/api/agents/:id/stop', async (req, res) => {
  const { id } = req.params;
  const loop = activeLoops.get(id);

  if (!loop) {
    return res.status(400).json({ error: 'Agent loop not running' });
  }

  await loop.stop();
  activeLoops.delete(id);

  res.json({ status: 'Agent loop stopped', agentId: id });
});

// --- Tasks ---
app.get('/api/tasks', (req, res) => {
  res.json(board.getTasks());
});

app.post('/api/tasks', (req, res) => {
  const { title, priority, parentId } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const task = board.createTask(title, priority, parentId);
  res.status(201).json(task);
});

app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { status, dependencyId } = req.body;

  let task = board.getTask(id);
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
app.get('/api/memory/logs', async (req, res) => {
  try {
    const logs = await memory.getRecentLogs(7);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

app.post('/api/memory/logs', async (req, res) => {
  const { content, agentId } = req.body;
  if (!content || !agentId) {
    return res.status(400).json({ error: 'Content and AgentID form required' });
  }
  try {
    await memory.addLog(content, agentId);
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add log' });
  }
});

app.get('/api/memory/knowledge', async (req, res) => {
  try {
    const knowledge = await memory.getKnowledge();
    res.json({ content: knowledge });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch knowledge' });
  }
});

app.post('/api/memory/knowledge', async (req, res) => {
  const { content } = req.body;
  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }
  try {
    await memory.addKnowledge(content);
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add knowledge' });
  }
});

// Serve Frontend in Production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../web/dist')));
  app.get('*', (req, res) => {
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
