#!/usr/bin/env node
import { board } from './core/KanbanBoard';
import chalk from 'chalk';
import fetch from 'node-fetch';

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
        const provider = args[2] as 'gemini' | 'anthropic' | 'gemini-cli';
        const model = args[3];

        if (!name) {
          console.error('Error: Agent name is required.');
          console.error(
            'Usage: themusketeer agent:spawn <name> [provider] [model]',
          );
          process.exit(1);
        }
        await spawnAgent(name, provider, model);
        break;

      case 'auth:login':
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        console.log('--- Google Login ---');
        console.log(
          'To use Real Login, you need an OAuth Client ID & Secret from Google Cloud Console.',
        );
        console.log(
          '(Press ENTER to use a default placeholder - might fail if quotas exceeded)',
        );

        readline.question('Client ID: ', (cid: string) => {
          readline.question('Client Secret: ', async (csec: string) => {
            const clientId = cid || 'YOUR_DEFAULT_CLIENT_ID'; // Placeholder
            const clientSecret = csec || 'YOUR_DEFAULT_SECRET';

            const { GoogleAuthService } = require('./core/auth/GoogleAuth');
            const authService = new GoogleAuthService(clientId, clientSecret);

            console.log('\nSelect Login Method:');
            console.log('1. Interactive (Browser Popup - requires port 3000)');
            console.log('2. Manual (Copy/Paste Code)');
            console.log('3. Gemini CLI (Official Tool)');

            readline.question('Choice [1/2/3]: ', async (choice: string) => {
              let user: any;
              if (choice === '3') {
                console.log('Launching @google/gemini-cli auth login...');
                const { spawn } = require('child_process');
                await new Promise((resolve) => {
                  const child = spawn(
                    'npx',
                    ['@google/gemini-cli', 'auth', 'login'],
                    { stdio: 'inherit', shell: true },
                  );
                  child.on('close', (code: number) => {
                    if (code === 0) console.log('Gemini CLI Auth Successful.');
                    else console.error('Gemini CLI Auth Failed.');
                    resolve(true);
                  });
                });

                // Detect Identity
                const {
                  UserAccountManager,
                } = require('@google/gemini-cli-core');
                const manager = new UserAccountManager();
                const email = manager.getCachedGoogleAccount();

                if (email) {
                  console.log(`Detected Account: ${email}`);
                  const name = email.split('@')[0].toUpperCase();
                  await saveAuth(name, email, '');
                } else {
                  console.warn(
                    'Could not detect Gemini CLI account. Manual entry required.',
                  );
                  readline.question(
                    'Enter a display name for this session: ',
                    async (name: string) => {
                      readline.question(
                        'Enter email: ',
                        async (email: string) => {
                          await saveAuth(name, email, '');
                          readline.close();
                        },
                      );
                    },
                  );
                  return;
                }
                readline.close();
                return;
              }

              if (choice === '2') {
                const url = await authService.loginManual();
                console.log('\nOpen this URL:', url);
                await new Promise((resolve) => {
                  readline.question('Enter Code: ', async (code: string) => {
                    user = await authService.exchangeCode(code);
                    resolve(true);
                  });
                });
              } else {
                user = await authService.login();
              }

              if (user) {
                console.log(`\nWelcome, ${user.name}!`);
                await saveAuth(user.name, user.email, ''); // Key is optional
              } else {
                console.error('Login failed.');
              }
              readline.close();
            });
          });
        });
        break;

      case 'auth:switch':
        const email = args[1];
        if (!email) {
          console.log('Available Users:');
          await listUsers();
          console.log('\nUsage: themusketeer auth:switch <email>');
        } else {
          await switchUser(email);
        }
        break;

      case 'agent:start':
        const startName = args[1];
        if (!startName) {
          console.error('Error: Agent name is required.');
          process.exit(1);
        }
        await controlAgentLoop(startName, 'start');
        break;

      case 'agent:stop':
        const stopName = args[1];
        if (!stopName) {
          console.error('Error: Agent name is required.');
          process.exit(1);
        }
        await controlAgentLoop(stopName, 'stop');
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
  console.log(
    chalk.blue(`
 🤺 TheMusketeer
------------------
All for One, One for All.
`),
  );
  console.log(`
Usage: themusketeer <command> [args]

Core Commands:
  status                   Show current board status (Tasks & Agents)
  task:create <title> [p]  Create a new task (p=HIGH|MEDIUM|LOW)
  task:depends <id> <dep>  Add a dependency (Task <id> depends on <dep>)
  agent:spawn <name>       Spawn a new agent
  agent:start <name>       Start autonomous loop for agent
  agent:stop <name>        Stop autonomous loop for agent

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

  const tasks = (await tasksRes.json()) as any[];
  const agents = (await agentsRes.json()) as any[];

  console.log(chalk.bold.blue('\n--- TheMusketeer Kanban Board ---'));
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
  const data: any = await res.json();
  console.log(chalk.green('\n✔ Task Created Successfully:'));
  console.log(chalk.yellow(JSON.stringify(data, null, 2)));
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

async function spawnAgent(name: string, provider?: string, model?: string) {
  const res = await fetch(`${API_URL}/agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, provider, model }),
  });
  const data: any = await res.json();
  console.log(chalk.green('\n✔ Agent Spawned Successfully:'));
  console.log(chalk.cyan(JSON.stringify(data, null, 2)));
}

