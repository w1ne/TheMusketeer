import React, { useEffect, useState } from 'react';
import { Folder, File, RefreshCw, ExternalLink } from 'lucide-react';
import { fetchAgentFiles } from '../api/client';

interface WorkspaceExplorerProps {
    agentId: string;
}

export const WorkspaceExplorer: React.FC<WorkspaceExplorerProps> = ({ agentId }) => {
    const [files, setFiles] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const loadFiles = async () => {
        setIsLoading(true);
        try {
            const data = await fetchAgentFiles(agentId);
            setFiles(data);
        } catch (e) {
            console.error('Failed to fetch workspace files:', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadFiles();
    }, [agentId]);

    return (
        <div className="flex flex-col h-full bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-800/20">
                <div className="flex items-center gap-2">
                    <Folder size={14} className="text-blue-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Sandbox Explorer</span>
                </div>
                <button
                    onClick={loadFiles}
                    disabled={isLoading}
                    className="text-slate-500 hover:text-white transition-colors"
                >
                    <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
                {files.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 py-10">
                        <Folder size={32} className="mb-2" />
                        <p className="text-[10px] uppercase font-bold text-center">Empty Workspace</p>
                    </div>
                ) : (
                    files.map((file, i) => (
                        <div
                            key={i}
                            className="group flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-800/50 cursor-default transition-all border border-transparent hover:border-slate-700/50"
                        >
                            <File size={12} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
                            <span className="text-[11px] font-mono text-slate-400 group-hover:text-slate-200 truncate flex-1">{file}</span>
                            <ExternalLink size={10} className="text-slate-600 opacity-0 group-hover:opacity-100 cursor-pointer hover:text-white" />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
