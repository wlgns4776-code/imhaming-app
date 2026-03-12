import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Music, Mic2, Tag, ChevronDown, ChevronUp, X, Play } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { base44, COLLECTIONS } from '../api/base44Client';

import clsx from 'clsx';
import LyricsModal from '../components/LyricsModal';
import { fetchLyricsWithSerpApi } from '../utils/lyricsService';
import GlobalHeader from '../components/GlobalHeader';

const CATEGORIES = ['K-pop', 'Pop', 'J-pop', 'Rap', 'WakTaVers', '애교송'];

const SUB_TAGS = {
  'K-pop': ['아이돌', '발라드', '댄스', 'R&B', '인디'],
  'Pop': ['팝보컬', '어쿠스틱', '캐롤'],
  'J-pop': ['애니', '보컬로이드', '우타이테', '록'],
  'Rap': ['국힙', '외힙', '싱잉랩'],
  'WakTaVers': ['이세돌', '고정멤', '아카데미', '우왁굳'],
  '애교송': ['틱톡', '릴스', '모에']
};

const SongBookPage = () => {
  const [songs, setSongs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // New state
  const [editId, setEditId] = useState(null); // New state
  const [activeTab, setActiveTab] = useState('전체');
  const [selectedSubTags, setSelectedSubTags] = useState(new Set());

  
  // View Lyrics State
  const [viewLyricsSong, setViewLyricsSong] = useState(null);
  
  // New Song Form State
  const [newSong, setNewSong] = useState({ 
    title: '', 
    artist: '', 
    tags: '', 
    lyrics: '', 
    key: '', 
    proficiency: '가능', // Default
    conditionCheck: false, 
    remarks: '' 
  }); 
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fetchingLyrics, setFetchingLyrics] = useState(false);

  const fetchLyrics = async () => {
    if (!newSong.title) {
        alert("노래 제목을 먼저 입력해주세요!");
        return;
    }
    
    setFetchingLyrics(true);
    try {
        const titleToSearch = newSong.title.replace(/\(.*\)|\[.*\]/g, '').trim();
        const artistToSearch = newSong.artist ? newSong.artist.replace(/\(.*\)|\[.*\]/g, '').trim() : '';

        const fetchedLyrics = await fetchLyricsWithSerpApi(artistToSearch, titleToSearch);
        
        if (fetchedLyrics) {
            setNewSong(prev => ({ ...prev, lyrics: fetchedLyrics }));
        } else {
            alert("가사를 찾지 못했습니다. 제목, 가수명을 확인하거나 수동으로 입력해주세요.");
        }
    } catch (err) {
        console.error("Lyrics fetch error:", err);
        alert("가사를 가져오는 도중 오류가 발생했습니다.");
    } finally {
        setFetchingLyrics(false);
    }
  };

  const fetchSongs = async () => {
    try {
      // Don't show global loading on background refresh to avoid flickering unless it's initial load
      if (songs.length === 0) setLoading(true); 
      const data = await base44.entities.Song.list();
      setSongs(data.sort((a, b) => a.title.localeCompare(b.title)));
    } catch (error) {
      console.error("Failed to fetch songs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSongs();

    // Polling for real-time updates (every 5 seconds)
    const intervalId = setInterval(fetchSongs, 5000);
    return () => clearInterval(intervalId);
  }, []);

  const handleAddSong = async (e) => {
    e.preventDefault();
    if (!newSong.title) return;

    try {
        const songData = {
            title: newSong.title,
            artist: newSong.artist,
            lyrics: newSong.lyrics,
            key: newSong.key,
            tags: typeof newSong.tags === 'string' ? newSong.tags.split(',').map(t => t.trim()).filter(Boolean) : newSong.tags,
            proficiency: newSong.proficiency,
            conditionCheck: newSong.conditionCheck,
            remarks: newSong.remarks
        };

        if (isEditing && editId) {
            // Update
            const updated = await base44.entities.Song.update(editId, songData);
            // Optimistically merge songData to ensure UI reflects changes immediately
            const meaningfulUpdate = { ...updated, ...songData }; 
            setSongs(prev => prev.map(s => s.id === editId ? meaningfulUpdate : s));
            setIsEditing(false);
            setEditId(null);
        } else {
            // Create
            const created = await base44.entities.Song.create(songData);
             // Optimistically merge songData
            const meaningfulCreate = { ...created, ...songData };
            setSongs(prev => [...prev, meaningfulCreate]);
        }
        
        setNewSong({ 
            title: '', 
            artist: '', 
            tags: '', 
            lyrics: '', 
            key: '', 
            proficiency: '가능', 
            conditionCheck: false, 
            remarks: ''
        });
        setIsAdding(false);
    } catch (error) {
        console.error("Failed to save song:", error);
        alert("노래 저장에 실패했습니다.");
    }
  };

  const startEdit = (song) => {
    setNewSong({
      title: song.title,
      artist: song.artist,
      lyrics: song.lyrics,
      key: song.key || '',
      tags: song.tags.join(', '),
      proficiency: song.proficiency || '가능',
      conditionCheck: song.conditionCheck || false,
      remarks: song.remarks || ''
    });
    setEditId(song.id);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsAdding(false);
    setIsEditing(false);
    setEditId(null);
    setNewSong({ 
        title: '', 
        artist: '', 
        tags: '', 
        lyrics: '', 
        key: '', 
        proficiency: '가능', 
        conditionCheck: false, 
        remarks: '',
    });
  };

  const deleteSong = async (id) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
        try {
            await base44.entities.Song.delete(id);
            setSongs(prev => prev.filter(s => s.id !== id));
        } catch (error) {
            console.error("Failed to delete song:", error);
            alert("삭제에 실패했습니다.");
        }
    }
  };

  /* Safe Tag Normalization Helper */
  const normalize = (str) => str?.toLowerCase().replace(/[^a-z0-9가-힣]/g, '') || '';

  const filteredSongs = songs.filter(song => {
    const searchLower = searchTerm.toLowerCase();
    
    // Safety check: ensure tags is an array
    const songTagsArray = Array.isArray(song.tags) ? song.tags : (typeof song.tags === 'string' ? song.tags.split(',').map(t => t.trim()) : []);

    const matchesSearch = song.title.toLowerCase().includes(searchLower) ||
    song.artist.toLowerCase().includes(searchLower) ||
    songTagsArray.some(t => t.toLowerCase().includes(searchLower));

    // 1차 필터 (메인 카테고리)
    let matchesTab = true;
    if (activeTab !== '전체') {
        const normTab = normalize(activeTab);
        matchesTab = songTagsArray.some(t => normalize(t) === normTab);
    }

    // 2차 필터 (서브 태그 - 교집합/AND 조건)
    let matchesSubTags = true;
    if (selectedSubTags.size > 0) {
        matchesSubTags = Array.from(selectedSubTags).every(subTag => 
            songTagsArray.some(t => normalize(t) === normalize(subTag))
        );
    }

    return matchesSearch && matchesTab && matchesSubTags;
  });

  return (
    <div className="h-full relative pb-20">
      <GlobalHeader 
        rightExtra={
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="제목, 가수 검색..."
                className="w-full pl-10 pr-4 py-2 bg-white/70 backdrop-blur-sm border-0 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {isAdmin && (
              <button 
                  onClick={() => {
                  if (isAdding) cancelEdit();
                  else setIsAdding(true);
                  }}
                  className="bg-black text-white p-2 flex items-center justify-center rounded-xl hover:bg-gray-800 transition-colors shadow-sm"
              >
                  {isAdding ? <X /> : <Plus />}
              </button>
            )}
          </div>
        }
      />

      {/* Categories Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
        {['전체', ...CATEGORIES].map(tab => {
          const count = tab === '전체' 
            ? songs.length 
            : songs.filter(s => {
                const sTags = Array.isArray(s.tags) ? s.tags : [];
                return sTags.some(t => normalize(t) === normalize(tab));
              }).length;
          
          return (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSelectedSubTags(new Set()); // 메인 카테고리 변경 시 서브 태그 초기화
              }}
              className={clsx(
                "px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2",
                activeTab === tab 
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200" 
                  : "bg-white/60 text-gray-600 hover:bg-white"
              )}
            >
              {tab}
              <span className={clsx(
                "text-[10px] px-1.5 py-0.5 rounded-full",
                activeTab === tab ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-500"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sub Categories Tabs */}
      <AnimatePresence>
        {activeTab !== '전체' && SUB_TAGS[activeTab] && (
          <motion.div 
            initial={{ height: 0, opacity: 0, marginTop: -16 }}
            animate={{ height: 'auto', opacity: 1, marginTop: 0 }}
            exit={{ height: 0, opacity: 0, marginTop: -16 }}
            className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide flex-wrap"
          >
            {SUB_TAGS[activeTab].map(subTag => {
              // 메인 카테고리 + 해당 서브 태그를 모두 가진 노래 수 계산
              const count = songs.filter(s => {
                const sTags = Array.isArray(s.tags) ? s.tags : [];
                const hasMain = sTags.some(t => normalize(t) === normalize(activeTab));
                const hasSub = sTags.some(t => normalize(t) === normalize(subTag));
                return hasMain && hasSub;
              }).length;

              const isSelected = selectedSubTags.has(subTag);

              return (
                <button
                  key={subTag}
                  onClick={() => {
                    const next = new Set(selectedSubTags);
                    if (next.has(subTag)) {
                      next.delete(subTag);
                    } else {
                      next.add(subTag);
                    }
                    setSelectedSubTags(next);
                  }}
                  className={clsx(
                    "px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border",
                    isSelected 
                      ? "bg-purple-100 text-purple-700 border-purple-300 shadow-sm" 
                      : "bg-white/50 text-gray-500 border-gray-200 hover:bg-white"
                  )}
                >
                  <Tag size={12} />
                  {subTag}
                  <span className={clsx(
                    "text-[9px] px-1 py-0.5 rounded-full",
                    isSelected ? "bg-purple-200 text-purple-800" : "bg-gray-200 text-gray-500"
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAdding && !isEditing && (
          <div className="mb-8">
            <SongForm 
              isAdding={true}
              newSong={newSong}
              setNewSong={setNewSong}
              CATEGORIES={CATEGORIES}
              onSubmit={handleAddSong}
              onCancel={() => setIsAdding(false)}
              fetchingLyrics={fetchingLyrics}
              fetchLyrics={fetchLyrics}
            />
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredSongs.map(song => {
            return song.id === editId ? (
              <div key={song.id} className="md:col-span-2 lg:col-span-3">
                <SongForm 
                  isAdding={false}
                  newSong={newSong}
                  setNewSong={setNewSong}
                  CATEGORIES={CATEGORIES}
                  onSubmit={handleAddSong}
                  onCancel={cancelEdit}
                  fetchingLyrics={fetchingLyrics}
                  fetchLyrics={fetchLyrics}
                />
              </div>
            ) : (
              <motion.div
                key={song.id}
                layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white/60 backdrop-blur-sm p-5 rounded-2xl border border-white/50 shadow-sm hover:shadow-md transition-shadow group cursor-default"
              // Removed onClick expand
            >
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-gray-900 leading-tight break-words">
                      {song.title}
                    </h3>
                    <p className="text-gray-500 text-sm flex items-center gap-1 mt-1">
                      <Mic2 size={12} /> {song.artist}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {song.key && (
                       <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200 font-mono whitespace-nowrap">
                        {song.key}
                      </span>
                    )}
                    <div className="flex gap-1 flex-wrap justify-end">
                      {song.tags.map(tag => (
                        <span key={tag} className="text-[9px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded-full border border-blue-100">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>


              
              <div className="mt-3 flex flex-wrap gap-2 items-center">
                  {/* Proficiency Badge */}
                  <span className={clsx(
                      "text-[10px] font-bold px-2 py-0.5 rounded border",
                      song.proficiency === '완벽' ? "bg-purple-100 text-purple-700 border-purple-200" :
                      song.proficiency === '미흡' ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                      song.proficiency === '보류' ? "bg-gray-100 text-gray-600 border-gray-200" :
                      "bg-green-100 text-green-700 border-green-200" // 가능
                  )}>
                      {song.proficiency || '가능'}
                  </span>

                  {/* Condition Check Warning */}
                  {song.conditionCheck && (
                       <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-100 text-red-600 border border-red-200 flex items-center gap-1">
                          ⚠️ 컨디션 체크 필요
                       </span>
                  )}
                  
                  {/* Remarks */}
                  {song.remarks && (
                       <span className="text-xs text-gray-400 flex items-center gap-1 ml-auto">
                           💬 {song.remarks}
                       </span>
                  )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                 <button 
                  onClick={() => setViewLyricsSong(song)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                 >
                   <Music size={12} /> 가사 보기
                 </button>

                 {isAdmin && (
                    <div className="flex gap-2">
                        <button 
                            onClick={(e) => { e.stopPropagation(); startEdit(song); }}
                            className="text-blue-500 hover:text-blue-700 text-xs uppercase font-bold px-2 py-1"
                        >
                            수정
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); deleteSong(song.id); }}
                            className="text-red-400 hover:text-red-600 text-xs uppercase font-bold px-2 py-1"
                        >
                            삭제
                        </button>
                    </div>
                )}
              </div>
              

            </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <LyricsModal 
        isOpen={!!viewLyricsSong} 
        onClose={() => setViewLyricsSong(null)} 
        song={viewLyricsSong} 
      />

      <style>{`
        .input-field {
          @apply w-full px-4 py-2 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all;
        }
      `}</style>
    </div>
  );
};

const SongForm = ({ isAdding, newSong, setNewSong, CATEGORIES, onSubmit, onCancel, fetchingLyrics, fetchLyrics }) => {
  return (
    <motion.form
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className={clsx(
        "bg-white p-6 rounded-2xl shadow-lg overflow-hidden border border-blue-100",
        !isAdding && "col-span-full" // If inline but we want it prominent, maybe use full width?
      )}
      onSubmit={onSubmit}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <input 
            placeholder="노래 제목" 
            className="input-field"
            value={newSong.title}
            onChange={e => setNewSong({...newSong, title: e.target.value})}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <input 
            placeholder="가수" 
            className="input-field"
            value={newSong.artist}
            onChange={e => setNewSong({...newSong, artist: e.target.value})}
            required
          />
        </div>
        <div className="md:col-span-2">
          <button
            type="button"
            onClick={fetchLyrics}
            disabled={fetchingLyrics}
            className={clsx(
              "w-full py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
              fetchingLyrics 
                ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                : "bg-blue-100 text-blue-600 hover:bg-blue-200"
            )}
          >
            <Search size={16} /> {fetchingLyrics ? '가사 검색 중...' : '자동으로 가사 가져오기'}
          </button>
        </div>
        <input 
          placeholder="키 (Key) 예: C, Am" 
          className="input-field md:col-span-2"
          value={newSong.key}
          onChange={e => setNewSong({...newSong, key: e.target.value})}
        />
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-gray-500 mb-2 ml-1">카테고리 & 태그 선택 (클릭 시 자동 입력)</label>
          <div className="flex gap-2 flex-wrap mb-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  const currentTags = typeof newSong.tags === 'string' ? newSong.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
                  if (!currentTags.includes(cat)) {
                    setNewSong({ ...newSong, tags: [...currentTags, cat].join(', ') });
                  }
                }}
                className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                + {cat}
              </button>
            ))}
            {/* Show Sub-Tags based on currently included Main Categories */}
            {CATEGORIES.filter(cat => {
              const currentTags = typeof newSong.tags === 'string' ? newSong.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
              return currentTags.includes(cat);
            }).map(activeCat => (
              SUB_TAGS[activeCat] ? SUB_TAGS[activeCat].map(subTag => (
                <button
                  key={`${activeCat}-${subTag}`}
                  type="button"
                  onClick={() => {
                    const currentTags = typeof newSong.tags === 'string' ? newSong.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
                    if (!currentTags.includes(subTag)) {
                      setNewSong({ ...newSong, tags: [...currentTags, subTag].join(', ') });
                    }
                  }}
                  className="px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100 transition-colors"
                >
                  <Tag size={10} className="inline mr-1" /> {subTag}
                </button>
              )) : null
            ))}
          </div>
          <input 
            placeholder="태그 (쉼표로 구분)" 
            className="input-field"
            value={newSong.tags}
            onChange={e => setNewSong({...newSong, tags: e.target.value})}
          />
        </div>

        <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4 items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
          <div className="flex flex-col">
            <label className="text-xs font-bold text-gray-500 mb-1">숙련도</label>
            <select 
              className="input-field py-1 text-sm bg-white"
              value={newSong.proficiency}
              onChange={e => setNewSong({...newSong, proficiency: e.target.value})}
            >
              <option value="가능">가능</option>
              <option value="미흡">미흡</option>
              <option value="보류">보류</option>
              <option value="완벽">완벽</option>
            </select>
          </div>

          <div className="flex items-center gap-2 h-full pt-4">
            <input 
              type="checkbox"
              id="conditionCheck"
              className="w-5 h-5 accent-red-500"
              checked={newSong.conditionCheck}
              onChange={e => setNewSong({...newSong, conditionCheck: e.target.checked})}
            />
            <label htmlFor="conditionCheck" className="text-sm font-bold text-red-500 cursor-pointer">
              컨디션 체크 필요
            </label>
          </div>

          <div className="col-span-2">
            <input 
              placeholder="비고 (메모)" 
              className="input-field bg-white"
              value={newSong.remarks}
              onChange={e => setNewSong({...newSong, remarks: e.target.value})}
            />
          </div>
        </div>



        <textarea 
          placeholder="가사 / 메모" 
          className="input-field md:col-span-2 h-24"
          value={newSong.lyrics}
          onChange={e => setNewSong({...newSong, lyrics: e.target.value})}
        />
      </div>
      <div className="mt-4 flex gap-2">
        <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-xl font-medium hover:bg-blue-700 transition-colors">
          {!isAdding ? '수정 완료' : '추가하기'}
        </button>
        <button 
          type="button" 
          onClick={onCancel}
          className="px-6 bg-gray-100 text-gray-600 py-2 rounded-xl font-medium hover:bg-gray-200 transition-colors"
        >
          취소
        </button>
      </div>
    </motion.form>
  );
};

export default SongBookPage;
