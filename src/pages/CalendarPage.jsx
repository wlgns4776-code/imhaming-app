import React, { useState, useEffect, useRef } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit3, Check, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import { base44, COLLECTIONS } from '../api/base44Client';
import AddEventModal from '../components/AddEventModal';
import CustomDateHeader from "../components/CustomDateHeader";
import GlobalHeader from '../components/GlobalHeader';

const locales = {
  'ko': ko,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const CustomEvent = ({ event }) => (
  <div className="flex w-full cursor-pointer text-gray-800 items-center overflow-hidden" style={{ whiteSpace: 'nowrap', lineHeight: '1', gap: '4px', padding: '0' }}>
    <div 
      className="flex-shrink-0 rounded-full" 
      style={{ 
        width: '6px', 
        height: '6px', 
        backgroundColor: event.color || '#3b82f6', 
      }} 
    />
    <span className="text-[11px] truncate flex-1 text-left font-medium" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
      {event.title}
    </span>
  </div>
);

const CalendarPage = () => {
  const [events, setEvents] = useState([]);
  const { isAdmin } = useAuth();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('month');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState({ start: null, end: null });
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Memo State
  const [isMemoOpen, setIsMemoOpen] = useState(false);
  const [memoContent, setMemoContent] = useState(Array(25).fill(''));
  const [memoId, setMemoId] = useState(null);
  const [memoStatus, setMemoStatus] = useState('');
  const typingTimeoutRef = useRef(null);
  const memoInputRefs = useRef([]);

  const fetchMemo = async () => {
    if (!isAdmin) return;
    try {
      const items = await base44.entities.CalendarMemo.list();
      if (items && items.length > 0) {
        const sorted = items.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        const lines = (sorted[0].content || '').split('\n');
        const paddedLines = Array(25).fill('').map((_, i) => lines[i] || '');
        setMemoContent(paddedLines);
        setMemoId(sorted[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch memo:", error);
    }
  };

  const handleLineChange = (index, value) => {
    const newContent = [...memoContent];
    newContent[index] = value;
    setMemoContent(newContent);
    setMemoStatus('저장 중...');

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(async () => {
      try {
        const now = new Date().toISOString();
        const contentStr = newContent.join('\n');
        if (memoId) {
          await base44.entities.CalendarMemo.update(memoId, {
            content: contentStr,
            updatedAt: now
          });
        } else {
          const created = await base44.entities.CalendarMemo.create({
            content: contentStr,
            updatedAt: now
          });
          setMemoId(created.id);
        }
        setMemoStatus('저장 완료!');
        setTimeout(() => setMemoStatus(''), 2000);
      } catch (err) {
        console.error("Failed to save memo:", err);
        setMemoStatus('저장 실패!');
      }
    }, 1000);
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (index > 0) memoInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      if (index < memoContent.length - 1) memoInputRefs.current[index + 1]?.focus();
    }
  };

  const fetchEvents = async () => {
    try {
      const items = await base44.entities.CalendarEvent.list();
      const parsed = items.map(e => ({
        ...e,
        start: new Date(e.start),
        end: new Date(e.end)
      })).sort((a, b) => (a.order || 0) - (b.order || 0));
      setEvents(parsed);
    } catch (error) {
      console.error("Failed to fetch events:", error);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchEvents();
    fetchMemo();

    // Polling for real-time updates (every 5 seconds)
    const intervalId = setInterval(fetchEvents, 5000);

    return () => clearInterval(intervalId);
  }, [isAdmin]);

  const handleSelectSlot = ({ start, end }) => {
    if (!isAdmin) return;
    setSelectedEvent(null);
    setSelectedSlot({ start, end });
    setIsModalOpen(true);
  };

  const handleSaveEvent = async ({ title, color }) => {
    try {
      if (selectedEvent) {
        // Update
        const updated = await base44.entities.CalendarEvent.update(selectedEvent.id, {
          title,
          color,
          start: selectedEvent.start.toISOString(),
          end: selectedEvent.end.toISOString(),
          order: selectedEvent.order || 0
        });
        setEvents(prev => prev.map(e => e.id === updated.id ? { ...updated, start: new Date(updated.start), end: new Date(updated.end) } : e).sort((a, b) => (a.order || 0) - (b.order || 0)));
      } else {
        // Create
        const { start, end } = selectedSlot;
        const dayEvents = events.filter(e => e.start.toDateString() === start.toDateString());
        const maxOrder = dayEvents.length > 0 ? Math.max(...dayEvents.map(e => e.order || 0)) : -1;
        
        const newEvent = { 
            title, 
            color,
            start: start.toISOString(), 
            end: end.toISOString(),
            order: maxOrder + 1
        };
        const created = await base44.entities.CalendarEvent.create(newEvent);
        setEvents(prev => [...prev, { ...created, start: new Date(created.start), end: new Date(created.end) }].sort((a, b) => (a.order || 0) - (b.order || 0)));
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Failed to save event:", error);
      alert("일정 저장에 실패했습니다.");
    }
  };

  const handleSelectEvent = (event) => {
      if (!isAdmin) return;
      setSelectedEvent(event);
      setSelectedSlot({ start: event.start, end: event.end });
      setIsModalOpen(true);
  };

  const handleDeleteEvent = async (id) => {
    try {
        await base44.entities.CalendarEvent.delete(id);
        setEvents(prev => prev.filter(e => e.id !== id));
        setIsModalOpen(false);
    } catch (error) {
        console.error("Failed to delete event:", error);
        alert("일정 삭제에 실패했습니다.");
    }
  };

  const eventSorter = (a, b) => {
    // Primary: our custom order field
    if ((a.order || 0) !== (b.order || 0)) {
        return (a.order || 0) - (b.order || 0);
    }
    // Secondary: start time (if order is same)
    if (a.start.getTime() !== b.start.getTime()) {
        return a.start.getTime() - b.start.getTime();
    }
    return 0;
  };

  const handleNavigate = (action) => {
    if (action === 'PREV') {
      if (currentView === 'month') setCurrentDate(prev => subMonths(prev, 1));
      if (currentView === 'week') setCurrentDate(prev => subWeeks(prev, 1));
      if (currentView === 'day') setCurrentDate(prev => subDays(prev, 1));
    } else if (action === 'NEXT') {
      if (currentView === 'month') setCurrentDate(prev => addMonths(prev, 1));
      if (currentView === 'week') setCurrentDate(prev => addWeeks(prev, 1));
      if (currentView === 'day') setCurrentDate(prev => addDays(prev, 1));
    } else if (action === 'TODAY') {
      setCurrentDate(new Date());
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col p-3 bg-white/50 backdrop-blur-sm rounded-3xl shadow-sm border border-white/40 overflow-hidden w-full h-full"
    >
      <GlobalHeader 
        centerExtra={
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 w-full max-w-[320px]">
            <div className="flex justify-end">
              <button onClick={() => handleNavigate('TODAY')} className="px-3 py-1 bg-white/60 hover:bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 shadow-sm transition-colors">Today</button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleNavigate('PREV')} className="p-1 rounded-full hover:bg-white/80 text-gray-600 transition-colors"><ChevronLeft size={20}/></button>
              <span className="text-lg font-bold text-gray-800 min-w-[100px] text-center">{format(currentDate, 'yyyy년 M월', { locale: ko })}</span>
              <button onClick={() => handleNavigate('NEXT')} className="p-1 rounded-full hover:bg-white/80 text-gray-600 transition-colors"><ChevronRight size={20}/></button>
            </div>
            <div>{/* 빈 공간으로 중앙 밸런스 맞춤 */}</div>
          </div>
        }
        rightExtra={
          <>
            <div className="flex bg-white/60 p-1 rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-gray-100/80 backdrop-blur-md">
              <button onClick={() => setCurrentView('month')} className={currentView === 'month' ? "px-4 py-1.5 rounded-lg bg-white shadow-sm text-blue-600 font-bold text-sm transition-all" : "px-4 py-1.5 rounded-lg text-gray-500 font-semibold text-sm hover:bg-white/80 hover:text-gray-900 transition-all"}>Month</button>
              <button onClick={() => setCurrentView('week')} className={currentView === 'week' ? "px-4 py-1.5 rounded-lg bg-white shadow-sm text-blue-600 font-bold text-sm transition-all" : "px-4 py-1.5 rounded-lg text-gray-500 font-semibold text-sm hover:bg-white/80 hover:text-gray-900 transition-all"}>Week</button>
              <button onClick={() => setCurrentView('day')} className={currentView === 'day' ? "px-4 py-1.5 rounded-lg bg-white shadow-sm text-blue-600 font-bold text-sm transition-all" : "px-4 py-1.5 rounded-lg text-gray-500 font-semibold text-sm hover:bg-white/80 hover:text-gray-900 transition-all"}>Day</button>
            </div>
            {isAdmin && (
              <button 
                onClick={() => setIsMemoOpen(!isMemoOpen)}
                className={isMemoOpen ? "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white shadow-sm transition-all" : "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-white/80 text-gray-700 hover:bg-white border border-gray-200 shadow-sm transition-all"}
              >
                <Edit3 size={16} />
                메모장
              </button>
            )}
          </>
        }
      />

      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex-1 w-full relative min-w-0">
          <Calendar
            localizer={localizer}
            culture='ko'
            events={events}
            startAccessor="start"
            endAccessor="end"
            toolbar={false}
            date={currentDate}
            view={currentView}
            onNavigate={(newDate) => setCurrentDate(newDate)}
            onView={(newView) => setCurrentView(newView)}
            style={{ height: '100%' }}
            selectable={isAdmin}
            showAllEvents={true}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            eventSorter={eventSorter}
            views={['month', 'week', 'day']}
            defaultView="month"
            components={{
              month: {
                dateHeader: CustomDateHeader
              },
              event: CustomEvent
            }}
            eventPropGetter={(event) => ({
              style: {
                backgroundColor: 'transparent',
                borderColor: 'transparent',
                padding: '1px 2px',
                color: '#333'
              }
            })}
          />
        </div>

        <AnimatePresence>
          {isAdmin && isMemoOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0, marginLeft: 0 }}
              animate={{ width: 350, opacity: 1, marginLeft: 16 }}
              exit={{ width: 0, opacity: 0, marginLeft: 0 }}
              className="overflow-hidden bg-white/60 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/50 relative flex flex-col shrink-0"
            >
              <div className="p-4 border-b border-gray-200/50 flex-none bg-black/5 text-center">
                 <h2 className="text-xl font-black text-gray-700 tracking-wider">MEMO</h2>
              </div>
              <div 
                className="flex-1 relative flex flex-col p-4 overflow-y-auto"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    const emptyIndex = memoContent.findIndex(line => line === '');
                    const focusIndex = emptyIndex !== -1 ? emptyIndex : memoContent.length - 1;
                    memoInputRefs.current[focusIndex]?.focus();
                  }
                }}
              >
                <div className="flex flex-col gap-[1px]">
                  {memoContent.map((line, index) => (
                    <input
                      key={index}
                      ref={el => memoInputRefs.current[index] = el}
                      type="text"
                      value={line}
                      onChange={(e) => handleLineChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      placeholder={index === 0 ? '일정 관련 보관할 메모를 남겨주세요.' : ''}
                      className="w-full bg-transparent outline-none text-gray-800 placeholder-gray-400 px-1"
                      style={{
                        height: '32px',
                        border: 'none',
                        borderBottom: '1px solid #e0e0e0',
                      }}
                    />
                  ))}
                </div>
              </div>
              {memoStatus && (
                <div className="absolute bottom-3 right-4 flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-white/80 px-2 py-1 rounded-full backdrop-blur-sm shadow-sm border border-black/5">
                  {memoStatus === '저장 중...' ? <Loader2 size={12} className="animate-spin" /> : null}
                  {memoStatus === '저장 완료!' ? <Check size={12} className="text-green-500" /> : null}
                  <span className={memoStatus === '저장 완료!' ? 'text-green-500' : ''}>{memoStatus}</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <AddEventModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleSaveEvent}
        onDelete={handleDeleteEvent}
        start={selectedSlot.start}
        end={selectedSlot.end}
        event={selectedEvent}
      />
    </motion.div>
  );
};

export default CalendarPage;
