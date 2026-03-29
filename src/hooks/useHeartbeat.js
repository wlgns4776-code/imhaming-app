import { useEffect, useRef, useState } from 'react';
import { base44 } from '../api/base44Client';
import { useAuth } from '../context/AuthContext';

export const useHeartbeat = () => {
    const { username, isSuperAdmin } = useAuth();
    const [ip, setIp] = useState('');
    const sessionIdRef = useRef(null);

    useEffect(() => {
        // Initialize sessionId from sessionStorage
        if (!sessionStorage.getItem('moeum_sid')) {
            const sid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            sessionStorage.setItem('moeum_sid', sid);
        }
        sessionIdRef.current = sessionStorage.getItem('moeum_sid');

        // Fetch client IP using ipify
        const fetchIp = async () => {
            try {
                const response = await fetch('https://api.ipify.org?format=json');
                if (!response.ok) throw new Error('API fetch failed');
                const data = await response.json();
                setIp(data.ip || 'unknown');
            } catch (error) {
                console.error("Failed to fetch IPify address", error);
                setIp('unknown');
            }
        };
        fetchIp();
    }, []);

    const sendSignal = async (status = 'online') => {
        // If not logged in, we shouldn't send anything.
        // Wait until username and IP are available.
        if (!username || !sessionIdRef.current || !ip) return;

        try {
            // Check for existing session by sessionId
            const sessions = await base44.entities.ActiveSession.filter({ sessionId: sessionIdRef.current });
            const sessionData = {
                username,
                sessionId: sessionIdRef.current,
                is_super_admin: !!isSuperAdmin,
                status,
                last_active_at: new Date().toISOString(),
                ip: ip
            };

            if (sessions && sessions.length > 0) {
                await base44.entities.ActiveSession.update(sessions[0].id, sessionData);
            } else {
                await base44.entities.ActiveSession.create(sessionData);
            }
        } catch (error) {
            console.error("Heartbeat sync error:", error);
        }
    };

    useEffect(() => {
        if (!username || !ip) return;

        // 1. Initial heartbeat
        sendSignal(document.visibilityState === 'visible' ? 'online' : 'away');

        // 2. Scheduled heartbeat (30s)
        const interval = setInterval(() => {
            sendSignal(document.visibilityState === 'visible' ? 'online' : 'away');
        }, 30000);

        // 3. Visibility change tracking
        const handleVisibility = () => {
            sendSignal(document.visibilityState === 'visible' ? 'online' : 'away');
        };

        // 4. Tab termination handling
        const handleUnload = () => {
            // Note: Async operations during unload are not always reliable.
            // Using offline as status update.
            sendSignal('offline');
        };

        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('beforeunload', handleUnload);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('beforeunload', handleUnload);
        };
    }, [username, ip, isSuperAdmin]);
};
