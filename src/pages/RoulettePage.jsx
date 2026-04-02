import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, UserPlus, FilePlus, Minus, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { base44 } from '../api/base44Client';
import clsx from 'clsx';
import GlobalHeader from '../components/GlobalHeader';

/* ─── 기본 카테고리 설정 ─── */
const DEFAULT_CATEGORIES = [
  {
    key: 'upbo',
    label: '업보 장부',
    type: 'A',
    fields: [
      { key: '노래', label: '노래' },
      { key: '퀵뷰(7일)', label: '퀵뷰(7일)' },
    ],
  },
  {
    key: 'costume',
    label: '코스튬 의뢰',
    type: 'B',
    fields: [
      { key: 'costume', label: '의상/옵션', inputType: 'text' },
      { key: 'status', label: '진행상태', inputType: 'select', options: ['대기', '준완', '완료'] },
    ],
  },
];

const STATUS_BADGE = {
  '대기': 'bg-amber-50 text-amber-600 border-amber-200',
  '준완': 'bg-blue-50 text-blue-600 border-blue-200',
  '완료': 'bg-gray-100 text-gray-400 border-gray-200',
};

const isRowCompleted = (user, category) => {
  if (!category || category.type !== 'B') return false;
  const sf = category.fields.find(f => f.inputType === 'select');
  if (!sf) return false;
  return (user.data || {})[sf.key] === '완료';
};

