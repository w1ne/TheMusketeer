import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import path from 'path';

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
    version: '1.0.0',
    description: 'API for managing agents in Vibe Kanban',
  },
  paths: {
    '/api/health': {
      get: {
        summary: 'Health check',
        responses: {
          '200': { description: 'Server is healthy' },
        },
      },
    },
    '/api/agents': {
      get: {
        summary: 'List agents',
        responses: {
          '200': { description: 'List of active agents' },
        },
      },
    },
  },
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.get('/api/agents', (req, res) => {
  // Mock data
  res.json([
    { id: 'agent-1', name: 'BugFixer', status: 'idle' },
    { id: 'agent-2', name: 'RefactorBot', status: 'working' },
  ]);
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
