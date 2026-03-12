import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CalendarPlus, Trash2 } from 'lucide-react';

const PRESET_COLORS = [
  '#3b82f6', // Blue (default)
  '#ef4444', // Red
  '#f59e0b', // Yellow/Orange
  '#10b981', // Green
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#64748b'  // Slate
];

const AddEventModal = ({ isOpen, onClose, onConfirm, onDelete, start, end, event }) => {
  const [title, setTitle] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setColor(event.color || PRESET_COLORS[0]);
    } else {
      setTitle('');
      setColor(PRESET_COLORS[0]);
    }
  }, [event, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim()) {
      onConfirm({ title, color });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden"
        >
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <CalendarPlus size={20} className="text-blue-500" /> 
                {event ? '일정 수정' : '일정 추가'}
              </h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">일정 내용</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                  placeholder="예: 방송 8시"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">색상 선택</label>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-full shadow-sm transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-gray-600 scale-110' : 'hover:scale-105'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              
              <div className="text-xs text-gray-500">
                <p>시작: {start ? start.toLocaleString() : event?.start?.toLocaleString()}</p>
                <p>종료: {end ? end.toLocaleString() : event?.end?.toLocaleString()}</p>
              </div>

              <div className="flex flex-col gap-2 mt-6">
                  <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-all"
                    >
                        취소
                    </button>
                    <button
                        type="submit"
                        className="flex-2 bg-black text-white py-3 px-8 rounded-xl font-medium hover:bg-gray-800 transition-all transform active:scale-95"
                    >
                        {event ? '수정 완료' : '저장'}
                    </button>
                  </div>
                  
                  {event && (
                    <button
                        type="button"
                        onClick={() => onDelete(event.id)}
                        className="w-full flex items-center justify-center gap-2 text-red-500 py-2 text-sm font-medium hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <Trash2 size={14} /> 삭제하기
                    </button>
                  )}
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AddEventModal;
