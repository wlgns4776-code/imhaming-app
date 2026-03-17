import React from 'react';
import { useLocation } from 'react-router-dom';

const GlobalHeader = ({ title, centerExtra, rightExtra }) => {
  const location = useLocation();

  let displayTitle = title;
  if (!displayTitle) {
    if (location.pathname === '/roulette') displayTitle = '# 업보 목록';
    else if (location.pathname === '/songs') displayTitle = '🎵 노래책';
    else if (location.pathname === '/distributor') displayTitle = '🔀 파트 분배';
    else displayTitle = '임하밍 일정';
  }

  return (
    <div className="flex items-center justify-between mb-4 mt-2 px-2 flex-none w-full gap-4">
      {/* Left: Empty space for alignment */}
      <div className="flex-1 min-w-0" />
      
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
