import React, { createContext, useContext, useState, useEffect } from 'react';

const MusicContext = createContext(null);

export const MusicProvider = ({ children }) => {
  const [playlist, setPlaylist] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMrMode, setIsMrMode] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isPlayerOpen, setIsPlayerOpen] = useState(true); // Player visibility

  // Play a specific song (adds to playlist if not present, or just plays)
  const playSong = (song) => {
    // Check if song is already in playlist
    if (!playlist.find(s => s.id === song.id)) {
        setPlaylist(prev => [...prev, song]);
    }
    setCurrentSong(song);
    setIsPlaying(true);
    setIsMrMode(false); // Reset to original mode
    setIsPlayerOpen(true);
  };

  const addToPlaylist = (song) => {
    if (!playlist.find(s => s.id === song.id)) {
        setPlaylist(prev => [...prev, song]);
    }
  };

  const nextSong = () => {
    if (!currentSong || playlist.length === 0) return;
    const currentIndex = playlist.findIndex(s => s.id === currentSong.id);
    const nextIndex = (currentIndex + 1) % playlist.length;
    setCurrentSong(playlist[nextIndex]);
    setIsMrMode(false);
  };

  const prevSong = () => {
    if (!currentSong || playlist.length === 0) return;
    const currentIndex = playlist.findIndex(s => s.id === currentSong.id);
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    setCurrentSong(playlist[prevIndex]);
    setIsMrMode(false);
  };
    
  const removeSong = (id) => {
      setPlaylist(prev => prev.filter(s => s.id !== id));
      if (currentSong?.id === id) {
          nextSong();
      }
  }

  return (
    <MusicContext.Provider value={{
      playlist,
      setPlaylist,
      currentSong,
      setCurrentSong,
      isPlaying,
      setIsPlaying,
      isMrMode,
      setIsMrMode,
      volume,
      setVolume,
      playSong,
      addToPlaylist,
      nextSong,
      prevSong,
      removeSong,
      isPlayerOpen,
      setIsPlayerOpen
    }}>
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => useContext(MusicContext);
