import { MemoryStore } from '../../src/core/MemoryStore';
import fs from 'fs';
import path from 'path';

const TEST_DIR = 'data/test_memory';

describe('MemoryStore', () => {
  let memory: MemoryStore;

  beforeEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    memory = new MemoryStore(TEST_DIR);
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('should initialize directories', () => {
    expect(fs.existsSync(path.join(TEST_DIR, 'logs'))).toBe(true);
  });

  it('should add to durable knowledge (MEMORY.md)', async () => {
    await memory.addKnowledge('The sky is blue.');
    const content = await memory.getKnowledge();
    expect(content).toContain('The sky is blue.');
  });

  it('should add to ephemeral logs (YYYY-MM-DD.md)', async () => {
    await memory.addLog('User login successful', 'Agent-007');

    const logs = await memory.getRecentLogs(1);
    expect(logs.length).toBe(1);
    expect(logs[0]).toContain('User login successful');
    expect(logs[0]).toContain('Agent-007');
  });
});
