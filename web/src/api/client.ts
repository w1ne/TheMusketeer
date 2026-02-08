const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';

export async function fetchTasks() {
  const res = await fetch(`${API_URL}/tasks`);
  return res.json();
}

export async function fetchAgents() {
  const res = await fetch(`${API_URL}/agents`);
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

export async function spawnAgent(name: string) {
  const res = await fetch(`${API_URL}/agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
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
