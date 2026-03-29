import React, { useEffect, useState } from 'react';
import { base44 } from '../api/base44Client';
import { useAuth } from '../context/AuthContext';
import './ActiveUsersList.css';

const ActiveUsersList = () => {
    const { isSuperAdmin } = useAuth();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchSessions = async () => {
        try {
            // Get all sessions
            const items = await base44.entities.ActiveSession.list();
            
            // Current time minus 5 minutes
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            
            // Filter: 1) Active in last 5m, 2) Not offline
            const activeSessions = items.filter(s => {
                const lastActive = new Date(s.last_active_at);
                return lastActive > fiveMinutesAgo && s.status !== 'offline';
            });
            
            // Sort to bring super admins and online users higher
            const sortedSessions = activeSessions.sort((a, b) => {
                if (a.is_super_admin && !b.is_super_admin) return -1;
                if (!a.is_super_admin && b.is_super_admin) return 1;
                if (a.status === 'online' && b.status !== 'online') return -1;
                if (a.status !== 'online' && b.status === 'online') return 1;
                return new Date(b.last_active_at) - new Date(a.last_active_at);
            });
            
            setSessions(sortedSessions);
            setLoading(false);
        } catch (error) {
            console.error("Monitor fetch error:", error);
        }
    };

    useEffect(() => {
        if (!isSuperAdmin) return;

        // Fetch immediately and every 10 seconds
        fetchSessions();
        const interval = setInterval(fetchSessions, 10000);
        
        return () => clearInterval(interval);
    }, [isSuperAdmin]);

    if (!isSuperAdmin) return null;

    return (
        <section className="active-users-panel">
            <div className="active-header">
                <h3>
                    <div className="pulse-indicator" />
                    실시간 접속자 모니터링
                    <span style={{opacity: 0.6, fontSize: '0.9em'}}>({sessions.length})</span>
                </h3>
            </div>
            <div className="active-list">
                {sessions.map((session) => (
                    <div key={session.sessionId} className="session-card">
                        <div className="session-info">
                            <span className={`status-dot ${session.status}`}></span>
                            <span className="session-username">{session.username}</span>
                            {session.is_super_admin && <span className="super-badge">Super</span>}
                        </div>
                        <div className="session-meta">
                            <span className="session-ip">{session.ip}</span>
                            <span className="session-time">
                                {new Date(session.last_active_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                ))}
                {!loading && sessions.length === 0 && (
                    <div className="no-sessions">활성 세션이 없습니다.</div>
                )}
            </div>
        </section>
    );
};

export default ActiveUsersList;
