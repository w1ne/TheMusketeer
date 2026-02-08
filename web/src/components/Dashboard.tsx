import React, { useEffect, useState } from 'react';
import { fetchTasks, fetchAgents, createTask, spawnAgent } from '../api/client';
import { AgentSurface } from './AgentSurface';
import { Plus, LayoutGrid, List, X, Loader2, Terminal } from 'lucide-react';
import { useGoogleAccount } from '../contexts/GoogleAccountContext';
import { motion, AnimatePresence } from 'framer-motion';

export function Dashboard() {
    const { currentUser } = useGoogleAccount();
    const [tasks, setTasks] = useState<any[]>([]);
    const [agents, setAgents] = useState<any[]>([]);
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Form states
    const [taskTitle, setTaskTitle] = useState("");
    const [taskPriority, setTaskPriority] = useState("MEDIUM");
    const [agentName, setAgentName] = useState("");

    // Polling for data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [t, a] = await Promise.all([fetchTasks(), fetchAgents()]);
                setTasks(t);
                setAgents(a);
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
            setTaskTitle("");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSpawnAgent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!agentName) return;
        setIsLoading(true);
        try {
            await spawnAgent(agentName);
            setIsAgentModalOpen(false);
            setAgentName("");
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
                className="flex-1 flex flex-col border-r border-slate-800 min-w-[350px] max-w-xl bg-slate-900/80 backdrop-blur-xl p-6 gap-6"
            >
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-black flex items-center gap-3 tracking-tighter text-white">
                        <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-900/20">
                            <List size={20} />
                        </div>
                        Mission Control
                    </h2>
                    <button
                        onClick={() => setIsTaskModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-xl text-sm font-bold text-white hover:bg-blue-500 shadow-xl shadow-blue-900/40 transition-all active:scale-95"
                    >
                        <Plus size={18} /> New Mission
                    </button>
                </div>

                <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                    <AnimatePresence>
                        {tasks.map((task, idx) => (
                            <motion.div
                                key={task.id}
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700 hover:border-blue-500 hover:bg-slate-800 transition-all cursor-pointer group relative overflow-hidden"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest ${task.priority === 'HIGH' ? 'bg-red-600 text-white' :
                                        task.priority === 'LOW' ? 'bg-emerald-600 text-white' :
                                            'bg-blue-600 text-white'
                                        }`}>
                                        {task.priority}
                                    </span>
                                    <span className="text-slate-400 text-[10px] font-mono font-bold tracking-widest">#{task.id.slice(0, 6)}</span>
                                </div>
                                <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors leading-tight">{task.title}</h3>
                                <div className="mt-4 text-xs font-bold text-slate-300 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${task.status === 'DONE' ? 'bg-emerald-400' : 'bg-blue-400'} shadow-sm`} />
                                        <span className="uppercase tracking-wider">{task.status.replace('_', ' ')}</span>
                                    </div>
                                    {task.assignedAgentId && (
                                        <span className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-300 border border-slate-600 uppercase text-[9px] tracking-widest">Assigned</span>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Welcome Info */}
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
                            <div className="text-[10px] text-slate-500 font-black tracking-[0.2em] uppercase mb-6">OP_ID: {agent.id.slice(0, 8)}</div>
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] px-3 py-1 rounded-lg font-black uppercase tracking-widest ${agent.status === 'WORKING' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-300'
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
                                    {isLoading ? <Loader2 className="animate-spin" /> : "Authorize Deployment"}
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
                                <button
                                    disabled={isLoading}
                                    className="w-full py-5 bg-white rounded-2xl font-black text-base uppercase tracking-[0.2em] text-slate-950 hover:bg-slate-200 transition-all flex items-center justify-center gap-4 active:scale-[0.98] shadow-2xl"
                                >
                                    {isLoading ? <Loader2 className="animate-spin text-slate-950" /> : "Initialize Operative"}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