/* ─── 메인 컴포넌트 ─── */
const LedgerPage = () => {
  const { isAdmin } = useAuth();

  const [categories, setCategories] = useState([]);
  const [selectedKey, setSelectedKey] = useState(null);
  const [configId, setConfigId] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // 폼 상태
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [newUserId, setNewUserId] = useState('');
  const [newFormData, setNewFormData] = useState({});
  const [newColumn, setNewColumn] = useState('');

  // 인라인 편집 (B타입)
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');

  /* ─── 파생 상태 ─── */
  const selectedCat = useMemo(
    () => categories.find(c => c.key === selectedKey),
    [categories, selectedKey],
  );

  const filteredUsers = useMemo(() => {
    if (!selectedCat) return [];
    return allUsers.filter(u => {
      if (!u.category) {
        const firstA = categories.find(c => c.type === 'A');
        return firstA && selectedKey === firstA.key;
      }
      return u.category === selectedKey;
    });
  }, [allUsers, selectedKey, selectedCat, categories]);

  /* ─── 데이터 로드 ─── */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const configs = await base44.entities.LedgerConfig.list();
        if (configs && configs.length > 0) {
          const cfg = configs[0];
          setConfigId(cfg.id);
          if (cfg.categories && cfg.categories.length > 0) {
            setCategories(cfg.categories);
            setSelectedKey(prev => prev || cfg.categories[0].key);
          } else {
            const legacy = cfg.columns || ['노래', '퀵뷰(7일)'];
            const migrated = [
              { key: 'upbo', label: '업보 장부', type: 'A', fields: legacy.map(c => ({ key: c, label: c })) },
              ...DEFAULT_CATEGORIES.filter(c => c.type === 'B'),
            ];
            setCategories(migrated);
            setSelectedKey('upbo');
            await base44.entities.LedgerConfig.update(cfg.id, { categories: migrated, columns: legacy });
          }
        } else {
          const created = await base44.entities.LedgerConfig.create({
            columns: DEFAULT_CATEGORIES[0].fields.map(f => f.key),
            categories: DEFAULT_CATEGORIES,
          });
          setConfigId(created.id);
          setCategories(DEFAULT_CATEGORIES);
          setSelectedKey(DEFAULT_CATEGORIES[0].key);
        }
        const users = await base44.entities.LedgerUser.list();
        setAllUsers(users);
      } catch (e) {
        console.error('Failed to fetch ledger data', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const id = setInterval(fetchData, 5000);
    return () => clearInterval(id);
  }, []);

  /* ─── CRUD: 유저 추가 ─── */
  const addUser = async (e) => {
    e.preventDefault();
    if (!newNickname || !selectedCat) return;
    const userData = { nickname: newNickname, userId: newUserId, category: selectedKey };
    if (selectedCat.type === 'A') {
      const init = {};
      selectedCat.fields.forEach(f => (init[f.key] = 0));
      userData.counts = init;
      userData.data = {};
    } else {
      userData.counts = {};
      const d = { ...newFormData };
      selectedCat.fields.forEach(f => {
        if (!d[f.key]) d[f.key] = f.inputType === 'select' ? f.options[0] : '';
      });
      userData.data = d;
    }
    try {
      const created = await base44.entities.LedgerUser.create(userData);
      setAllUsers(prev => [...prev, created]);
      setNewNickname('');
      setNewUserId('');
      setNewFormData({});
      setIsAddingUser(false);
    } catch (err) {
      console.error('Failed to add user:', err);
    }
  };

  const deleteUser = async (userId) => {
    try {
      await base44.entities.LedgerUser.delete(userId);
      setAllUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  /* ─── A타입: 카운터 ─── */
  const updateCount = async (userId, fieldKey, delta) => {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    const cur = (user.counts && user.counts[fieldKey]) || 0;
    const next = Math.max(0, cur + delta);
    const newCounts = { ...(user.counts || {}), [fieldKey]: next };
    setAllUsers(prev => prev.map(u => (u.id === userId ? { ...u, counts: newCounts } : u)));
    try {
      await base44.entities.LedgerUser.update(userId, { counts: newCounts });
    } catch (err) {
      console.error('Failed to update count:', err);
    }
  };

  /* ─── B타입: 데이터 업데이트 ─── */
  const updateUserData = async (userId, fieldKey, value) => {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    const newData = { ...(user.data || {}), [fieldKey]: value };
    setAllUsers(prev => prev.map(u => (u.id === userId ? { ...u, data: newData } : u)));
    try {
      await base44.entities.LedgerUser.update(userId, { data: newData });
    } catch (err) {
      console.error('Failed to update user data:', err);
    }
  };

  const cycleStatus = (userId, fieldKey, currentVal, options) => {
    if (!isAdmin) return;
    const idx = options.indexOf(currentVal);
    updateUserData(userId, fieldKey, options[(idx + 1) % options.length]);
  };

  /* ─── 인라인 편집 ─── */
  const startEditing = (rowId, fieldKey, val) => {
    setEditingCell({ rowId, fieldKey });
    setEditValue(val || '');
  };
  const saveEdit = () => {
    if (editingCell) updateUserData(editingCell.rowId, editingCell.fieldKey, editValue);
    setEditingCell(null);
  };

  /* ─── A타입: 컬럼 관리 ─── */
  const addColumn = async (e) => {
    e.preventDefault();
    if (!newColumn || !selectedCat || selectedCat.type !== 'A') return;
    if (selectedCat.fields.some(f => f.key === newColumn)) return;
    const updated = categories.map(cat =>
      cat.key === selectedKey ? { ...cat, fields: [...cat.fields, { key: newColumn, label: newColumn }] } : cat,
    );
    try {
      if (configId) await base44.entities.LedgerConfig.update(configId, { categories: updated });
      setCategories(updated);
      setNewColumn('');
      setIsAddingColumn(false);
    } catch (err) {
      console.error('Failed to add column:', err);
    }
  };

  const deleteColumn = async (fieldKey) => {
    if (!selectedCat || selectedCat.type !== 'A') return;
    const updated = categories.map(cat =>
      cat.key === selectedKey ? { ...cat, fields: cat.fields.filter(f => f.key !== fieldKey) } : cat,
    );
    try {
      if (configId) await base44.entities.LedgerConfig.update(configId, { categories: updated });
      setCategories(updated);
    } catch (err) {
      console.error('Failed to delete column:', err);
    }
  };

  /* ─── 초기화 ─── */
  const resetAll = async () => {
    if (!selectedCat) return;
    const targets = filteredUsers;
    if (selectedCat.type === 'A') {
      const reset = {};
      selectedCat.fields.forEach(f => (reset[f.key] = 0));
      setAllUsers(prev => prev.map(u => (targets.find(t => t.id === u.id) ? { ...u, counts: reset } : u)));
      try {
        await Promise.all(targets.map(t => base44.entities.LedgerUser.update(t.id, { counts: reset })));
      } catch (err) {
        console.error('Failed to reset:', err);
      }
    } else {
      const reset = {};
      selectedCat.fields.forEach(f => {
        reset[f.key] = f.inputType === 'select' ? f.options[0] : '';
      });
      setAllUsers(prev => prev.map(u => (targets.find(t => t.id === u.id) ? { ...u, data: reset } : u)));
      try {
        await Promise.all(targets.map(t => base44.entities.LedgerUser.update(t.id, { data: reset })));
      } catch (err) {
        console.error('Failed to reset:', err);
      }
    }
  };

  /* ═══════════════════════ RENDER ═══════════════════════ */
  return (
    <div className="h-full flex flex-col pb-20">
      <GlobalHeader
        rightExtra={
          isAdmin && (
            <div className="flex gap-2">
              <button onClick={resetAll} className="bg-white/60 text-gray-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-white border border-gray-100/80 shadow-sm transition-colors flex items-center gap-1">
                <RotateCcw size={14} /> 초기화
              </button>
              {selectedCat?.type === 'A' && (
                <button onClick={() => setIsAddingColumn(true)} className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-white border border-blue-100 shadow-sm transition-colors flex items-center gap-1">
                  <FilePlus size={16} /> 항목 추가
                </button>
              )}
              <button onClick={() => setIsAddingUser(true)} className="bg-black text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 shadow-sm transition-colors flex items-center gap-1">
                <UserPlus size={16} /> 유저 추가
              </button>
            </div>
          )
        }
      />

      {/* ── 카테고리 탭 ── */}
      <div className="flex gap-2 mb-4 px-1">
        {categories.map(cat => (
          <button
            key={cat.key}
            onClick={() => { setSelectedKey(cat.key); setIsAddingUser(false); setIsAddingColumn(false); }}
            className={clsx(
              'px-5 py-2.5 rounded-2xl text-sm font-bold transition-all duration-200 border',
              selectedKey === cat.key
                ? 'bg-orange-400 text-white border-orange-400 shadow-md shadow-orange-200/50'
                : 'bg-white/60 text-gray-500 border-gray-100/80 hover:bg-white hover:text-gray-700',
            )}
          >
            {cat.type === 'A' ? '📊' : '📋'} {cat.label}
          </button>
        ))}
      </div>

      {/* ── 폼: 유저 추가 ── */}
      <AnimatePresence>
        {isAddingUser && selectedCat && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={addUser}
            className="bg-white/90 backdrop-blur-sm p-5 rounded-2xl shadow-lg border border-blue-100/60 mb-5 overflow-hidden"
          >
            <h3 className="text-sm font-extrabold text-gray-700 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-orange-400 text-white flex items-center justify-center"><UserPlus size={12} /></span>
              새 유저 등록
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-gray-400 ml-1">닉네임 *</label>
                <input placeholder="시청자 닉네임" value={newNickname} onChange={e => setNewNickname(e.target.value)} className="input-field" autoFocus />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-gray-400 ml-1">아이디 (선택)</label>
                <input placeholder="SOOP 아이디" value={newUserId} onChange={e => setNewUserId(e.target.value)} className="input-field" />
              </div>
            </div>
            {/* B타입 추가 필드 */}
            {selectedCat.type === 'B' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                {selectedCat.fields.map(field =>
                  field.inputType === 'text' ? (
                    <div key={field.key} className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-gray-400 ml-1">{field.label}</label>
                      <input
                        placeholder={field.label}
                        value={newFormData[field.key] || ''}
                        onChange={e => setNewFormData(p => ({ ...p, [field.key]: e.target.value }))}
                        className="input-field"
                      />
                    </div>
                  ) : field.inputType === 'select' ? (
                    <div key={field.key} className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-gray-400 ml-1">{field.label}</label>
                      <select
                        value={newFormData[field.key] || field.options[0]}
                        onChange={e => setNewFormData(p => ({ ...p, [field.key]: e.target.value }))}
                        className="input-field"
                      >
                        {field.options.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  ) : null,
                )}
              </div>
            )}
            <div className="flex gap-2">
              <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-1.5 shadow-sm transition-colors"><UserPlus size={14} /> 등록하기</button>
              <button type="button" onClick={() => setIsAddingUser(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">취소</button>
            </div>
          </motion.form>
        )}
        {isAddingColumn && selectedCat?.type === 'A' && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={addColumn}
            className="bg-white/90 backdrop-blur-sm p-5 rounded-2xl shadow-lg border border-blue-100/60 mb-5 overflow-hidden"
          >
            <h3 className="text-sm font-extrabold text-gray-700 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center"><FilePlus size={12} /></span>
              새 항목 추가
            </h3>
            <div className="flex gap-2">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-[11px] font-bold text-gray-400 ml-1">항목 이름 *</label>
                <input placeholder="예: 밍조각, 벌칙, 노래권" value={newColumn} onChange={e => setNewColumn(e.target.value)} className="input-field" autoFocus />
              </div>
              <div className="flex gap-2 items-end">
                <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors whitespace-nowrap">추가</button>
                <button type="button" onClick={() => setIsAddingColumn(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">취소</button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* ── 테이블 ── */}
      <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/40 shadow-sm overflow-hidden flex-1 overflow-y-auto">
        {selectedCat && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-orange-100/50 border-b border-orange-200/50">
                <th className="p-4 font-bold text-gray-700 w-16">#</th>
                <th className="p-4 font-bold text-gray-700 min-w-[120px]">닉네임</th>
                <th className="p-4 font-bold text-gray-700 min-w-[120px]">아이디</th>
                {selectedCat.fields.map(field => (
                  <th key={field.key} className="p-4 font-bold text-gray-700 text-center min-w-[120px] group relative">
                    {field.label}
                    {isAdmin && selectedCat.type === 'A' && (
                      <button onClick={() => deleteColumn(field.key)} className="absolute top-2 right-2 text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </th>
                ))}
                <th className="p-4 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, idx) => {
                const completed = isRowCompleted(user, selectedCat);
                return (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={clsx(
                      'transition-colors border-b border-gray-100/50 last:border-0',
                      completed ? 'bg-gray-50/80' : 'hover:bg-white/40',
                    )}
                  >
                    <td className={clsx('p-4 text-sm', completed ? 'text-gray-300' : 'text-gray-400')}>{idx + 1}</td>
                    <td className={clsx('p-4 font-medium', completed ? 'line-through text-gray-400' : 'text-gray-900')}>{user.nickname}</td>
                    <td className={clsx('p-4 font-mono text-sm', completed ? 'line-through text-gray-400' : 'text-gray-500')}>{user.userId || '-'}</td>

                    {/* ── A타입: 카운터 셀 ── */}
                    {selectedCat.type === 'A' && selectedCat.fields.map(field => (
                      <td key={field.key} className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {isAdmin && (
                            <button onClick={() => updateCount(user.id, field.key, -1)} className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                              <Minus size={12} />
                            </button>
                          )}
                          <span className={clsx('font-bold text-lg min-w-[20px]', (user.counts?.[field.key] || 0) > 0 ? 'text-blue-600' : 'text-gray-300')}>
                            {user.counts?.[field.key] || ''}
                          </span>
                          {isAdmin && (
                            <button onClick={() => updateCount(user.id, field.key, 1)} className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-blue-100 hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100">
                              <Plus size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    ))}

                    {/* ── B타입: 데이터 셀 ── */}
                    {selectedCat.type === 'B' && selectedCat.fields.map(field => {
                      const val = (user.data || {})[field.key] || '';

                      if (field.inputType === 'select') {
                        const display = val || field.options[0];
                        return (
                          <td key={field.key} className="p-4 text-center">
                            <button
                              onClick={() => cycleStatus(user.id, field.key, display, field.options)}
                              disabled={!isAdmin}
                              className={clsx(
                                'px-3 py-1 rounded-full text-xs font-bold border transition-all',
                                STATUS_BADGE[display] || 'bg-gray-50 text-gray-500 border-gray-200',
                                isAdmin && 'cursor-pointer hover:shadow-sm active:scale-95',
                              )}
                            >
                              {display}
                            </button>
                          </td>
                        );
                      }

                      if (field.inputType === 'text') {
                        const isEd = editingCell?.rowId === user.id && editingCell?.fieldKey === field.key;
                        return (
                          <td key={field.key} className="p-4">
                            {isEd ? (
                              <input
                                autoFocus
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onBlur={saveEdit}
                                onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingCell(null); }}
                                className="w-full px-2 py-1 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none"
                              />
                            ) : (
                              <span
                                onClick={() => isAdmin && startEditing(user.id, field.key, val)}
                                className={clsx(
                                  'block px-1 py-0.5 rounded',
                                  completed ? 'line-through text-gray-400' : 'text-gray-700',
                                  isAdmin && 'cursor-pointer hover:bg-blue-50/60',
                                )}
                              >
                                {val || '-'}
                              </span>
                            )}
                          </td>
                        );
                      }
                      return <td key={field.key} className="p-4">-</td>;
                    })}

                    <td className="p-4 text-right">
                      {isAdmin && (
                        <button onClick={() => deleteUser(user.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-400"><p>데이터를 불러오는 중...</p></div>
        ) : filteredUsers.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p>등록된 유저가 없습니다.</p>
            <p className="text-sm mt-1">우측 상단 '유저 추가' 버튼을 눌러보세요.</p>
          </div>
        )}
      </div>

      <style>{`
        .input-field {
          @apply w-full px-4 py-2 rounded-lg bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all;
        }
        tr:hover .opacity-0 {
          opacity: 1;
        }
      `}</style>
    </div>
  );
};

export default LedgerPage;
