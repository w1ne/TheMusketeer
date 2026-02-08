#!/usr/bin/env node
import { board } from './core/KanbanBoard';

const API_URL = 'http://localhost:3000/api';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help') {
    printHelp();
    return;
  }

  try {
    switch (command) {
      case 'status':
        await printStatus();
        break;
      case 'task:create':
        // Expecting: task:create <title> [priority]
        const title = args[1];
        const priority = args[2] || 'MEDIUM';

        if (!title) {
          console.error('Error: Task title is required.');
          process.exit(1);
        }
        await createTask(title, priority);
        break;

      case 'task:depends':
        const tId = args[1];
        const depId = args[2];
        if (!tId || !depId) {
          console.error('Error: Task ID and Dependency ID required.');
          process.exit(1);
        }
        await addDependency(tId, depId);
        break;

      case 'agent:spawn':
        const name = args[1];
        if (!name) {
          console.error('Error: Agent name is required.');
          process.exit(1);
        }
        await spawnAgent(name);
        break;

      // Memory Commands
      case 'memory:log':
        const logContent = args.slice(1).join(' ');
        if (!logContent) {
          console.error('Error: Log content is required.');
          process.exit(1);
        }
        await addLog(logContent);
        break;
      case 'memory:learn':
        const knowledgeContent = args.slice(1).join(' ');
        if (!knowledgeContent) {
          console.error('Error: Knowledge content is required.');
          process.exit(1);
        }
        await addKnowledge(knowledgeContent);
        break;
      case 'memory:show':
        await showMemory();
        break;

      // For local testing without server (demo mode)
      case 'local:demo':
        runLocalDemo();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('Error executing command. Is the server running?');
    // Fallback to local board for demo if server fails?
    // For now, just report error.
    if ((error as any).code === 'ECONNREFUSED') {
      console.error(
        `Could not connect to ${API_URL}. Run 'npm start' in another terminal.`,
      );
    } else {
      console.error(error);
    }
  }
}

function printHelp() {
  console.log(`
Usage: thepuppeteer <command> [args]

Core Commands:
  status                   Show current board status (Tasks & Agents)
  task:create <title> [p]  Create a new task (p=HIGH|MEDIUM|LOW)
  task:depends <id> <dep>  Add a dependency (Task <id> depends on <dep>)
  agent:spawn <name>       Spawn a new agent

Memory Commands:
  memory:log <msg>         Log an activity (Ephemeral Memory)
  memory:learn <info>      Add to knowledge base (Durable Memory)
  memory:show              Show recent logs and durable knowledge

Other:
  local:demo               Run a local in-memory demo (no server needed)
  help                     Show this help message
`);
}

async function printStatus() {
  const [tasksRes, agentsRes] = await Promise.all([
    fetch(`${API_URL}/tasks`),
    fetch(`${API_URL}/agents`),
  ]);

  const tasks = await tasksRes.json();
  const agents = await agentsRes.json();

  console.log('--- Kanban Board Status ---');
  console.log(`Tasks (${tasks.length}):`);
  // console.table(tasks); // Too verbose with all new fields
  tasks.forEach((t: any) => {
    const deps = t.dependencies.join(',');
    console.log(
      `[${t.status}] ${t.priority} - ${t.title} (ID: ${t.id}) ${deps ? `[Depends: ${deps}]` : ''}`,
    );
  });

  console.log(`\nAgents (${agents.length}):`);
  console.table(agents);
}

async function createTask(title: string, priority: string) {
  const res = await fetch(`${API_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, priority }),
  });
  const data = await res.json();
  console.log('Task Created:', data);
}

async function addDependency(id: string, dependencyId: string) {
  const res = await fetch(`${API_URL}/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dependencyId }),
  });
  if (res.ok) {
    console.log(`Dependency added: Task ${id} now depends on ${dependencyId}`);
  } else {
    const err = await res.json();
    console.error('Failed:', err);
  }
}

async function spawnAgent(name: string) {
  const res = await fetch(`${API_URL}/agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  console.log('Agent Spawned:', data);
}

async function addLog(content: string) {
  // For CLI logs, we use a generic 'CLI_USER' agent ID
  const res = await fetch(`${API_URL}/memory/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, agentId: 'CLI_USER' }),
  });
  if (res.ok) {
    console.log('Log added to Ephemeral Memory.');
  } else {
    console.error('Failed to add log.');
  }
}

async function addKnowledge(content: string) {
  const res = await fetch(`${API_URL}/memory/knowledge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (res.ok) {
    console.log('Knowledge added to Durable Memory.');
  } else {
    console.error('Failed to add knowledge.');
  }
}

async function showMemory() {
  console.log('--- Durable Knowledge (MEMORY.md) ---');
  const knowledgeRes = await fetch(`${API_URL}/memory/knowledge`);
  const knowledge = await knowledgeRes.json();
  console.log(knowledge.content || '(Empty)');

  console.log('\n--- Recent Logs (Last 7 Days) ---');
  const logsRes = await fetch(`${API_URL}/memory/logs`);
  const logs = await logsRes.json();
  logs.forEach((log: string) => console.log(log));
}

function runLocalDemo() {
  console.log('Running Local Demo (In-Memory)...');
  console.log('Initial Board:');
  console.log(board.getTasks());

  console.log('Creating Task "Local Task"...');
  const t = board.createTask('Local Task');
  console.log(t);

  console.log('Spawning Agent "Local Agent"...');
  const a = board.spawnAgent('Local Agent');
  console.log(a);
}

main();
