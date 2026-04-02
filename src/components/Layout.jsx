import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar as CalendarIcon, Disc, Music, ListMusic, Gift, Lock, Unlock, Shirt } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import LoginModal from './LoginModal';
import TitleBar from './TitleBar';
import ResizeHandles from './ResizeHandles';
import { useHeartbeat } from '../hooks/useHeartbeat';
import ActiveUsersList from './ActiveUsersList';

const NAV_LINKS = [
  { to: '/',            icon: CalendarIcon, label: '일정' },
  { to: '/roulette',   icon: Disc,         label: '업보' },
  { to: '/shop',       icon: Gift,         label: '교환소' },
  { to: '/outfits',    icon: Shirt,        label: '의상함' },
  { to: '/songs',      icon: Music,        label: '노래책' },
  { to: '/distributor',icon: ListMusic,    label: '파트분배' },
];

const Layout = ({ children }) => {
  const location = useLocation();
  const { isAdmin, isPartDistributor, isSuperAdmin, logout } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isElectron, setIsElectron] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Initialize real-time heartbeat signaling
  useHeartbeat();

  React.useEffect(() => {
    if (window.electronAPI) setIsElectron(true);
  }, []);

  const hasAccess = isAdmin || isPartDistributor || isSuperAdmin;

  const handleAuthClick = () => {
    if (hasAccess) {
      if (window.confirm('세션을 종료하시겠습니까?')) logout();
    } else {
      setIsLoginOpen(true);
    }
  };

  return (
    <div className="min-h-screen w-full relative bg-gray-50/60">
      <div className="vibe-vignette" />

      {/* Electron titlebar */}
      <TitleBar isEditing={isEditing} setIsEditing={setIsEditing} />
      {isEditing && <ResizeHandles setIsEditing={setIsEditing} />}

      {/* ── Global Navigation Bar ─────────────────── */}
      <header
        className={clsx(
          'fixed left-0 right-0 z-[9000]',
          'flex items-center justify-between',
          'px-4 md:px-6',
          'bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100',
          isElectron ? 'top-8 h-12' : 'top-0 h-14'
        )}
      >
        {/* Left: Tab Nav */}
        <nav className="flex bg-white p-1 rounded-full shadow-[0_2px_10px_-2px_rgba(0,0,0,0.1)] border border-gray-100/80">
          {NAV_LINKS.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={clsx(
                  'flex items-center gap-1.5 px-4 py-1.5 rounded-full font-semibold text-sm transition-all whitespace-nowrap',
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                )}
              >
                <Icon size={14} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Center: Title */}
        <h1 className="absolute left-1/2 -translate-x-1/2 text-base font-extrabold text-gray-800 tracking-tight whitespace-nowrap">
          임하밍 모음
        </h1>

        {/* Right: Lock/Unlock icon */}
        <button
          onClick={handleAuthClick}
          title={hasAccess ? '제어 모드 끄기' : '제어 모드 켜기'}
          className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          {hasAccess ? <Unlock size={16} /> : <Lock size={16} />}
        </button>
      </header>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

      {/* ── Page Content ──────────────────────────── */}
      <main
        className={clsx(
          'w-full max-w-[1600px] mx-auto px-2 md:px-4',
          isElectron ? 'pt-[80px]' : 'pt-[72px]',
          'pb-6 min-h-screen',
          isSuperAdmin && 'pb-40' // Add padding for super admin monitor panel
        )}
      >
        {children}
      </main>

      {/* Super Admin Real-time Monitor */}
      <ActiveUsersList />
    </div>
  );
};

export default Layout;
