import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, UserPlus, FilePlus, Minus, Hash, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { base44, COLLECTIONS } from '../api/base44Client';
import clsx from 'clsx';
import GlobalHeader from '../components/GlobalHeader';

const LedgerPage = () => {
  const [columns, setColumns] = useState(['노래', '퀵뷰(7일)']);
  const [users, setUsers] = useState([]);
  const { isAdmin } = useAuth();
  
  // Input states
  const [newNickname, setNewNickname] = useState('');
  const [newUserId, setNewUserId] = useState('');
  const [newColumn, setNewColumn] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isAddingColumn, setIsAddingColumn] = useState(false);

  const [configId, setConfigId] = useState(null); // ID of the singleton config
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
        try {
            // Fetch Columns
            const configItems = await base44.entities.LedgerConfig.list();
            if (configItems && configItems.length > 0) {
                setColumns(configItems[0].columns);
                setConfigId(configItems[0].id);
            } else {
                 // Create default if not exists
                 const defaultCols = ['노래', '퀵뷰(7일)'];
                 const created = await base44.entities.LedgerConfig.create({ columns: defaultCols });
                 setColumns(defaultCols);
                 setConfigId(created.id);
            }

            // Fetch Users
            const userItems = await base44.entities.LedgerUser.list();
            setUsers(userItems);
        } catch (e) {
            console.error("Failed to fetch ledger data", e);
        } finally {
            setLoading(false);
        }
    };

    fetchData();
    const intervalId = setInterval(fetchData, 5000);
    return () => clearInterval(intervalId);
  }, []);

  const addUser = async (e) => {
    e.preventDefault();
    if (!newNickname) return;
    
    const initialCounts = {};
    columns.forEach(col => initialCounts[col] = 0);

    const userData = {
      nickname: newNickname,
      userId: newUserId,
      counts: initialCounts
    };

    try {
        const created = await base44.entities.LedgerUser.create(userData);
        setUsers(prev => [...prev, created]);
        setNewNickname('');
        setNewUserId('');
        setIsAddingUser(false);
    } catch (error) {
        console.error("Failed to add user:", error);
    }
  };

  const addColumn = async (e) => {
    e.preventDefault();
    if (!newColumn || columns.includes(newColumn)) return;

    const updatedColumns = [...columns, newColumn];
    
    try {
        // Update Config
        if (configId) {
            await base44.entities.LedgerConfig.update(configId, { columns: updatedColumns });
        }
        setColumns(updatedColumns);

        // Ideally, we shouldn't iterate all users to update structure if the DB was SQL, but with NoSQL/JSON, 
        // older records just won't have the key. We handle missing keys in render/logic. 
        // But for consistency let's just leave existing users as is, they will get the key when updated.
        
        setNewColumn('');
        setIsAddingColumn(false);
    } catch (error) {
        console.error("Failed to add column:", error);
    }
  };

  const deleteColumn = async (colToDelete) => {
    const updatedColumns = columns.filter(c => c !== colToDelete);
    try {
         if (configId) {
            await base44.entities.LedgerConfig.update(configId, { columns: updatedColumns });
        }
        setColumns(updatedColumns);
    } catch (error) {
        console.error("Failed to delete column:", error);
    }
  };

  const deleteUser = async (userId) => {
      try {
          await base44.entities.LedgerUser.delete(userId);
          setUsers(prev => prev.filter(u => u.id !== userId));
      } catch (error) {
          console.error("Failed to delete user:", error);
      }
  }

  const updateCount = async (userId, column, delta) => {
    const userToUpdate = users.find(u => u.id === userId);
    if (!userToUpdate) return;

    const current = (userToUpdate.counts && userToUpdate.counts[column]) || 0;
    const newCount = Math.max(0, current + delta);
    const newCounts = { ...(userToUpdate.counts || {}), [column]: newCount };

    // Optimistic Update
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, counts: newCounts } : u));

    try {
        await base44.entities.LedgerUser.update(userId, { counts: newCounts });
    } catch (error) {
        console.error("Failed to update count:", error);
        // Revert (not implemented here for brevity)
    }
  };

  const resetAll = async () => {
    const resetCounts = {};
    columns.forEach(col => resetCounts[col] = 0);
    
    const updatedUsersLocal = users.map(user => ({ ...user, counts: resetCounts }));
    setUsers(updatedUsersLocal);

    try {
        await Promise.all(users.map(u => 
            base44.entities.LedgerUser.update(u.id, { counts: resetCounts })
        ));
    } catch (error) {
         console.error("Failed to reset all:", error);
    }
  }

  return (
    <div className="h-full flex flex-col pb-20">
      <GlobalHeader 
        rightExtra={
          isAdmin && (
            <div className="flex gap-2">
                <button 
                    onClick={resetAll}
                    className="bg-white/60 text-gray-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-white border border-gray-100/80 shadow-sm transition-colors flex items-center gap-1"
                >
                    <RotateCcw size={14} /> 초기화
                </button>
                <button 
                    onClick={() => setIsAddingColumn(true)}
                    className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-white border border-blue-100 shadow-sm transition-colors flex items-center gap-1"
                >
                    <FilePlus size={16} /> 항목 추가
                </button>
                <button 
                    onClick={() => setIsAddingUser(true)}
                    className="bg-black text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 shadow-sm transition-colors flex items-center gap-1"
                >
                    <UserPlus size={16} /> 유저 추가
                </button>
            </div>
          )
        }
      />

      {/* Forms */}
      <AnimatePresence>
        {isAddingUser && (
            <motion.form 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                onSubmit={addUser}
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4 grid grid-cols-1 md:grid-cols-3 gap-2 overflow-hidden"
            >
                <input 
                    placeholder="닉네임" 
                    value={newNickname} 
                    onChange={e => setNewNickname(e.target.value)}
                    className="input-field"
                    autoFocus
                />
                <input 
                    placeholder="아이디 (선택)" 
                    value={newUserId} 
                    onChange={e => setNewUserId(e.target.value)}
                    className="input-field"
                />
                <div className="flex gap-2">
                    <button type="submit" className="bg-blue-500 text-white px-4 rounded-lg flex-1">추가</button>
                    <button type="button" onClick={() => setIsAddingUser(false)} className="bg-gray-200 px-4 rounded-lg">취소</button>
                </div>
            </motion.form>
        )}
         {isAddingColumn && (
            <motion.form 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                onSubmit={addColumn}
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4 flex gap-2 overflow-hidden"
            >
                <input 
                    placeholder="새로운 항목 이름 (예: 벌칙, 포인트)" 
                    value={newColumn} 
                    onChange={e => setNewColumn(e.target.value)}
                    className="input-field flex-1"
                    autoFocus
                />
                <button type="submit" className="bg-blue-500 text-white px-6 rounded-lg whitespace-nowrap">추가</button>
                <button type="button" onClick={() => setIsAddingColumn(false)} className="bg-gray-200 px-4 rounded-lg">취소</button>
            </motion.form>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/40 shadow-sm overflow-hidden flex-1 overflow-y-auto">
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-orange-100/50 border-b border-orange-200/50">
                    <th className="p-4 font-bold text-gray-700 w-16">#</th>
                    <th className="p-4 font-bold text-gray-700 min-w-[120px]">닉네임</th>
                    <th className="p-4 font-bold text-gray-700 min-w-[120px]">아이디</th>
                    {columns.map(col => (
                        <th key={col} className="p-4 font-bold text-gray-700 text-center min-w-[120px] group relative">
                            {col}
                             {isAdmin && (
                                <button 
                                    onClick={() => deleteColumn(col)}
                                    className="absolute top-2 right-2 text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={12} />
                                </button>
                             )}
                        </th>
                    ))}
                    <th className="p-4 w-10"></th>
                </tr>
            </thead>
            <tbody>
                {users.map((user, idx) => (
                    <motion.tr 
                        key={user.id} 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-white/40 transition-colors border-b border-gray-100/50 last:border-0"
                    >
                        <td className="p-4 text-gray-400 text-sm">{idx + 1}</td>
                        <td className="p-4 font-medium text-gray-900">{user.nickname}</td>
                        <td className="p-4 text-gray-500 font-mono text-sm">{user.userId || '-'}</td>
                        {columns.map(col => (
                            <td key={col} className="p-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                    {isAdmin && (
                                        <button 
                                            onClick={() => updateCount(user.id, col, -1)}
                                            className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Minus size={12} />
                                        </button>
                                    )}
                                    <span className={clsx(
                                        "font-bold text-lg min-w-[20px]", 
                                        user.counts[col] > 0 ? "text-blue-600" : "text-gray-300"
                                    )}>
                                        {user.counts[col] || ''}
                                    </span>
                                    {isAdmin && (
                                        <button 
                                            onClick={() => updateCount(user.id, col, 1)}
                                            className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-blue-100 hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Plus size={12} />
                                        </button>
                                    )}
                                </div>
                            </td>
                        ))}
                        <td className="p-4 text-right">
                             {isAdmin && (
                                <button 
                                    onClick={() => deleteUser(user.id)}
                                    className="text-gray-300 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                             )}
                        </td>
                    </motion.tr>
                ))}
            </tbody>
        </table>
        
        {loading ? (
            <div className="text-center py-20 text-gray-400">
                <p>데이터를 불러오는 중...</p>
            </div>
        ) : users.length === 0 && (
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
