import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import { board } from '../core/KanbanBoard';
import { memory } from '../core/MemoryStore';

const app = express();
const port = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

// API Documentation
const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'thepuppeteer API',
    version: '1.3.0',
    description:
      'API for managing agents, tasks (advanced), and memory in Vibe Kanban',
  },
  paths: {
    '/api/health': {
      get: {
        summary: 'Health check',
        responses: { '200': { description: 'Server is healthy' } },
      },
    },
    '/api/agents': {
      get: {
        summary: 'List agents',
        responses: { '200': { description: 'List of active agents' } },
      },
      post: {
        summary: 'Spawn an agent',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { name: { type: 'string' } },
              },
            },
          },
        },
        responses: { '201': { description: 'Agent spawned' } },
      },
    },
    '/api/tasks': {
      get: {
        summary: 'List tasks',
        responses: { '200': { description: 'List of tasks' } },
      },
      post: {
        summary: 'Create a task',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  priority: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
                  parentId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Task created' } },
      },
    },
    '/api/tasks/{id}': {
      put: {
        summary: 'Update task',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  dependencyId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Task updated' } },
      },
    },
    '/api/memory/logs': {
      get: {
        summary: 'Get recent logs',
        responses: { '200': { description: 'List of logs' } },
      },
      post: {
        summary: 'Add a log entry',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  content: { type: 'string' },
                  agentId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Log added' } },
      },
    },
    '/api/memory/knowledge': {
      get: {
        summary: 'Get durable knowledge',
        responses: { '200': { description: 'Knowledge content' } },
      },
      post: {
        summary: 'Add knowledge',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { content: { type: 'string' } },
              },
            },
          },
        },
        responses: { '201': { description: 'Knowledge added' } },
      },
    },
  },
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// --- Agents ---
app.get('/api/agents', (req, res) => {
  res.json(board.getAgents());
});

app.post('/api/agents', (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  const agent = board.spawnAgent(name);
  res.status(201).json(agent);
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
    const logs = await memory.getRecentLogs(7); // Default to last week
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
