const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';

export async function fetchTasks() {
  const res = await fetch(`${API_URL}/tasks`);
  return res.json();
}

export async function fetchAgents() {
  const res = await fetch(`${API_URL}/agents`);
  return res.json();
}

export async function fetchModels() {
  const res = await fetch(`${API_URL}/models`);
  return res.json();
}

export async function fetchProviders() {
  const res = await fetch(`${API_URL}/providers`);
  return res.json();
}

export async function fetchUsage() {
  const res = await fetch(`${API_URL}/usage`);
  return res.json();
}

export async function createTask(title: string, priority: string) {
  const res = await fetch(`${API_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, priority }),
  });
  return res.json();
}

export async function deleteTask(id: string) {
  const res = await fetch(`${API_URL}/tasks/${id}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function archiveTask(id: string) {
  const res = await fetch(`${API_URL}/tasks/${id}/archive`, {
    method: 'PATCH',
  });
  return res.json();
}

export async function spawnAgent(
  name: string,
  provider: string = 'gemini',
  model: string = 'auto',
) {
  const res = await fetch(`${API_URL}/agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, provider, model }),
  });
  return res.json();
}

export async function updateAgent(id: string, updates: any) {
  const res = await fetch(`${API_URL}/agents/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return res.json();
}

export async function deleteAgent(id: string) {
  const res = await fetch(`${API_URL}/agents/${id}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function startAgent(id: string) {
  const res = await fetch(`${API_URL}/agents/${id}/start`, { method: 'POST' });
  return res.json();
}

export async function stopAgent(id: string) {
  const res = await fetch(`${API_URL}/agents/${id}/stop`, { method: 'POST' });
  return res.json();
}

export async function fetchLogs() {
  const res = await fetch(`${API_URL}/memory/logs`);
  return res.json();
}

export async function fetchUser() {
  const res = await fetch(`${API_URL}/user`);
  return res.json();
}

export async function fetchUsers() {
  const res = await fetch(`${API_URL}/users`);
  return res.json();
}

export async function switchUser(email: string) {
  await fetch(`${API_URL}/auth/switch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
}

export async function sendAgentInput(id: string, input: string) {
  const res = await fetch(`${API_URL}/agents/${id}/input`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
  });
  return res.json();
}

export async function fetchAgentFiles(id: string) {
  const res = await fetch(`${API_URL}/agents/${id}/files`);
  return res.json();
}