async function controlAgentLoop(name: string, action: 'start' | 'stop') {
  // 1. Find agent by name
  const agentsRes = await fetch(`${API_URL}/agents`);
  const agents = (await agentsRes.json()) as any[];
  const agent = agents.find((a: any) => a.name === name);

  if (!agent) {
    console.error(`Agent "${name}" not found. Spawn it first.`);
    process.exit(1);
  }

  // 2. Call Control Endpoint
  const res = await fetch(`${API_URL}/agents/${agent.id}/${action}`, {
    method: 'POST',
  });

  if (res.ok) {
    console.log(`Agent loop ${action}ed on server.`);
  } else {
    const err = await res.json();
    console.error(`Failed to ${action} agent loop:`, err);
  }
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
  const knowledgeRes = await fetch(`${API_URL}/memory/knowledge`);
  const knowledge = (await knowledgeRes.json()) as any;
  const logsRes = await fetch(`${API_URL}/memory/logs`);
  const logs = (await logsRes.json()) as any[];

  console.log(chalk.bold.blue('\n--- Durable Knowledge (MEMORY.md) ---'));
  console.log(chalk.cyan(knowledge.content || '(Empty)'));

  console.log(chalk.bold.blue('\n--- Recent Logs (Last 7 Days) ---'));
  logs.forEach((log: any) => {
    if (typeof log === 'string') {
      console.log(chalk.gray(log));
    } else {
      console.log(
        `${chalk.gray(log.timestamp)} [${chalk.magenta(log.agentId)}] ${log.content}`,
      );
    }
  });
}

function runLocalDemo() {
  console.log('Running Local Demo (In-Memory)...');
  console.log('Initial Board:');
  console.log(board.getTasks());

  console.log('Creating Task "Local Task"...');
  const t = board.createTask('Local Task');
  console.log(t);

  console.log('Spawning Agent "Local Agent"...');
  const a = board.spawnAgent('Local Agent', {
    provider: 'gemini-cli',
    model: 'default',
  });
  console.log(a);
}

async function saveAuth(name: string, email: string, key: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, key }),
  });

  if (res.ok) {
    console.log('Successfully logged in!');
    if (key) console.log('Gemini API Key saved.');
  } else {
    console.error('Failed to save credentials.');
  }
}

async function listUsers() {
  const res = await fetch(`${API_URL}/users`);
  const userRes = await fetch(`${API_URL}/user`);
  const users = (await res.json()) as any[];
  const activeUser = (await userRes.json()) as any;

  console.log(chalk.bold.blue('\n--- Identities ---'));
  users.forEach((u: any) => {
    const isCurrent = activeUser && u.email === activeUser.email;
    console.log(
      `${isCurrent ? chalk.blue('▶') : ' '} ${chalk.green(u.name)} (${chalk.gray(u.email)})`,
    );
  });
}

async function switchUser(email: string) {
  const res = await fetch(`${API_URL}/auth/switch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (res.ok) {
    console.log(`Switched to user: ${email}`);
  } else {
    console.error('Failed to switch user. Does it exist?');
  }
}

main();
