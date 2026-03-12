import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar as CalendarIcon, Disc, Music, ListMusic } from 'lucide-react';
import clsx from 'clsx';

const GlobalHeader = ({ title, centerExtra, rightExtra }) => {
  const location = useLocation();

  const navLinks = [
    { to: '/', icon: CalendarIcon, label: '일정표' },
    { to: '/roulette', icon: Disc, label: '업보' },
    { to: '/songs', icon: Music, label: '노래책' },
    { to: '/distributor', icon: ListMusic, label: '파트분배' },
  ];

  let displayTitle = title;
  if (!displayTitle) {
    if (location.pathname === '/roulette') displayTitle = '# 업보 목록';
    else if (location.pathname === '/songs') displayTitle = '🎵 노래책';
    else if (location.pathname === '/distributor') displayTitle = '🔀 파트 분배';
    else displayTitle = '임하밍 일정';
  }

  return (
    <div className="flex items-center justify-between mb-4 mt-2 px-2 flex-none w-full gap-4">
      {/* Left: App Nav */}
      <div className="flex-1 flex justify-start min-w-0 overflow-x-auto scrollbar-hide pb-2 md:pb-0">
        <div className="flex bg-white/60 p-1 rounded-full shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-gray-100/80 backdrop-blur-md shrink-0">
          {navLinks.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to;
            return (
              <Link 
                key={to}
                to={to} 
                className={clsx(
                  "flex items-center gap-2 px-5 py-2 rounded-full font-semibold text-sm transition-all whitespace-nowrap",
                  active 
                    ? "bg-white shadow-sm text-blue-600 font-bold" 
                    : "text-gray-500 hover:bg-white/80 hover:text-gray-900"
                )}
              >
                <Icon size={16}/> {label}
              </Link>
            );
          })}
        </div>
      </div>
      
      {/* Center: Title + Extra */}
      <div className="shrink-0 flex flex-col items-center justify-center">
        <h1 className="text-xl font-extrabold text-gray-800 tracking-tight mb-2">{displayTitle}</h1>
        {centerExtra && <div className="flex items-center gap-4">{centerExtra}</div>}
      </div>
      
      {/* Right: Extra */}
      <div className="flex-1 flex justify-end items-center gap-3 min-w-0">
        {rightExtra}
      </div>
    </div>
  );
};

export default GlobalHeader;
