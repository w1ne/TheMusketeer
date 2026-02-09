import React, { useEffect, useState } from 'react';
import { fetchTasks, fetchAgents, createTask, spawnAgent, fetchModels } from '../api/client';
import { AgentSurface } from './AgentSurface';
import { TaskDetailsModal } from './TaskDetailsModal';
import { Plus, LayoutGrid, List, X, Loader2, Terminal } from 'lucide-react';
import { useGoogleAccount } from '../contexts/GoogleAccountContext';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

export function Dashboard() {
    useGoogleAccount();
    const [tasks, setTasks] = useState<any[]>([]);
    const [agents, setAgents] = useState<any[]>([]);
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Form states
    const [taskTitle, setTaskTitle] = useState('');
    const [taskPriority, setTaskPriority] = useState('MEDIUM');
    const [agentName, setAgentName] = useState('');
    const [agentModel, setAgentModel] = useState('auto');
    const [availableModels, setAvailableModels] = useState<any[]>([]);

    // Polling for data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [t, a, m] = await Promise.all([fetchTasks(), fetchAgents(), fetchModels()]);
                setTasks(t);
                setAgents(a);
                setAvailableModels(m);
            } catch (e) { console.error(e); }
        };

        fetchData();
        const interval = setInterval(fetchData, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskTitle) return;
        setIsLoading(true);
        try {
            await createTask(taskTitle, taskPriority);
            setIsTaskModalOpen(false);
            setTaskTitle('');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSpawnAgent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!agentName) return;
        setIsLoading(true);
        try {
            await spawnAgent(agentName, 'gemini', agentModel);
            setIsAgentModalOpen(false);
            setAgentName('');
            setAgentModel('auto');
        } finally {
            setIsLoading(false);
        }
    };

    const selectedAgent = agents.find(a => a.id === selectedAgentId);

    return (
        <div className="h-full flex overflow-hidden bg-[#020617] text-slate-100">
            {/* Left: Mission Control */}
            <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="flex-[2] flex flex-col border-r border-slate-800 bg-slate-900/80 backdrop-blur-xl p-8 gap-8"
            >
                <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-black flex items-center gap-4 tracking-tighter text-white">
                        <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-900/20">
                            <List size={24} />
                        </div>
                        Mission Control
                    </h2>
                    <button
                        onClick={() => setIsTaskModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 rounded-2xl text-sm font-bold text-white hover:bg-blue-500 shadow-xl shadow-blue-900/40 transition-all active:scale-95"
                    >
                        <Plus size={20} /> New Mission
                    </button>
                </div>

                <div className="flex-1 min-h-0 grid grid-cols-3 gap-4 overflow-hidden">
                    {/* TODO Column */}
                    <div className="flex flex-col gap-4 min-h-0 bg-slate-900/50 p-4 rounded-3xl border border-slate-800">
                        <h4 className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-2 px-2">
                            <div className="w-2 h-2 rounded-full bg-slate-500" />
                            To Do
                            <span className="ml-auto bg-slate-800 text-white px-2 py-0.5 rounded-md">{tasks.filter(t => t.status === 'TODO' && t.status !== 'ARCHIVED').length}</span>
                        </h4>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                            {tasks.filter(t => t.status === 'TODO' && t.status !== 'ARCHIVED').map(task => (
                                <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
                            ))}
                        </div>
                    </div>

                    {/* IN PROGRESS Column */}
                    <div className="flex flex-col gap-4 min-h-0 bg-blue-900/10 p-4 rounded-3xl border border-blue-900/30">
                        <h4 className="flex items-center gap-2 text-xs font-black text-blue-400 uppercase tracking-[0.2em] mb-2 px-2">
                            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                            In Progress
                            <span className="ml-auto bg-blue-900/50 text-blue-200 px-2 py-0.5 rounded-md">{tasks.filter(t => (t.status === 'IN_PROGRESS' || t.status === 'AWAITING_INPUT') && t.status !== 'ARCHIVED').length}</span>
                        </h4>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                            {tasks.filter(t => (t.status === 'IN_PROGRESS' || t.status === 'AWAITING_INPUT') && t.status !== 'ARCHIVED').map(task => (
                                <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
                            ))}
                        </div>
                    </div>

                    {/* DONE Column */}
                    <div className="flex flex-col gap-4 min-h-0 bg-emerald-900/10 p-4 rounded-3xl border border-emerald-900/30">
                        <h4 className="flex items-center gap-2 text-xs font-black text-emerald-400 uppercase tracking-[0.2em] mb-2 px-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-400" />
                            Done
                            <span className="ml-auto bg-emerald-900/50 text-emerald-200 px-2 py-0.5 rounded-md">{tasks.filter(t => t.status === 'DONE' && t.status !== 'ARCHIVED').length}</span>
                        </h4>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                            {tasks.filter(t => t.status === 'DONE' && t.status !== 'ARCHIVED').map(task => (
                                <TaskCard key={task.id} task={task} showResult onClick={() => setSelectedTask(task)} />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-auto p-5 rounded-3xl bg-slate-800/80 border border-slate-700 shadow-inner">
                    <h3 className="text-lg font-black text-white">Musketeer Command</h3>
                    <p className="text-xs font-medium text-slate-400 mt-2 leading-relaxed">
                        Currently monitoring <span className="text-white font-bold">{agents.length}</span> active operatives. Synchronized with the Swarm Core.
                    </p>
                </div>
            </motion.div>

            {/* Right: Neural Swarm */}
            <div className="flex-1 flex flex-col p-8 bg-[#020617] relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.08),transparent)] pointer-events-none" />

                <div className="flex justify-between items-center mb-10 relative z-10">
                    <h2 className="text-4xl font-black flex items-center gap-5 tracking-tighter text-white">
                        <div className="p-3 bg-slate-800 rounded-2xl text-white border border-slate-700">
                            <LayoutGrid size={28} />
                        </div>
                        Neural Swarm
                    </h2>
                    <button
                        onClick={() => setIsAgentModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-800 border-2 border-slate-700 rounded-2xl text-sm font-black text-white hover:bg-slate-700 hover:border-slate-600 transition-all active:scale-95 shadow-2xl uppercase tracking-widest"
                    >
                        <Plus size={18} /> Deploy Operative
                    </button>
                </div>

                {/* Operative Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 mb-8 relative z-10">
                    {agents.map(agent => (
                        <motion.button
                            key={agent.id}
                            whileHover={{ y: -4, scale: 1.02 }}
                            onClick={() => setSelectedAgentId(agent.id)}
                            className={`p-6 rounded-[2rem] border-2 text-left transition-all relative overflow-hidden ${selectedAgentId === agent.id
                                ? 'bg-slate-800 border-blue-500 shadow-[0_20px_40px_rgba(37,99,235,0.2)]'
                                : 'bg-slate-900 border-slate-800 hover:border-slate-600 shadow-xl'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="font-black text-xl tracking-tighter text-white truncate pr-4 uppercase">{agent.name}</div>
                                <div className={`w-4 h-4 rounded-full border-2 border-slate-950 ${agent.status === 'WORKING' ? 'bg-emerald-400 shadow-[0_0_15px_#4ade80] animate-pulse' : 'bg-slate-600'}`} />
                            </div>
                            <div className="text-[10px] text-slate-500 font-black tracking-[0.2em] uppercase mb-4">OP_ID: {agent.id.slice(0, 8)}</div>
                            <div className="mb-4 min-h-[1.5rem]">
                                {agent.currentActivity && (
                                    <span className="text-[10px] text-cyan-400/80 font-medium italic animate-pulse">
                                        {agent.currentActivity}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] px-3 py-1 rounded-lg font-black uppercase tracking-widest ${agent.status === 'WORKING' ? 'bg-emerald-500 text-slate-950' :
                                    agent.status === 'PAUSED' ? 'bg-amber-500 text-slate-950' :
                                        'bg-slate-700 text-slate-300'
                                    }`}>
                                    {agent.status}
                                </span>
                            </div>
                        </motion.button>
                    ))}
                </div>

                {/* Surface Interface */}
                <div className="flex-1 min-h-0 relative z-10">
                    <AnimatePresence mode="wait">
                        {selectedAgent ? (
                            <motion.div
                                key={selectedAgent.id}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                transition={{ duration: 0.2 }}
                                className="h-full"
                            >
                                <AgentSurface
                                    agentId={selectedAgent.id}
                                    agentName={selectedAgent.name}
                                    status={selectedAgent.status}
                                    activity={selectedAgent.currentActivity}
                                    currentTask={tasks.find((t: any) => t.id === selectedAgent.currentTaskId)?.title}
                                />
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="h-full flex flex-col items-center justify-center border-4 border-dotted border-slate-800 rounded-[2.5rem] bg-slate-900/40 backdrop-blur-sm"
                            >
                                <div className="p-8 bg-slate-800 rounded-full mb-6 text-slate-600 border border-slate-700 shadow-xl">
                                    <Terminal size={56} />
                                </div>
                                <h3 className="text-2xl font-black text-white tracking-tight">Neural Uplink Offline</h3>
                                <p className="text-slate-500 mt-2 font-bold uppercase text-xs tracking-widest">Select an operative to establish connection</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Modals - High Contrast */}
            <AnimatePresence>
                {isTaskModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-lg p-10 rounded-[2.5rem] bg-slate-900 border-2 border-slate-700 shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-3xl font-black tracking-tighter text-white uppercase">New Mission</h3>
                                <button onClick={() => setIsTaskModalOpen(false)} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
                            </div>
                            <form onSubmit={handleCreateTask} className="space-y-8">
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-3">Target Objective</label>
                                    <input
                                        autoFocus
                                        value={taskTitle}
                                        onChange={e => setTaskTitle(e.target.value)}
                                        className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-5 text-lg text-white font-bold focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-700"
                                        placeholder="Brief operative on the mission..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-3">Priority Level</label>
                                    <div className="grid grid-cols-3 gap-4">
                                        {['LOW', 'MEDIUM', 'HIGH'].map(p => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setTaskPriority(p)}
                                                className={`py-4 rounded-2xl text-xs font-black border-2 transition-all uppercase tracking-widest ${taskPriority === p
                                                    ? 'bg-blue-600 border-blue-500 text-white shadow-xl shadow-blue-900/30'
                                                    : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'
                                                    }`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <button
                                    disabled={isLoading}
                                    className="w-full py-5 bg-blue-600 rounded-2xl font-black text-base uppercase tracking-[0.2em] text-white hover:bg-blue-500 transition-all flex items-center justify-center gap-4 active:scale-[0.98] shadow-2xl shadow-blue-900/40"
                                >
                                    {isLoading ? <Loader2 className="animate-spin" /> : 'Authorize Deployment'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}

                {isAgentModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-lg p-10 rounded-[2.5rem] bg-slate-900 border-2 border-slate-700 shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-3xl font-black tracking-tighter text-white uppercase">Summon Musketeer</h3>
                                <button onClick={() => setIsAgentModalOpen(false)} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
                            </div>
                            <form onSubmit={handleSpawnAgent} className="space-y-8">
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-3">Callsign</label>
                                    <input
                                        autoFocus
                                        value={agentName}
                                        onChange={e => setAgentName(e.target.value)}
                                        className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-5 text-lg text-white font-bold focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 outline-none transition-all placeholder:text-slate-700 uppercase"
                                        placeholder="e.g. D'ARTAGNAN, ATHOS..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-3">Model Protocol</label>
                                    <select
                                        value={agentModel}
                                        onChange={e => setAgentModel(e.target.value)}
                                        className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-5 text-base text-white font-bold focus:border-slate-400 outline-none transition-all appearance-none cursor-pointer"
                                    >
                                        {availableModels.map(m => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    disabled={isLoading}
                                    className="w-full py-5 bg-white rounded-2xl font-black text-base uppercase tracking-[0.2em] text-slate-950 hover:bg-slate-200 transition-all flex items-center justify-center gap-4 active:scale-[0.98] shadow-2xl"
                                >
                                    {isLoading ? <Loader2 className="animate-spin text-slate-950" /> : 'Initialize Operative'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {selectedTask && (
                    <TaskDetailsModal task={selectedTask} onClose={() => setSelectedTask(null)} />
                )}
            </AnimatePresence>
        </div>
    );
}

function TaskCard({ task, showResult, onClick }: { task: any, showResult?: boolean, onClick?: () => void }) {
    return (
        <motion.div
            layoutId={task.id}
            onClick={onClick}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden flex flex-col gap-3 ${task.status === 'DONE'
                ? 'bg-emerald-900/20 border-emerald-900/50 hover:border-emerald-500/50'
                : task.status === 'IN_PROGRESS'
                    ? 'bg-blue-900/20 border-blue-900/50 hover:border-blue-500/50'
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'
                }`}
        >
            <div className="flex justify-between items-start">
                <span className={`text-[9px] px-2 py-0.5 rounded-md font-black uppercase tracking-wider ${task.priority === 'HIGH' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                    task.priority === 'LOW' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}>
                    {task.priority}
                </span>
                {task.assignedAgentId && (
                    <span className="text-[9px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                        OP:{task.assignedAgentId.slice(0, 4)}
                    </span>
                )}
            </div>

            <h3 className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors leading-snug">
                {task.title}
            </h3>

            {task.statusMessage && task.status !== 'DONE' && (
                <div className="text-[10px] text-slate-400 italic bg-slate-950/30 p-2 rounded-lg border border-slate-800/50">
                    "{task.statusMessage}"
                </div>
            )}

            {showResult && task.result && (
                <div className="mt-1 text-[10px] bg-emerald-950/40 p-3 rounded-xl border border-emerald-900/50 text-emerald-200/80 font-mono markdown-content">
                    <div className="text-[9px] uppercase tracking-widest text-emerald-500 font-black mb-1">Result</div>
                    <ReactMarkdown>{task.result}</ReactMarkdown>
                </div>
            )}
        </motion.div>
    );
}
