import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CalendarPlus, Trash2, Clock, FileText } from 'lucide-react';

const COLORS = [
  { label: '파랑',   value: '#3B82F6' },
  { label: '빨강',   value: '#EF4444' },
  { label: '초록',   value: '#10B981' },
  { label: '주황',   value: '#F97316' },
  { label: '노랑',   value: '#F59E0B' },
  { label: '보라',   value: '#8B5CF6' },
  { label: '분홍',   value: '#EC4899' },
  { label: '회색',   value: '#6B7280' },
];

/**
 * AddEventModal
 * Props:
 *   isOpen, onClose, onConfirm({ title, color, time, memo }), onDelete(id)
 *   start, end, event (existing CalendarEvent object for edit mode)
 */
const AddEventModal = ({ isOpen, onClose, onConfirm, onDelete, start, end, event }) => {
  const [title, setTitle] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [time,  setTime]  = useState('');   // "HH:mm" or empty
  const [memo,  setMemo]  = useState('');

  useEffect(() => {
    if (event) {
      setTitle(event.title || '');
      setColor(event.color  || '#3B82F6');
      setTime(event.time    || '');
      setMemo(event.memo    || '');
    } else {
      setTitle('');
      setColor('#3B82F6');
      setTime('');
      setMemo('');
    }
  }, [event, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onConfirm({ title: title.trim(), color, time: time.trim(), memo: memo.trim() });
  };

  if (!isOpen) return null;

  const dateLabel = start
    ? start.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
    : event?.start?.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <CalendarPlus size={20} className="text-blue-500" />
                {event ? '일정 수정' : '일정 추가'}
              </h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1 hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>

            {/* Date indicator */}
            {dateLabel && (
              <div className="mb-4 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg inline-block">
                📅 {dateLabel}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  일정 내용 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                  placeholder="예: 포코피아"
                  autoFocus
                />
              </div>

              {/* Time */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                  <Clock size={13} className="text-gray-400" /> 시간 <span className="text-gray-400 font-normal">(선택)</span>
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                />
                {time && (
                  <p className="text-xs text-gray-400 mt-1 ml-1">
                    → {formatDisplayTime(time)} 표시
                  </p>
                )}
              </div>

              {/* Memo */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                  <FileText size={13} className="text-gray-400" /> 메모 <span className="text-gray-400 font-normal">(선택)</span>
                </label>
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm resize-none leading-relaxed"
                  placeholder="추가 정보나 메모를 입력하세요..."
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">색상</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      title={c.label}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        color === c.value ? 'border-gray-800 scale-115 shadow-md' : 'border-transparent hover:scale-110'
                      }`}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition-all text-sm"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] bg-blue-600 text-white py-2.5 px-8 rounded-xl font-semibold hover:bg-blue-700 transition-all active:scale-95 text-sm"
                  >
                    {event ? '수정 완료' : '저장'}
                  </button>
                </div>

                {event && (
                  <button
                    type="button"
                    onClick={() => onDelete(event.id)}
                    className="w-full flex items-center justify-center gap-2 text-red-500 py-2 text-sm font-semibold hover:bg-red-50 rounded-xl transition-colors"
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

/** "HH:mm" → "오전/오후 H:mm" */
export function formatDisplayTime(timeStr) {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const period = h < 12 ? '오전' : '오후';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${period} ${displayH}:${String(m).padStart(2, '0')}`;
}

export default AddEventModal;
