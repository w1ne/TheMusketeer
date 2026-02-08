import React, { useEffect, useState, useRef } from 'react';
import { Terminal, Play, Square, Cpu, Activity } from 'lucide-react';
import { fetchLogs, startAgent, stopAgent } from '../api/client';

interface AgentSurfaceProps {
    agentId: string | null; // If null, maybe show "Select Agent"
    agentName: string;
    status: string;
    currentTask?: string;
    onClose?: () => void;
}

import { motion, AnimatePresence } from 'framer-motion';

export function AgentSurface({ agentId, agentName, status, currentTask }: AgentSurfaceProps) {
    const [logs, setLogs] = useState<any[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Poll for logs
    useEffect(() => {
        if (!agentId) return;

        const interval = setInterval(async () => {
            try {
                const allLogs = await fetchLogs();
                // Filter logs for this agent if the API returns objects, 
                // but handle both string and object formats for robustness.
                const agentLogs = allLogs.filter((l: any) => {
                    if (typeof l === 'string') return l.includes(agentId);
                    return l.agentId === agentId;
                });
                setLogs(agentLogs);
            } catch (e) {
                console.error(e);
            }
        }, 1500);

        return () => clearInterval(interval);
    }, [agentId]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [logs]);

    const handleStart = async () => {
        if (agentId) await startAgent(agentId);
    };

    const handleStop = async () => {
        if (agentId) await stopAgent(agentId);
    };

    return (
        <div className="h-full flex flex-col bg-slate-900 rounded-[2.5rem] overflow-hidden border-2 border-slate-800 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 bg-slate-800/50 border-b border-slate-700">
                <div className="flex items-center gap-5">
                    <div className="p-3 bg-blue-600 rounded-[1.25rem] text-white shadow-lg shadow-blue-900/20">
                        <Activity size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black tracking-tight text-white uppercase italic">{agentName}</h2>
                        <div className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-[0.2em] mt-1">
                            <span className={`w-3 h-3 rounded-full border-2 border-slate-900 ${status === 'WORKING' ? 'bg-emerald-400 shadow-[0_0_10px_#4ade80] animate-pulse' : 'bg-slate-600'}`} />
                            <span className={status === 'WORKING' ? 'text-emerald-400' : 'text-slate-500'}>
                                {status || 'OFFLINE'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={handleStart}
                        disabled={status === 'WORKING'}
                        className="p-4 bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/20 hover:border-emerald-400 rounded-2xl disabled:opacity-10 transition-all text-emerald-400 hover:text-slate-950 group active:scale-95 shadow-xl"
                        title="Initiate Neural Loop"
                    >
                        <Play size={22} fill="currentColor" className="group-hover:scale-110 transition-transform" />
                    </button>
                    <button
                        onClick={handleStop}
                        disabled={status !== 'WORKING'}
                        className="p-4 bg-red-500/10 hover:bg-red-500 border border-red-500/20 hover:border-red-400 rounded-2xl disabled:opacity-10 transition-all text-red-400 hover:text-white group active:scale-95 shadow-xl"
                        title="Terminate Loop"
                    >
                        <Square size={22} fill="currentColor" className="group-hover:scale-110 transition-transform" />
                    </button>
                </div>
            </div>

            {/* Task Mission Banner */}
            <AnimatePresence>
                {currentTask && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="px-8 py-3 bg-blue-600 border-b border-blue-500 flex items-center gap-4 overflow-hidden"
                    >
                        <span className="text-xs font-black text-white uppercase tracking-[0.3em] shrink-0 italic">Mission Directive:</span>
                        <span className="text-sm font-bold text-blue-50 truncate">{currentTask}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* High-Contrast Terminal */}
            <div className="flex-1 p-8 bg-[#020617] font-mono text-[14px] overflow-y-auto custom-scrollbar" ref={scrollRef}>
                {logs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-800">
                        <Terminal size={48} className="mb-4 opacity-50" />
                        <div className="text-xs uppercase tracking-[0.4em] font-black opacity-50">Awaiting Telemetry Stream...</div>
                    </div>
                ) : (
                    logs.map((log, i) => (
                        <motion.div
                            key={i}
                            initial={{ x: -10, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="mb-3 flex gap-6 group"
                        >
                            <span className="text-slate-600 select-none shrink-0 font-bold tracking-tighter w-20">
                                {typeof log === 'string' ? log.split(']')[0].replace('[', '') : new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                            </span>
                            <span className="text-slate-100 leading-relaxed font-bold break-words flex-1">
                                {typeof log === 'string' ? log.split(']').slice(1).join(']') : log.content}
                            </span>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Enhanced Footer */}
            <div className="px-8 py-3 text-[10px] font-black text-center text-slate-500 bg-slate-900 border-t border-slate-800 uppercase tracking-[0.4em]">
                Musketeer Protocol v1.4.2 • Swarm Linked
            </div>
        </div>
    );
}
