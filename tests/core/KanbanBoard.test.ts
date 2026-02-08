import { KanbanBoard } from '../../src/core/KanbanBoard';

describe('KanbanBoard', () => {
  let board: KanbanBoard;

  beforeEach(() => {
    board = new KanbanBoard();
  });

  it('should create a task with default priority', () => {
    const task = board.createTask('Test Task');
    expect(task.title).toBe('Test Task');
    expect(task.status).toBe('TODO');
    expect(task.priority).toBe('MEDIUM');
    expect(board.getTasks()).toContainEqual(task);
  });

  it('should create a task with HIGH priority', () => {
    const task = board.createTask('Important', 'HIGH');
    expect(task.priority).toBe('HIGH');
  });

  it('should spawn an agent', () => {
    const agent = board.spawnAgent('Test Agent');
    expect(agent.name).toBe('Test Agent');
    expect(agent.status).toBe('IDLE');
    expect(board.getAgents()).toContainEqual(agent);
  });

  it('should assign a task to an idle agent', () => {
    const task = board.createTask('Task 1');
    const agent = board.spawnAgent('Agent 1');

    const result = board.assignTask(task.id, agent.id);
    expect(result).toBe(true);

    expect(board.getTask(task.id)?.status).toBe('IN_PROGRESS');
    expect(board.getAgent(agent.id)?.status).toBe('WORKING');
  });

  it('should NOT assign a task if dependencies are not done', () => {
    const taskA = board.createTask('Task A (Blocker)');
    const taskB = board.createTask('Task B (Blocked)');
    const agent = board.spawnAgent('Worker');

    board.addDependency(taskB.id, taskA.id);

    // Try assigning B (should fail)
    console.error(
      `Attempt 1: Assigning Task B (${taskB.id}) depends on A (${taskA.id})`,
    );
    expect(board.assignTask(taskB.id, agent.id)).toBe(false);

    // Finish A
    console.error('Updating Task A to DONE');
    board.updateTaskStatus(taskA.id, 'DONE');

    const debugA = board.getTask(taskA.id);
    console.error(`Task A status is now: ${debugA?.status}`);

    // Now B should be assignable
    console.error('Attempt 2: Assigning Task B');
    const result = board.assignTask(taskB.id, agent.id);
    console.error(`Result: ${result}`);

    if (!result) {
      const debugB = board.getTask(taskB.id);
      const debugAgent = board.getAgent(agent.id);
      console.error(
        `DEBUG FAIL: TaskB Status=${debugB?.status}, AgentStatus=${debugAgent?.status}`,
      );
      console.error(
        `TaskB Dependencies: ${JSON.stringify(debugB?.dependencies)}`,
      );
    }

    expect(result).toBe(true);
  });

  it('should auto-assign HIGH priority tasks first', () => {
    const low = board.createTask('Low Priority', 'LOW');
    const high = board.createTask('High Priority', 'HIGH');
    const agent = board.spawnAgent('Star Performer');

    const nextTask = board.assignNextTask(agent.id);
    expect(nextTask?.id).toBe(high.id);
  });
});
