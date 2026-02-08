import React from 'react';
import { AccountSwitcher } from './AccountSwitcher';
import { Sparkles } from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
    return (
        <div className="min-h-screen bg-background text-white flex flex-col">
            {/* Navbar */}
            <header className="h-24 border-b border-slate-800 flex items-center justify-between px-10 bg-slate-900/90 backdrop-blur-xl relative z-50 shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]">
                        <Sparkles className="animate-pulse" size={20} />
                    </div>
                    <h1 className="text-2xl font-black tracking-tighter text-white uppercase italic">
                        The Musketeer
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    <AccountSwitcher />
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden relative">
                {children}
            </main>
        </div>
    );
}
