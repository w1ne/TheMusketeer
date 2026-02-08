import React, { useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';

interface TerminalLogProps {
    logs: string[];
    agentName: string;
    activity?: string;
    onSendMessage?: (message: string) => void;
}

export const TerminalLog: React.FC<TerminalLogProps> = ({ logs, agentName, activity, onSendMessage }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [inputValue, setInputValue] = React.useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim() && onSendMessage) {
            onSendMessage(inputValue);
            setInputValue('');
        }
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    // Simple Markdown-ish parser for logs
    const renderLog = (log: string) => {
        // Very basic: handles headers (#), bold (**), and code (`)
        let content = log;

        // Headers
        if (content.startsWith('### ')) {
            return <h3 className="text-cyan-400 font-bold mt-2 text-sm">{content.replace('### ', '')}</h3>;
        }
        if (content.startsWith('#### ')) {
            return <h4 className="text-cyan-300/80 font-bold mt-1 text-xs">{content.replace('#### ', '')}</h4>;
        }
        if (content.startsWith('## ')) {
            return <h2 className="text-emerald-400 font-black mt-4 text-base tracking-tight">{content.replace('## ', '')}</h2>;
        }

        // Bold **text**
        const parts = content.split(/(\*\*.*?\*\*)/g);
        return (
            <p className="text-slate-300 text-[11px] leading-relaxed font-mono">
                {parts.map((part, i) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <span key={i} className="text-white font-bold">{part.slice(2, -2)}</span>;
                    }
                    if (part.startsWith('`') && part.endsWith('`')) {
                        return <code key={i} className="bg-slate-800 px-1 rounded text-orange-400">{part.slice(1, -1)}</code>;
                    }
                    return part;
                })}
            </p>
        );
    };

    return (
        <div className="flex flex-col h-full bg-slate-950/80 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl backdrop-blur-xl">
            {/* Terminal Header */}
            <div className="px-4 py-3 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Terminal size={14} className="text-cyan-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Agent Console: {agentName}</span>
                </div>
                <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                </div>
            </div>

            {/* Activity Bar */}
            {activity && (
                <div className="px-4 py-2 bg-cyan-500/5 border-b border-cyan-500/10 flex items-center gap-3">
                    <div className="relative w-2 h-2">
                        <div className="absolute inset-0 bg-cyan-500 rounded-full animate-ping opacity-75" />
                        <div className="relative w-2 h-2 bg-cyan-500 rounded-full" />
                    </div>
                    <span className="text-[10px] text-cyan-400 font-medium italic">Current Activity: {activity}</span>
                </div>
            )}

            {/* Log Content */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent"
            >
                {logs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 filter grayscale">
                        <Terminal size={48} className="mb-4 text-slate-500" />
                        <p className="text-xs font-mono">Establishing neural link...</p>
                    </div>
                ) : (
                    logs.map((log, i) => (
                        <div key={i} className="border-l border-slate-800 pl-3">
                            {renderLog(log)}
                        </div>
                    ))
                )}
            </div>

            {/* Command Input Area */}
            <div className="p-4 bg-slate-900/50 border-t border-slate-800">
                <form onSubmit={handleSubmit} className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500 font-black text-xs group-focus-within:animate-pulse">
                        &gt;
                    </div>
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Transmit instruction..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-[11px] font-mono text-cyan-50 focus:outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/5 transition-all placeholder:text-slate-700"
                    />
                </form>
            </div>
        </div>
    );
};
