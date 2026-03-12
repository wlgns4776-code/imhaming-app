import React, { useRef, useState, useEffect } from 'react';
import Draggable from 'react-draggable';
import ReactPlayer from 'react-player';
import { useMusic } from '../context/MusicContext';
import { X, Minimize2, Maximize2, SkipBack, SkipForward, Play, Pause, Volume2, VolumeX, List, Music, Mic2, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

const MelonPlayer = () => {
  const { 
    currentSong, 
    isPlaying, 
    setIsPlaying, 
    nextSong, 
    prevSong, 
    volume, 
    setVolume,
    playlist,
    playSong,
    removeSong,
    isMrMode,
    setIsMrMode,
    isPlayerOpen,
    setIsPlayerOpen
  } = useMusic();

  const [isMinimized, setIsMinimized] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false); // New: Lyrics Toggle
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [parsedLyrics, setParsedLyrics] = useState([]); // New: Parsed LRC
  const [currentLineIndex, setCurrentLineIndex] = useState(-1); // New: Current Lyric Line

  const playerRef = useRef(null);
  const nodeRef = useRef(null); 
  const lyricsContainerRef = useRef(null); // New: Ref for scolling

  // Derived state for current URL
  const currentUrl = currentSong ? (isMrMode ? currentSong.mrUrl : currentSong.youtubeUrl) : null;

  // LRC Parser Helper
  const parseLRC = (lrc) => {
    if (!lrc) return [];
    const lines = lrc.split('\n');
    const result = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

    lines.forEach(line => {
        const match = timeRegex.exec(line);
        if (match) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            const milliseconds = parseInt(match[3].padEnd(3, '0'), 10);
            const time = minutes * 60 + seconds + milliseconds / 1000;
            const text = line.replace(timeRegex, '').trim();
            if (text) {
                result.push({ time, text });
            }
        } else if (result.length === 0 && line.trim()) {
            // Handle plain text if no timestamps found yet (or mixed) generally unlikely if LRC
            // But if completely plain, we might just return one big block or split by line without time
        }
    });
    return result;
  };

  useEffect(() => {
    if (currentSong?.lyrics) {
        const parsed = parseLRC(currentSong.lyrics);
        setParsedLyrics(parsed);
    } else {
        setParsedLyrics([]);
    }
    setCurrentLineIndex(-1);
  }, [currentSong]);

  const handleProgress = (state) => {
    if (!state.seeking) {
      setProgress(state.played);
      
      // Update Current Lyric Line
      if (parsedLyrics.length > 0) {
          const currentTime = state.playedSeconds;
          let activeIndex = -1;
          for (let i = 0; i < parsedLyrics.length; i++) {
              if (currentTime >= parsedLyrics[i].time) {
                  activeIndex = i;
              } else {
                  break;
              }
          }
           if (activeIndex !== currentLineIndex) {
              setCurrentLineIndex(activeIndex);
              // Auto-Scroll
              if (showLyrics && lyricsContainerRef.current && activeIndex !== -1) {
                  const activeElement = lyricsContainerRef.current.children[activeIndex];
                  if (activeElement) {
                       activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
              }
          }
      }
    }
  };

  const handleSeek = (e) => {
    const newProgress = parseFloat(e.target.value);
    setProgress(newProgress);
    playerRef.current.seekTo(newProgress);
  };

  const formatTime = (seconds) => {
    const date = new Date(seconds * 1000);
    const hh = date.getUTCHours();
    const mm = date.getUTCMinutes();
    const ss = String(date.getUTCSeconds()).padStart(2, '0');
    if (hh) {
      return `${hh}:${String(mm).padStart(2, '0')}:${ss}`;
    }
    return `${mm}:${ss}`;
  };

  if (!isPlayerOpen) return null;

  return (
    <Draggable nodeRef={nodeRef} handle=".player-handle" bounds="body">
      <div ref={nodeRef} className={clsx(
        "fixed z-[9999] shadow-2xl rounded-xl overflow-hidden backdrop-blur-md transition-all duration-300 border border-white/20",
        isMinimized ? "w-72 h-20 bottom-24 right-4 bg-black/80" : "w-80 h-[500px] bottom-24 right-4 bg-[#1a1a1a]/95 text-white"
      )}>
        {/* Header (Handle) */}
        <div className="player-handle bg-gradient-to-r from-[#00d344] to-[#00b039] p-3 flex justify-between items-center cursor-move select-none">
           <div className="flex items-center gap-2">
             <div className="bg-white text-[#00d344] rounded-full p-1 w-6 h-6 flex items-center justify-center font-bold text-xs italic">M</div>
             <span className="font-bold text-sm text-white">Melon Player</span>
           </div>
           <div className="flex items-center gap-2 text-white/80">
              <button onClick={() => setIsMinimized(!isMinimized)} className="hover:text-white">
                {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
              </button>
              <button onClick={() => setIsPlayerOpen(false)} className="hover:text-white">
                <X size={14} />
              </button>
           </div>
        </div>

        {/* Content */}
        {!isMinimized && (
            <div className="h-[calc(100%-48px)] flex flex-col relative">
                
                {/* Main Display Area (Art or Lyrics) */}
                <div className="flex-1 overflow-hidden relative">
                    {!showLyrics ? (
                        /* Album Art View */
                        <div className="h-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f]">
                            <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-[#333] shadow-lg mb-6 bg-black relative flex items-center justify-center group cursor-pointer" onClick={() => setShowLyrics(true)}>
                                {currentSong ? (
                                    <img 
                                        src={`https://img.youtube.com/vi/${currentSong.youtubeUrl?.split('v=')[1]?.split('&')[0]}/0.jpg`} 
                                        onError={(e) => {e.target.onerror = null; e.target.src=`https://ui-avatars.com/api/?name=${currentSong.title}&background=random`}}
                                        alt="Album Art" 
                                        className={clsx("w-full h-full object-cover", isPlaying && "animate-[spin_10s_linear_infinite]")}
                                    />
                                ) : (
                                    <Music size={40} className="text-gray-600" />
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <span className="text-xs font-bold text-white flex items-center gap-1"><FileText size={12}/> 가사 보기</span>
                                </div>
                                <div className="absolute inset-0 rounded-full border border-white/10" />
                            </div>
                            <div className="text-center w-full px-4">
                                <h3 className="font-bold text-xl truncate text-white/90">
                                    {currentSong?.title || "재생 중인 곡 없음"}
                                </h3>
                                <p className="text-sm text-gray-400 mt-2 truncate">
                                    {currentSong?.artist || "선곡해주세요"}
                                </p>
                            </div>
                        </div>
                    ) : (
                        /* Lyrics View */
                        <div className="h-full bg-[#111] flex flex-col relative">
                             <div className="flex justify-between items-center p-3 border-b border-white/5 bg-[#1a1a1a] z-10">
                                <span className="text-xs font-bold text-gray-400">가사</span>
                                <button onClick={() => setShowLyrics(false)} className="text-xs text-[#00d344] hover:text-white transition-colors">닫기</button>
                             </div>
                             <div 
                                className="flex-1 overflow-y-auto p-6 text-center scrollbar-hide space-y-4"
                                ref={lyricsContainerRef}
                             >
                                 {parsedLyrics.length > 0 ? (
                                     parsedLyrics.map((line, idx) => (
                                         <p 
                                            key={idx} 
                                            className={clsx(
                                                "text-sm transition-all duration-300 leading-relaxed",
                                                idx === currentLineIndex 
                                                    ? "text-[#00d344] font-bold scale-105" 
                                                    : "text-gray-500"
                                            )}
                                         >
                                             {line.text}
                                         </p>
                                     ))
                                 ) : (
                                     <div className="h-full flex flex-col items-center justify-center text-gray-500 text-sm whitespace-pre-wrap">
                                         {currentSong?.lyrics || "가사가 없습니다."}
                                     </div>
                                 )}
                             </div>
                        </div>
                    )}
                </div>

                {/* Karaoke Controls */}
                {currentSong && !showLyrics && (
                    <div className="px-4 py-2 flex justify-center gap-2 bg-[#111]">
                         <button 
                            onClick={() => setIsMrMode(!isMrMode)}
                            className={clsx(
                                "px-3 py-1 rounded-full text-[10px] font-bold transition-all border",
                                isMrMode 
                                    ? "bg-purple-600/20 text-purple-400 border-purple-500/50" 
                                    : "bg-gray-800 text-gray-400 border-gray-700"
                            )}
                         >
                            {isMrMode ? "🎤 MR 모드 ON" : "💿 원곡 모드"}
                         </button>
                    </div>
                )}

                {/* Controls */}
                <div className="p-4 bg-[#111] border-t border-white/5 z-20">
                    {/* Progress Bar */}
                    <div className="mb-2 flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                        <span>{formatTime(progress * duration)}</span>
                        <input
                            type="range"
                            min={0}
                            max={0.999999}
                            step="any"
                            value={progress}
                            onChange={handleSeek}
                            className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-[#00d344] [&::-webkit-slider-thumb]:rounded-full"
                        />
                        <span>{formatTime(duration)}</span>
                    </div>

                    {/* Buttons */}
                    <div className="flex justify-center items-center gap-6 mb-4">
                        <button onClick={prevSong} className="text-gray-400 hover:text-white transition-colors">
                            <SkipBack size={20} className="fill-current" />
                        </button>
                        <button 
                            onClick={() => setIsPlaying(!isPlaying)} 
                            className="bg-[#00d344] text-white p-3 rounded-full hover:bg-[#00b039] shadow-lg shadow-[#00d344]/20 transition-all transform active:scale-95"
                        >
                            {isPlaying ? <Pause size={24} className="fill-current" /> : <Play size={24} className="fill-current ml-1" />}
                        </button>
                        <button onClick={nextSong} className="text-gray-400 hover:text-white transition-colors">
                            <SkipForward size={20} className="fill-current" />
                        </button>
                    </div>

                    {/* Bottom Row */}
                    <div className="flex justify-between items-center">
                        <button 
                            onClick={() => setShowPlaylist(!showPlaylist)}
                            className={clsx("text-xs flex items-center gap-1 transition-colors", showPlaylist ? "text-[#00d344]" : "text-gray-400 hover:text-white")}
                        >
                            <List size={16} /> <span className="hidden sm:inline">목록</span>
                        </button>
                        
                        <div className="flex items-center gap-2 group w-24 justify-end">
                            <button onClick={() => setVolume(v => v === 0 ? 0.5 : 0)}>
                                {volume === 0 ? <VolumeX size={16} className="text-gray-500" /> : <Volume2 size={16} className="text-gray-400 group-hover:text-white" />}
                            </button>
                            <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.05}
                                value={volume}
                                onChange={e => setVolume(parseFloat(e.target.value))}
                                className="w-16 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                            />
                        </div>
                    </div>
                </div>

                {/* Playlist Overlay */}
                <AnimatePresence>
                    {showPlaylist && (
                        <motion.div 
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            className="absolute inset-x-0 bottom-0 top-[48px] bg-[#1a1a1a] z-30 flex flex-col border-t border-white/5"
                        >
                            <div className="p-3 bg-[#111] border-b border-white/5 flex justify-between items-center text-xs text-gray-400">
                                <span>재생 목록 ({playlist.length})</span>
                                <button onClick={() => setShowPlaylist(false)}>닫기</button>
                            </div>
                            <div className="flex-1 overflow-y-auto scrollbar-hide py-2">
                                {playlist.map((song, idx) => (
                                    <div 
                                        key={`${song.id}-${idx}`}
                                        onDoubleClick={() => playSong(song)}
                                        className={clsx(
                                            "flex items-center gap-3 px-4 py-2 hover:bg-white/5 cursor-pointer group transition-colors",
                                            currentSong?.id === song.id && "bg-white/5"
                                        )}
                                    >
                                        <div className="text-xs text-gray-500 w-4 text-center">{idx + 1}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className={clsx("text-xs font-bold truncate", currentSong?.id === song.id ? "text-[#00d344]" : "text-white/90")}>
                                                {song.title}
                                            </div>
                                            <div className="text-[10px] text-gray-500 truncate">{song.artist}</div>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); removeSong(song.id); }}
                                            className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                                {playlist.length === 0 && (
                                    <div className="text-center text-gray-600 text-xs py-10">
                                        재생 목록이 비어있습니다.
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        )}

        {/* Minimized View */}
        {isMinimized && (
           <div className="h-full flex items-center px-4 gap-4 bg-[#1a1a1a] text-white">
                <div onClick={() => setIsMinimized(false)} className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center cursor-pointer border border-gray-700">
                     {currentSong ? (
                        <img 
                            src={`https://img.youtube.com/vi/${currentSong.youtubeUrl?.split('v=')[1]?.split('&')[0]}/0.jpg`} 
                            className="w-full h-full rounded-full object-cover animate-[spin_10s_linear_infinite]"
                            alt="" 
                        /> 
                     ) : <Music size={20} className="text-gray-500" />}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate text-white/90">{currentSong?.title || "재생 중 -"}</div>
                     <div className="text-xs text-gray-500 truncate">{currentSong?.artist || "대기 중"}</div>
                </div>
                <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="text-[#00d344] hover:scale-110 transition-transform"
                >
                     {isPlaying ? <Pause size={24} className="fill-current" /> : <Play size={24} className="fill-current" />}
                </button>
           </div>
        )}

        {/* Hidden React Player */}
        <div className="hidden">
            <ReactPlayer
                ref={playerRef}
                url={currentUrl}
                playing={isPlaying}
                volume={volume}
                controls={false}
                onProgress={handleProgress}
                onDuration={setDuration}
                onEnded={nextSong}
                width="0"
                height="0"
            />
        </div>
      </div>
    </Draggable>
  );
};

export default MelonPlayer;
