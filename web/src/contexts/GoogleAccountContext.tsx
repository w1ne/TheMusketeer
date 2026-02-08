import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchUser, fetchUsers, switchUser as apiSwitchUser } from '../api/client';

export interface GoogleProfile {
    name: string;
    email: string;
    avatar: string;
}

interface GoogleAccountContextType {
    currentUser: GoogleProfile;
    accounts: GoogleProfile[];
    switchAccount: (email: string) => void;
}

const GoogleAccountContext = createContext<GoogleAccountContextType | undefined>(undefined);

export function GoogleAccountProvider({ children }: { children: React.ReactNode }) {
    const [currentUser, setCurrentUser] = useState<GoogleProfile>({
        name: 'Guest',
        email: 'loading...',
        avatar: ''
    });

    const [accounts, setAccounts] = useState<GoogleProfile[]>([]);

    const refreshData = async () => {
        try {
            const user = await fetchUser();
            const allUsers = await fetchUsers();
            setCurrentUser(user);
            setAccounts(allUsers);
        } catch (e) {
            console.error("Failed to load user data", e);
        }
    };

    // Load from API on mount
    useEffect(() => {
        refreshData();

        // Poll for changes (if CLI logs in a new user)
        const interval = setInterval(refreshData, 2000);
        return () => clearInterval(interval);
    }, []);

    const switchAccount = async (email: string) => {
        try {
            await apiSwitchUser(email);
            // Immediate refresh to update UI
            await refreshData();
        } catch (e) {
            console.error("Failed to switch account", e);
        }
    };

    return (
        <GoogleAccountContext.Provider value={{ currentUser, accounts, switchAccount }}>
            {children}
        </GoogleAccountContext.Provider>
    );
}

export function useGoogleAccount() {
    const context = useContext(GoogleAccountContext);
    if (context === undefined) {
        throw new Error('useGoogleAccount must be used within a GoogleAccountProvider');
    }
    return context;
}
