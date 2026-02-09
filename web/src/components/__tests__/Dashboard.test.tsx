
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Dashboard } from '../Dashboard';
import * as api from '../../api/client';
import { GoogleAccountProvider } from '../../contexts/GoogleAccountContext';
import { vi } from 'vitest';

// Mock API
vi.mock('../../api/client', () => ({
    fetchTasks: vi.fn(),
    fetchAgents: vi.fn(),
    fetchModels: vi.fn(),
    createTask: vi.fn(),
    spawnAgent: vi.fn(),
    archiveTask: vi.fn(),
    deleteTask: vi.fn(),
}));

// Simple mock for context if needed, or wrap in provider
vi.mock('../../contexts/GoogleAccountContext', () => ({
    useGoogleAccount: () => ({ user: { name: 'Test User' }, activeEmail: 'test@example.com' }),
    GoogleAccountProvider: ({ children }: any) => <div>{children}</div>
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('Dashboard Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (api.fetchTasks as any).mockResolvedValue([]);
        (api.fetchAgents as any).mockResolvedValue([]);
        (api.fetchModels as any).mockResolvedValue([]);
    });

    it('renders Mission Control and Neural Swarm headers', async () => {
        render(<Dashboard />);
        expect(screen.getByText(/Mission Control/i)).toBeInTheDocument();
        expect(screen.getByText(/Neural Swarm/i)).toBeInTheDocument();
    });

    it('displays tasks in correct columns', async () => {
        const mockTasks = [
            { id: '1', title: 'Task 1', status: 'TODO', priority: 'MEDIUM' },
            { id: '2', title: 'Task 2', status: 'IN_PROGRESS', priority: 'HIGH' },
            { id: '3', title: 'Task 3', status: 'DONE', priority: 'LOW' },
        ];
        (api.fetchTasks as any).mockResolvedValue(mockTasks);

        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByText('Task 1')).toBeInTheDocument();
            expect(screen.getByText('Task 2')).toBeInTheDocument();
            expect(screen.getByText('Task 3')).toBeInTheDocument();
        });
    });

    it('opens New Mission modal and creates a task', async () => {
        render(<Dashboard />);

        const newMissionBtn = screen.getByText(/New Mission/i);
        fireEvent.click(newMissionBtn);

        expect(screen.getByText(/Target Objective/i)).toBeInTheDocument();

        const input = screen.getByPlaceholderText(/Brief operative on the mission/i);
        fireEvent.change(input, { target: { value: 'New Test Task' } });

        const submitBtn = screen.getByText(/Authorize Deployment/i);
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(api.createTask).toHaveBeenCalledWith('New Test Task', 'MEDIUM');
        });
    });

    it('handles multi-selection and batch operations', async () => {
        const mockTasks = [
            { id: '1', title: 'Task 1', status: 'TODO', priority: 'MEDIUM' },
            { id: '2', title: 'Task 2', status: 'TODO', priority: 'HIGH' },
        ];
        (api.fetchTasks as any).mockResolvedValue(mockTasks);
        (api.deleteTask as any).mockResolvedValue({ success: true });

        // Mock window.confirm
        const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);

        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByText('Task 1')).toBeInTheDocument();
        });

        // Toggle "Select All" in TODO column
        // Note: The button is identified by title or icon, but let's use the container since it's unique enough
        const selectAllBtns = screen.getAllByTitle(/Select All in Column/i);
        fireEvent.click(selectAllBtns[0]); // TODO column

        // Check if toolbar appeared
        expect(screen.getByText(/Tasks Selected/i)).toBeInTheDocument();
        const selectedCount = screen.getByTestId('selected-count');
        expect(selectedCount).toHaveTextContent('2');

        // Perform batch delete
        const deleteAllBtn = screen.getByText(/Delete All/i);
        fireEvent.click(deleteAllBtn);

        await waitFor(() => {
            expect(confirmSpy).toHaveBeenCalled();
            expect(api.deleteTask).toHaveBeenCalledTimes(2);
            expect(api.deleteTask).toHaveBeenCalledWith('1');
            expect(api.deleteTask).toHaveBeenCalledWith('2');
        });

        confirmSpy.mockRestore();
    });
});
