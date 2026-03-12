import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Shuffle, Plus, X, Type, Music, Sparkles, Loader2, Save, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { base44, COLLECTIONS } from '../api/base44Client';
import { useAuth } from '../context/AuthContext';
import { fetchLyricsWithSerpApi } from '../utils/lyricsService';
import GlobalHeader from '../components/GlobalHeader';

const extractRoleFromLine = (line) => {
  // 파싱 조건 1: 대괄호 [이름] 안에 있는 텍스트를 원곡 가수로 추출 (소괄호는 무시)
  const match = line.match(/\[([^\]]+)\]|［([^］]+)］/);
  if (match) {
    return { raw: match[0], formatted: (match[1] || match[2]).trim() };
  }
  return null;
};

const COLORS = [
  '#FF5B5B', '#FF965B', '#FFD15B', '#83E05A', 
  '#5BC4FF', '#5B79FF', '#9E5BFF', '#FF5BD4'
];

const PartDistributorPage = () => {
  const { isAdmin, isPartDistributor } = useAuth();
  const hasAccess = isAdmin || isPartDistributor;
  const [songs, setSongs] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  
  // Shared state
  const [session, setSession] = useState({
    song_id: '',
    song_title: '',
    lyrics: '',
    members: [],
    assignments: []
  });

  const [newMemberName, setNewMemberName] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAIFetching, setIsAIFetching] = useState(false);

  // Autocomplete UI states
  const [songSearchQuery, setSongSearchQuery] = useState('');
  const [isSongDropdownOpen, setIsSongDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsSongDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize and subscribe to shared session
  useEffect(() => {
    let unsubscribe = () => {};

    const initSession = async () => {
      try {
        const songData = await base44.entities.Song.list();
        setSongs(songData.sort((a, b) => a.title.localeCompare(b.title)));

        const distList = await base44.entities.PartDistributor.list();
        let currentSession;
        if (distList.length > 0) {
           currentSession = distList[0];
           currentSession.members = typeof currentSession.members === 'string' ? JSON.parse(currentSession.members || '[]') : (currentSession.members || []);
           currentSession.assignments = typeof currentSession.assignments === 'string' ? JSON.parse(currentSession.assignments || '[]') : (currentSession.assignments || []);
           setSessionId(currentSession.id);
           setSession(currentSession);
        } else {
           currentSession = await base44.entities.PartDistributor.create({
              song_id: '',
              song_title: '새로 시작하기',
              lyrics: '',
              members: '[]',
              assignments: '[]'
           });
           currentSession.members = [];
           currentSession.assignments = [];
           setSessionId(currentSession.id);
           setSession(currentSession);
        }

        unsubscribe = base44.entities.PartDistributor.subscribe((payload) => {
           if (payload.action === 'UPDATE' || payload.action === 'CREATE') {
               if (payload.record.id === currentSession.id) {
                   const rec = { ...payload.record };
                   rec.members = typeof rec.members === 'string' ? JSON.parse(rec.members || '[]') : (rec.members || []);
                   rec.assignments = typeof rec.assignments === 'string' ? JSON.parse(rec.assignments || '[]') : (rec.assignments || []);
                   setSession(rec);
               }
           }
        });
      } catch (err) {
        console.error("Failed to initialize distributor session", err);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    return () => unsubscribe();
  }, []);

  const updateSession = async (updates) => {
    if (!sessionId) return;
    try {
      // Optimistic update for local UI
      setSession(prev => ({ ...prev, ...updates }));

      // Prepare updates for server (stringify arrays)
      const saveUpdates = { ...updates };
      if (saveUpdates.members !== undefined) {
        saveUpdates.members = JSON.stringify(saveUpdates.members);
      }
      if (saveUpdates.assignments !== undefined) {
        saveUpdates.assignments = JSON.stringify(saveUpdates.assignments);
      }
      
      await base44.entities.PartDistributor.update(sessionId, saveUpdates);
    } catch (err) {
      console.error("Update failed", err);
    }
  };

  const handleSongSelect = (song) => {
    if (song) {
      updateSession({
        song_id: song.id,
        song_title: song.title,
        lyrics: song.lyrics || '',
        assignments: []
      });
      setSongSearchQuery(`${song.title} - ${song.artist}`);
    } else {
      updateSession({
        song_id: '',
        song_title: '',
        lyrics: '',
        assignments: []
      });
      setSongSearchQuery('');
    }
    setIsSongDropdownOpen(false);
  };

  useEffect(() => {
    // When session is updated from other clients or initial load, sync the search box
    if (session.song_title && session.song_title !== '새로 시작하기') {
      const song = songs.find(s => s.id === session.song_id);
      if (song) {
        setSongSearchQuery(`${song.title} - ${song.artist}`);
      } else {
        setSongSearchQuery(session.song_title);
      }
    } else {
      setSongSearchQuery('');
    }
  }, [session.song_id, session.song_title, songs]);

  const handleLyricsChange = (e) => {
    updateSession({ lyrics: e.target.value, assignments: [] });
  };

  const addMember = (e) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    
    const color = COLORS[session.members?.length % COLORS.length];
    const newMember = {
      id: Date.now().toString(),
      name: newMemberName.trim(),
      color
    };
    
    updateSession({
      members: [...(session.members || []), newMember]
    });
    setNewMemberName('');
  };

  const removeMember = (memberId) => {
    updateSession({
      members: session.members.filter(m => m.id !== memberId),
      assignments: session.assignments.filter(a => a.memberId !== memberId)
    });
  };

  const clearMembers = () => {
    if (window.confirm('참여 멤버를 모두 초기화하시겠습니까?')) {
      updateSession({
        members: [],
        assignments: []
      });
    }
  };

  const handleAIFetchLyrics = async () => {
    if (!session.song_title || session.song_title === '새로 시작하기') {
      alert("먼저 왼쪽에서 노래를 선택해주세요!");
      return;
    }
    setIsAIFetching(true);
    try {
      let searchTitle = session.song_title;
      let artistHint = "";
      
      if (searchTitle.includes(' - ')) {
        const parts = searchTitle.split(' - ');
        searchTitle = parts[0].trim();
        artistHint = parts[1].trim();
      }
      
      searchTitle = searchTitle.replace(/#.*$/, '').replace(/\(.*\)|\[.*\]/g, '').trim();
      artistHint = artistHint.replace(/#.*$/, '').trim();

      const response = await fetchLyricsWithSerpApi(artistHint, searchTitle);

      if (response && response.length > 5) {
        let cleanedLyrics = response.trim();
        updateSession({ lyrics: cleanedLyrics, assignments: [] });
      } else {
        alert("가사를 찾지 못했습니다. 직접 입력하거나 제목을 확인해주세요.");
      }
    } catch (err) {
      console.error(err);
      alert("가사 검색 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsAIFetching(false);
    }
  };

  const saveLyricsToDB = async () => {
    if (!session.song_id || session.song_id === '') {
      alert("노래책에서 곡이 선택되지 않았습니다. (수동 입력 모드에서는 저장할 수 없습니다)");
      return;
    }
    if (!session.lyrics || session.lyrics.trim() === '') {
      alert("저장할 가사가 없습니다.");
      return;
    }
    try {
      await base44.entities.Song.update(session.song_id, { lyrics: session.lyrics.trim() });
      alert("가사가 노래책에 성공적으로 저장되었습니다!");
    } catch (err) {
      console.error(err);
      alert("가사 저장 중 문제가 발생했습니다.");
    }
  };

  const distributeParts = (mode) => {
    if (!session.lyrics || !session.members || session.members.length === 0) return;

    const lines = session.lyrics.split('\n');
    let partsToAssign = [];
    
    if (mode === 'chunk') {
      // Grouping by 4 lines
      lines.forEach((line, index) => {
        if (line.trim() !== '') {
          partsToAssign.push({ lineIndex: index, text: line });
        }
      });

      if (partsToAssign.length === 0) return;

      let availableMembers = [...session.members];
      for (let i = availableMembers.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [availableMembers[i], availableMembers[j]] = [availableMembers[j], availableMembers[i]];
      }

      const assignments = [];
      const CHUNK_SIZE = 4;
      for (let i = 0; i < partsToAssign.length; i += CHUNK_SIZE) {
        const chunk = partsToAssign.slice(i, i + CHUNK_SIZE);
        const chunkIndex = Math.floor(i / CHUNK_SIZE);
        const assignedMember = availableMembers[chunkIndex % availableMembers.length];
        
        chunk.forEach(part => {
          assignments.push({
            lineIndex: part.lineIndex,
            text: part.text,
            memberId: assignedMember.id
          });
        });
      }
      updateSession({ assignments });

    } else if (mode === 'role') {
      // 모드 A: 원곡 가수 파트별 순차 배분 (Round-Robin) 변경
      let availableMembers = [...session.members];
      // 매번 랜덤하게 파트가 돌아가도록 멤버 섞기
      for (let i = availableMembers.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [availableMembers[i], availableMembers[j]] = [availableMembers[j], availableMembers[i]];
      }

      const isAllRole = (role) => {
        if (!role) return false;
        const upper = role.trim().toUpperCase();
        return upper === 'ALL' || upper.includes('ALL') || upper.includes('단체') || upper.includes('다같이') || upper.includes('함께') || upper.includes('같이');
      };

      const assignments = [];
      let currentMemberIndex = 0;
      let lastSinger = null;
      let hasAssignedNormal = false;
      let currentRole = "Unknown";

      lines.forEach((line, index) => {
        if (line.trim() === '') return;
        const roleMatch = extractRoleFromLine(line);
        if (roleMatch) {
          currentRole = roleMatch.formatted;
        }

        if (isAllRole(currentRole)) {
          assignments.push({
            lineIndex: index,
            text: line,
            memberId: 'ALL_MEMBER'
          });
          lastSinger = currentRole;
        } else {
          if (!hasAssignedNormal) {
            assignments.push({
              lineIndex: index,
              text: line,
              memberId: availableMembers[currentMemberIndex].id
            });
            hasAssignedNormal = true;
          } else {
            if (lastSinger !== currentRole) {
              currentMemberIndex = (currentMemberIndex + 1) % availableMembers.length;
            }
            assignments.push({
              lineIndex: index,
              text: line,
              memberId: availableMembers[currentMemberIndex].id
            });
          }
          lastSinger = currentRole;
        }
      });
      
      updateSession({ assignments });
      
    } else if (mode === 'auto') {
      // 모드 B: 자동 분배하기 (문단/블록 기반 교차 분배)
      let availableMembers = [...session.members];
      // 매번 랜덤하게 파트가 돌아가도록 멤버 섞기
      for (let i = availableMembers.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [availableMembers[i], availableMembers[j]] = [availableMembers[j], availableMembers[i]];
      }

      const assignments = [];
      const blocks = [];
      let currentBlock = [];

      // 1) 전체 가사를 빈 줄 기준으로 문단 나누기
      lines.forEach((line, index) => {
          if (line.trim() === '') {
              if (currentBlock.length > 0) {
                  blocks.push(currentBlock);
                  currentBlock = [];
              }
          } else {
              currentBlock.push({ lineIndex: index, text: line });
          }
      });
      if (currentBlock.length > 0) {
          blocks.push(currentBlock);
      }

      if (blocks.length === 0) return;

      // 3) 예외 처리: 문단이 1개밖에 없다면(빈 줄이 1개도 없는 가사), 2줄씩 예외적 분할
      let finalBlocks = [];
      if (blocks.length === 1) {
          const singleBlockLines = blocks[0];
          for (let i = 0; i < singleBlockLines.length; i += 2) {
              finalBlocks.push(singleBlockLines.slice(i, i + 2));
          }
      } else {
          finalBlocks = blocks;
      }

      // 2) 배정: 쪼개진 각 문단 단위로 참여자에게 통째로 순차 배정
      finalBlocks.forEach((block, blockIdx) => {
          // 문단마다 담당자를 교차로 바꿔가며 할당
          const assignedMember = availableMembers[blockIdx % availableMembers.length];
          
          block.forEach(linePart => {
              assignments.push({
                  lineIndex: linePart.lineIndex,
                  text: linePart.text,
                  memberId: assignedMember.id
              });
          });
      });
      
      updateSession({ assignments });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-20 text-gray-400">Loading...</div>;
  }

  // To properly render with spaces/blank lines, map over the original lines
  const originalLines = session.lyrics ? session.lyrics.split('\n') : [];

  const blocks = [];
  let currentBlock = null;

  originalLines.forEach((line, idx) => {
    if (!line.trim()) {
      return;
    }

    const assignment = session.assignments?.find(a => a.lineIndex === idx);
    const memberId = assignment ? assignment.memberId : null;

    if (!currentBlock) {
      currentBlock = {
        type: 'content',
        memberId,
        lines: [line],
        id: `block-${idx}`
      };
    } else {
      if (currentBlock.memberId === memberId) {
        currentBlock.lines.push(line);
      } else {
        blocks.push(currentBlock);
        currentBlock = {
          type: 'content',
          memberId,
          lines: [line],
          id: `block-${idx}`
        };
      }
    }
  });

  if (currentBlock) {
    blocks.push(currentBlock);
  }

  return (
    <div className="h-full relative pb-20">
      <GlobalHeader />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Settings */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-white/60 backdrop-blur-sm p-5 rounded-2xl shadow-sm border border-white/50 relative z-20">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Music size={18} /> 노래 선택
            </h2>
            {hasAccess ? (
              <div className="relative z-30" ref={dropdownRef}>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="노래 검색 또는 선택..."
                    className="w-full pl-4 pr-12 py-2 bg-white rounded-xl focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none text-sm border border-gray-200 shadow-sm transition-all"
                    value={songSearchQuery}
                    onChange={(e) => {
                      setSongSearchQuery(e.target.value);
                      setIsSongDropdownOpen(true);
                    }}
                    onFocus={() => setIsSongDropdownOpen(true)}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <AnimatePresence>
                      {(songSearchQuery.length > 0 || session.song_id) && (
                        <motion.button
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.15 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSongSelect(null);
                          }}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600 rounded-full p-0.5 transition-colors flex items-center justify-center"
                        >
                          <X size={12} strokeWidth={2.5} />
                        </motion.button>
                      )}
                    </AnimatePresence>
                    <ChevronDown size={16} className={clsx("text-gray-400 pointer-events-none transition-transform duration-200", isSongDropdownOpen && "rotate-180")} />
                  </div>
                </div>
                <AnimatePresence>
                  {isSongDropdownOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.15 }}
                      className="absolute z-50 w-full top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto"
                    >
                      <ul className="py-1 text-sm text-gray-700">
                        {songs.filter(s => {
                          if (!songSearchQuery) return true;
                          const query = songSearchQuery.toLowerCase().replace(/\s+/g, '');
                          const title = s.title.toLowerCase().replace(/\s+/g, '');
                          const artist = s.artist.toLowerCase().replace(/\s+/g, '');
                          return title.includes(query) || artist.includes(query);
                        }).map(song => (
                          <li 
                            key={song.id} 
                            onClick={() => handleSongSelect(song)}
                            className={clsx(
                              "px-4 py-2 hover:bg-purple-50 cursor-pointer transition-colors",
                              session.song_id === song.id && "bg-purple-50 text-purple-700 font-bold"
                            )}
                          >
                            <span className="font-medium">{song.title}</span>
                            <span className="text-gray-400 text-xs ml-2">- {song.artist}</span>
                          </li>
                        ))}
                        {songs.filter(s => {
                          if (!songSearchQuery) return true;
                          const query = songSearchQuery.toLowerCase().replace(/\s+/g, '');
                          const title = s.title.toLowerCase().replace(/\s+/g, '');
                          const artist = s.artist.toLowerCase().replace(/\s+/g, '');
                          return title.includes(query) || artist.includes(query);
                        }).length === 0 && (
                          <li className="px-4 py-4 text-center text-gray-500 italic">
                            검색 결과가 없습니다.
                          </li>
                        )}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="w-full px-4 py-2 bg-white/50 rounded-xl text-gray-700">
                {session.song_title ? session.song_title : '-- 선택된 노래 없음 --'}
              </div>
            )}
          </div>

          <div className="bg-white/60 backdrop-blur-sm p-5 rounded-2xl shadow-sm border border-white/50 flex-1">
            <h2 className="font-bold text-lg mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users size={18} /> 참여 멤버
              </div>
              {hasAccess && (
                <button 
                  onClick={clearMembers} 
                  className="text-xs bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-500 px-2 py-1.5 rounded-lg transition-colors font-medium"
                >
                  초기화
                </button>
              )}
            </h2>
            
            {hasAccess && (
              <form onSubmit={addMember} className="flex gap-2 mb-4">
                <input 
                  type="text" 
                  placeholder="멤버 이름 입력" 
                  className="flex-1 px-3 py-2 bg-white rounded-xl outline-none focus:ring-2 focus:ring-purple-200 text-sm"
                  value={newMemberName}
                  onChange={e => setNewMemberName(e.target.value)}
                />
                <button 
                  type="submit"
                  disabled={!newMemberName.trim()}
                  className="bg-purple-600 text-white p-2 rounded-xl disabled:bg-gray-300 transition-colors"
                 >
                  <Plus size={18} />
                </button>
              </form>
            )}

            <div className="flex flex-wrap gap-2">
              <AnimatePresence>
                {session.members?.map(member => (
                  <motion.div
                    key={member.id}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-sm font-medium"
                    style={{ backgroundColor: member.color }}
                  >
                    {member.name}
                    {hasAccess && (
                      <button 
                        onClick={() => removeMember(member.id)}
                        className="hover:bg-black/20 rounded-full p-0.5"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </motion.div>
                ))}
                {(!session.members || session.members.length === 0) && (
                  <div className="text-gray-400 text-sm py-4 text-center w-full">
                    {hasAccess ? "멤버를 추가해주세요" : "등록된 멤버가 없습니다"}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right Column: Lyrics & Results */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white/60 backdrop-blur-sm p-5 rounded-2xl shadow-sm border border-white/50">
             <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-3">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Type size={18} /> 가사
              </h2>
              {hasAccess && (
                <div className="flex gap-2">
                  <button
                    onClick={handleAIFetchLyrics}
                    disabled={isAIFetching}
                    className="bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white px-3 py-2 rounded-xl text-sm font-bold transition-all shadow-md flex items-center gap-2 flex-1 sm:flex-none justify-center"
                  >
                    {isAIFetching ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    AI 검색
                  </button>
                  <button
                    onClick={saveLyricsToDB}
                    disabled={!session.song_id || !session.lyrics}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-3 py-2 rounded-xl text-sm font-bold transition-all shadow-md flex items-center gap-2 flex-1 sm:flex-none justify-center"
                  >
                    <Save size={14} /> 가사 저장
                  </button>
                  <button
                    onClick={() => distributeParts('chunk')}
                    disabled={!session.members?.length || !session.lyrics?.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-3 py-2 rounded-xl text-sm font-bold transition-all shadow-md flex items-center gap-2 flex-1 sm:flex-none justify-center"
                  >
                    <Shuffle size={14} /> 4줄씩 섞기
                  </button>
                  <button
                    onClick={() => distributeParts('role')}
                    disabled={!session.members?.length || !session.lyrics?.trim()}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white px-3 py-2 rounded-xl text-sm font-bold transition-all shadow-md flex items-center gap-2 flex-1 sm:flex-none justify-center"
                  >
                    <Shuffle size={14} /> 원래 파트별 섞기
                  </button>
                  <button
                    onClick={() => distributeParts('auto')}
                    disabled={!session.members?.length || !session.lyrics?.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white px-3 py-2 rounded-xl text-sm font-bold transition-all shadow-md flex items-center gap-2 flex-1 sm:flex-none justify-center"
                  >
                    <Shuffle size={14} /> 자동 분배하기
                  </button>
                </div>
              )}
             </div>

             <textarea 
               value={session.lyrics || ''}
               onChange={handleLyricsChange}
               readOnly={!hasAccess}
               placeholder={hasAccess ? "가사를 입력하거나 왼쪽의 노래책에서 곡을 선택하세요.\n[AI 검색] 버튼을 누르면 인공지능이 곡의 가사를 자동으로 찾아줍니다!" : "가사가 없습니다."}
               className="w-full h-40 p-4 rounded-xl bg-white/80 border-none outline-none focus:ring-2 focus:ring-blue-200 resize-none text-sm leading-relaxed"
             />
          </div>

          {/* Results Area */}
          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 min-h-[300px]">
             {(!session.assignments || session.assignments.length === 0) ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3 min-h-[200px]">
                  <Shuffle size={48} className="opacity-20" />
                  <p>가사와 멤버를 입력하고 섞기 버튼을 눌러주세요</p>
                </div>
             ) : (
                <div className="flex flex-col gap-2">
                  {blocks.map((block, bIdx) => {
                    if (block.type === 'spacer') {
                      return <div key={block.id} className="h-4" />;
                    }

                    if (!block.memberId) {
                       return (
                         <div key={block.id} className="p-3 bg-white rounded-xl text-gray-800 text-sm">
                           {block.lines.map((l, i) => <div key={i}>{l}</div>)}
                         </div>
                       );
                    }

                    const isAllBlock = block.memberId === 'ALL_MEMBER';
                    const member = session.members?.find(m => m.id === block.memberId);
                    
                    const bgStyle = isAllBlock 
                      ? { backgroundColor: '#f3f4f6' } 
                      : { backgroundColor: member ? `${member.color}20` : '#f3f4f6' };
                    
                    const borderStyle = isAllBlock
                      ? { 
                          borderColor: '#1f2937', 
                          borderLeftWidth: '4px', 
                          borderStyle: 'solid' 
                        }
                      : { 
                          borderColor: member ? member.color : '#374151', 
                          borderLeftWidth: '4px', 
                          borderStyle: 'solid' 
                        };

                    const tagStyle = isAllBlock
                      ? { backgroundColor: '#1f2937' }
                      : { backgroundColor: member ? member.color : '#374151' };

                    return (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: bIdx * 0.05 }}
                        key={block.id} 
                        className="p-3 rounded-xl shadow-sm flex flex-col gap-1 relative overflow-hidden group"
                        style={{ ...bgStyle, ...borderStyle }}
                      >
                        <span 
                          className="text-[10px] font-bold px-2 py-0.5 rounded-br-lg absolute top-0 left-0 text-white"
                          style={tagStyle}
                        >
                          {isAllBlock ? 'ALL (다함께)' : (member?.name || 'Unknown')}
                        </span>
                        <div className="pt-3 font-medium text-gray-800 break-words leading-relaxed text-sm">
                          {block.lines.map((l, i) => {
                            const roleMatch = extractRoleFromLine(l);
                            const cleanLine = roleMatch ? l.replace(roleMatch.raw, '').trim() : l;
                            return (
                              <div key={i}>
                                {cleanLine}
                                {roleMatch && <span className="text-gray-400 ml-2 text-xs">{roleMatch.raw.trim()}</span>}
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
             )}
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default PartDistributorPage;
