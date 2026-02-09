import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Link, Terminal, CheckCircle2, Zap, Clock, Archive, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { deleteTask, archiveTask } from '../api/client';

interface TaskDetailsModalProps {
    task: any;
    onClose: () => void;
}

export function TaskDetailsModal({ task, onClose }: TaskDetailsModalProps) {
    if (!task) return null;

    const isDone = task.status === 'DONE';
    const isInProgress = task.status === 'IN_PROGRESS' || task.status === 'AWAITING_INPUT';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
            <motion.div
                layoutId={task.id}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-[2rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]"
            >
                {/* Header */}
                <div className="p-8 border-b border-slate-800 flex justify-between items-start bg-slate-900/50">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${task.priority === 'HIGH' ? 'bg-red-500/20 text-red-400 border border-red-500/20' :
                                task.priority === 'LOW' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' :
                                    'bg-blue-500/20 text-blue-400 border border-blue-500/20'
                                }`}>
                                {task.priority} Priority
                            </span>
                            <span className="font-mono text-xs text-slate-500 font-bold">#{task.id.slice(0, 8)}</span>
                        </div>
                        <h2 className="text-2xl font-black text-white leading-tight">{task.title}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={async () => {
                                if (confirm('Are you sure you want to archive this mission?')) {
                                    await archiveTask(task.id);
                                    onClose();
                                }
                            }}
                            title="Archive Mission"
                            className="p-2 bg-slate-800 hover:bg-amber-900/40 rounded-xl text-slate-400 hover:text-amber-400 transition-colors"
                        >
                            <Archive size={20} />
                        </button>
                        <button
                            onClick={async () => {
                                if (confirm('Are you sure you want to permanently delete this mission?')) {
                                    await deleteTask(task.id);
                                    onClose();
                                }
                            }}
                            title="Delete Mission"
                            className="p-2 bg-slate-800 hover:bg-red-900/40 rounded-xl text-slate-400 hover:text-red-400 transition-colors"
                        >
                            <Trash2 size={20} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
                    {/* Status & Progress Section */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Zap size={14} /> Mission Status
                        </h3>

                        <div className={`p-6 rounded-2xl border ${isDone ? 'bg-emerald-900/10 border-emerald-900/30' :
                            isInProgress ? 'bg-blue-900/10 border-blue-900/30' :
                                'bg-slate-800/30 border-slate-700'
                            }`}>
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`w-3 h-3 rounded-full ${isDone ? 'bg-emerald-500' : isInProgress ? 'bg-blue-500 animate-pulse' : 'bg-slate-500'}`} />
                                <span className={`text-sm font-bold uppercase tracking-wider ${isDone ? 'text-emerald-400' : isInProgress ? 'text-blue-400' : 'text-slate-400'
                                    }`}>
                                    {task.status.replace('_', ' ')}
                                </span>
                            </div>

                            {/* Result for DONE */}
                            {isDone && task.result && (
                                <div className="mt-4">
                                    <div className="text-[10px] uppercase tracking-widest text-emerald-600 font-black mb-2">Final Result</div>
                                    <div className="text-emerald-200/90 leading-relaxed font-medium markdown-content text-sm">
                                        <ReactMarkdown>{task.result}</ReactMarkdown>
                                    </div>
                                </div>
                            )}

                            {/* Progress for IN_PROGRESS */}
                            {isInProgress && (
                                <div className="mt-4">
                                    <div className="text-[10px] uppercase tracking-widest text-blue-600 font-black mb-2">Current Progress</div>
                                    <p className="text-blue-200/90 leading-relaxed font-medium mb-2">
                                        {task.statusMessage || "Operative is currently engaging with the objective..."}
                                    </p>
                                    {task.progress && (
                                        <div className="mt-3 p-4 bg-blue-950/30 rounded-xl text-blue-200/80 text-sm border border-blue-900/30 markdown-content">
                                            <ReactMarkdown>{task.progress}</ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Artifacts Section */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                            <FileText size={14} /> Artifacts & Outputs
                        </h3>

                        {task.artifacts && task.artifacts.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {task.artifacts.map((artifact: any) => (
                                    <div
                                        key={artifact.id}
                                        className="p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl transition-all group flex items-start gap-4 cursor-pointer"
                                        onClick={() => artifact.type === 'link' ? window.open(artifact.uri, '_blank') : null}
                                    >
                                        <div className="p-3 bg-slate-900 rounded-lg text-slate-400 group-hover:text-blue-400 transition-colors">
                                            {artifact.type === 'link' ? <Link size={20} /> :
                                                artifact.type === 'command' ? <Terminal size={20} /> :
                                                    <FileText size={20} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-slate-200 group-hover:text-white mb-1 truncate">
                                                {artifact.title}
                                            </div>
                                            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider truncate">
                                                {artifact.uri}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-600">
                                <Clock size={32} className="mb-2 opacity-50" />
                                <span className="text-xs font-bold uppercase tracking-widest">No Artifacts Generated Yet</span>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
