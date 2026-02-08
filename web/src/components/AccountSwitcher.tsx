import React, { useState } from 'react';
import { useGoogleAccount } from '../contexts/GoogleAccountContext';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function AccountSwitcher() {
    const { currentUser, accounts, switchAccount } = useGoogleAccount();
    const [isOpen, setIsOpen] = useState(false);

    // Fallback avatar
    const avatarUrl = currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=random`;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    'flex items-center gap-3 p-1.5 pr-4 rounded-2xl transition-all border-2',
                    isOpen
                        ? 'bg-slate-800 border-blue-500 shadow-lg'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800'
                )}
            >
                <div className="relative">
                    <img
                        src={avatarUrl}
                        alt={currentUser.name}
                        className="w-8 h-8 rounded-xl object-cover border border-slate-700"
                    />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full shadow-[0_0_10px_#10b981]" />
                </div>
                <div className="hidden md:block text-left">
                    <div className="text-xs font-black text-white uppercase tracking-tight leading-none">{currentUser.name}</div>
                    <div className="text-[10px] text-slate-500 font-bold tracking-tight mt-0.5">{currentUser.email}</div>
                </div>
                <ChevronDown size={14} className={cn('text-slate-500 transition-transform duration-200', isOpen && 'rotate-180')} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Overlay to catch clicks outside */}
                        <div
                            className="fixed inset-0 z-40 cursor-default"
                            onClick={() => setIsOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute right-0 mt-3 w-72 bg-slate-900 border-2 border-slate-800 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden"
                        >
                            <div className="p-3 space-y-1.5">
                                <div className="px-3 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 mb-2">
                                    Switch Operative
                                </div>
                                {accounts.map(account => (
                                    <button
                                        key={account.email}
                                        onClick={() => {
                                            switchAccount(account.email);
                                            setIsOpen(false);
                                        }}
                                        className={cn(
                                            'w-full flex items-center gap-4 p-3 rounded-2xl transition-all text-left group',
                                            currentUser.email === account.email
                                                ? 'bg-blue-600 shadow-xl shadow-blue-900/20'
                                                : 'hover:bg-slate-800'
                                        )}
                                    >
                                        <img
                                            src={account.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(account.name)}&background=random`}
                                            alt={account.name}
                                            className="w-10 h-10 rounded-xl border border-white/10"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className={cn(
                                                'text-sm font-black uppercase tracking-tight truncate',
                                                currentUser.email === account.email ? 'text-white' : 'text-slate-100 group-hover:text-blue-400'
                                            )}>
                                                {account.name}
                                            </div>
                                            <div className={cn(
                                                'text-[10px] font-bold truncate',
                                                currentUser.email === account.email ? 'text-blue-100' : 'text-slate-500'
                                            )}>
                                                {account.email}
                                            </div>
                                        </div>
                                        {currentUser.email === account.email && <Check size={18} className="text-white" />}
                                    </button>
                                ))}
                            </div>
                            <div className="bg-slate-950 p-4 border-t border-slate-800">
                                <button
                                    onClick={() => alert('Please use \'npx themusketeer auth:login\' in your terminal to add new accounts. 🤺')}
                                    className="w-full py-2.5 rounded-xl border border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-slate-900 transition-all"
                                >
                                    Add New Account
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
