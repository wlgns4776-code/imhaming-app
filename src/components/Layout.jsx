import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, Disc, Music, Lock, Unlock, ListMusic } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import LoginModal from './LoginModal';

import TitleBar from './TitleBar';
import ResizeHandles from './ResizeHandles';

const Layout = ({ children }) => {
  const location = useLocation();
  const { isAdmin, isPartDistributor, logout } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isElectron, setIsElectron] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  React.useEffect(() => {
    if (window.electronAPI) {
      setIsElectron(true);
    }
  }, []);

  const hasAccess = isAdmin || isPartDistributor;

  const handleAuthClick = () => {
    if (hasAccess) {
      if(window.confirm('세션을 종료하시겠습니까?')) {
        logout();
      }
    } else {
      setIsLoginOpen(true);
    }
  };

  return (
    <div className="min-h-screen w-full relative">
      <div className="vibe-vignette" />

      <TitleBar isEditing={isEditing} setIsEditing={setIsEditing} />
      {isEditing && <ResizeHandles setIsEditing={setIsEditing} />}
      
      {/* Admin Toggle */}
      <div 
        role="button"
        onClick={handleAuthClick}
        className={clsx(
          "fixed right-4 z-[9999] p-2 rounded-full bg-white/50 backdrop-blur-sm text-gray-400 hover:text-black transition-colors cursor-pointer",
          isElectron ? "top-14" : "top-4"
        )}
        title={hasAccess ? "제어 모드 끄기" : "제어 모드 켜기"}
        style={{ pointerEvents: 'auto' }}
      >
        {hasAccess ? <Unlock size={16} /> : <Lock size={16} />}
      </div>

      {/* Modal outside of potentially restrictive containers if possible, but here z-[10000] should win */}
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

      <main className={clsx(
        "px-2 md:px-4 max-w-[1600px] mx-auto",
        location.pathname === '/' ? "h-[100dvh] flex flex-col overflow-hidden" : "min-h-screen pb-24",
        isElectron ? "pt-14" : "pt-8"
      )}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
