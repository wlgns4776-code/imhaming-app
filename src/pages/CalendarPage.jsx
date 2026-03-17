import React, { useState, useEffect, useCallback, useRef } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import {
  format,
  parse,
  startOfWeek,
  getDay,
  startOfMonth,
  endOfMonth,
  startOfWeek as startOfWeekFn,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
} from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight, PenLine, Clock, FileText, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { base44 } from "../api/base44Client";
import AddEventModal, { formatDisplayTime } from "../components/AddEventModal";

/* ─────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────── */
const locales = { ko };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const VIEW_LABELS = { month: "월", week: "주", day: "일" };
const KO_DAYS    = ["일", "월", "화", "수", "목", "금", "토"];

const HOLIDAYS = {
  "2026-03-01": "삼일절",
  "2026-03-02": "대체공휴일(삼일절)",
};

function formatMonthTitle(date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

function isoDate(d) {
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const dd   = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Sort events for a day:
 * - Events WITH time: ascending by time (HH:mm)
 * - Events WITHOUT time: appended at the bottom, sorted by order
 */
function sortDayEvents(events) {
  const withTime    = events.filter((e) => e.time && e.time.trim() !== "");
  const withoutTime = events.filter((e) => !e.time || e.time.trim() === "");
  withTime.sort((a, b) => a.time.localeCompare(b.time));
  withoutTime.sort((a, b) => (a.order || 0) - (b.order || 0));
  return [...withTime, ...withoutTime];
}

/* ─────────────────────────────────────────────────────
   EventItem – single event row (used in MonthCell)
───────────────────────────────────────────────────── */
const EventItem = ({ ev, isAdmin, onClick }) => {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const tooltipRef = useRef(null);
  const hasDetail = ev.memo || ev.time;

  /* Close tooltip when clicking outside */
  useEffect(() => {
    if (!tooltipOpen) return;
    const handler = (e) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target)) {
        setTooltipOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [tooltipOpen]);

  const handleClick = (e) => {
    e.stopPropagation();
    if (isAdmin) {
      onClick(ev);             // admin → open edit modal
    } else if (hasDetail) {
      setTooltipOpen((o) => !o); // user → toggle read-only popup
    }
  };

  return (
    <div 
      className="relative" 
      ref={tooltipRef}
      style={{ zIndex: isHovered ? 9999 : (tooltipOpen ? 9000 : 1) }}
    >
      {/* Excel-style red triangle for memo indication */}
      {ev.memo && (
        <div className="absolute -top-0.5 -right-0.5 w-0 h-0 border-t-[6px] border-t-red-500 border-l-[6px] border-l-transparent pointer-events-none opacity-80" />
      )}
      {/* Row */}
      <div
        className={[
          "flex items-start gap-1.5 group",
          (isAdmin || hasDetail) ? "cursor-pointer" : "cursor-default",
        ].join(" ")}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Dot */}
        <span
          className="mt-[3px] w-[7px] h-[7px] rounded-full flex-shrink-0 transition-transform group-hover:scale-125"
          style={{ backgroundColor: ev.color || "#3B82F6" }}
        />

        <div className="flex flex-col min-w-0">
          {/* Time badge */}
          {ev.time && (
            <span className="text-[9px] font-semibold text-gray-400 leading-none mb-0.5 flex items-center gap-0.5">
              <Clock size={7} className="inline-block" />
              {formatDisplayTime(ev.time)}
            </span>
          )}
          {/* Title */}
          <span
            className="text-[11.5px] leading-tight text-gray-700 group-hover:text-gray-900 transition-colors"
            style={{ wordBreak: "keep-all", whiteSpace: "normal" }}
          >
            {ev.title}
          </span>
        </div>
      </div>

      {/* Hover tooltip (Excel style) */}
      <AnimatePresence>
        {isHovered && ev.memo && !tooltipOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="absolute z-[10001] left-[90%] top-[-10px] w-52 bg-[#FFFFE1] border border-gray-400 p-3 shadow-xl rounded-sm pointer-events-none"
          >
            <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-yellow-200/50">
              <FileText size={11} className="text-yellow-700/60" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-800/60">Memo</span>
            </div>
            <div className="text-[13px] text-gray-800 leading-relaxed break-words whitespace-pre-wrap font-medium">
              {ev.memo}
            </div>
            {/* Pointer arrow */}
            <div className="absolute top-[15px] -left-[6px] w-0 h-0 border-t-[6px] border-t-transparent border-r-[6px] border-r-gray-400 border-b-[6px] border-b-transparent" />
            <div className="absolute top-[15px] -left-[5px] w-0 h-0 border-t-[6px] border-t-transparent border-r-[6px] border-r-[#FFFFE1] border-b-[6px] border-b-transparent" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Read-only popup (non-admin) */}
      <AnimatePresence>
        {!isAdmin && tooltipOpen && hasDetail && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute z-[9000] left-0 top-full mt-1 w-56 bg-white rounded-xl shadow-xl border border-gray-100 p-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Popup header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: ev.color || "#3B82F6" }}
                />
                <span className="font-bold text-sm text-gray-800 leading-tight">
                  {ev.title}
                </span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setTooltipOpen(false); }}
                className="text-gray-300 hover:text-gray-500 flex-shrink-0 transition-colors"
              >
                <X size={13} />
              </button>
            </div>

            {ev.time && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
                <Clock size={11} className="text-blue-400" />
                <span className="font-semibold text-blue-600">{formatDisplayTime(ev.time)}</span>
              </div>
            )}

            {ev.memo && (
              <div className="flex gap-1.5 text-xs text-gray-600 mt-1.5 pt-1.5 border-t border-gray-100">
                <FileText size={11} className="text-gray-400 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed whitespace-pre-wrap break-words">{ev.memo}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─────────────────────────────────────────────────────
   Custom Month Grid Cell
───────────────────────────────────────────────────── */
const MonthCell = ({ date, currentMonth, events, isToday, onSlotClick, onEventClick, isAdmin }) => {
  const iso        = isoDate(date);
  const dayOfWeek  = date.getDay();
  const holiday    = HOLIDAYS[iso];
  const isCurrentMonth = isSameMonth(date, currentMonth);

  const dayEvents  = sortDayEvents(
    events.filter((e) => isSameDay(new Date(e.start), date))
  );

  const dateNumberColor = () => {
    if (!isCurrentMonth) return "text-gray-300";
    if (holiday || dayOfWeek === 0) return "text-red-500";
    if (dayOfWeek === 6) return "text-blue-500";
    return "text-gray-800";
  };

  return (
    <div
      className={[
        "flex flex-col min-h-[110px] px-1.5 pt-1.5 pb-2 border-b border-r border-gray-100 select-none transition-colors",
        isToday ? "bg-blue-50/70" : "bg-white hover:bg-gray-50/60",
        !isCurrentMonth ? "opacity-50" : "",
        isAdmin ? "cursor-pointer" : "cursor-default",
      ].join(" ")}
      onClick={() => isAdmin && onSlotClick({ start: date, end: date })}
    >
      {/* Date number row */}
      <div className="flex items-start gap-1 mb-1.5">
        <span
          className={[
            "text-[13px] font-bold leading-none",
            dateNumberColor(),
            isToday
              ? "w-6 h-6 flex items-center justify-center bg-blue-600 text-white rounded-full !text-white text-[12px]"
              : "",
          ].join(" ")}
        >
          {format(date, "d")}
        </span>
        {holiday && (
          <span className="text-[9px] text-red-400 font-medium leading-none mt-0.5 truncate">
            {holiday}
          </span>
        )}
      </div>

      {/* Events */}
      <div className="flex flex-col gap-1.5">
        {dayEvents.map((ev) => (
          <EventItem
            key={ev.id}
            ev={ev}
            isAdmin={isAdmin}
            onClick={onEventClick}
          />
        ))}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────
   Custom Month Grid
───────────────────────────────────────────────────── */
const MonthGrid = ({ currentDate, events, onSlotClick, onEventClick, isAdmin }) => {
  const today      = new Date();
  const monthStart = startOfMonth(currentDate);
  const monthEnd   = endOfMonth(currentDate);
  const gridStart  = startOfWeekFn(monthStart, { weekStartsOn: 0 });
  const gridEnd    = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const weeks = [];
  let day = gridStart;
  while (day <= gridEnd) {
    const week = [];
    for (let i = 0; i < 7; i++) { week.push(day); day = addDays(day, 1); }
    weeks.push(week);
  }

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-t border-gray-200 bg-gray-50/80">
        {KO_DAYS.map((d, i) => (
          <div
            key={d}
            className={[
              "py-2 text-center text-[12px] font-semibold",
              i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-500",
            ].join(" ")}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 flex-1">
          {week.map((d, di) => (
            <MonthCell
              key={di}
              date={d}
              currentMonth={currentDate}
              events={events}
              isToday={isSameDay(d, today)}
              onSlotClick={onSlotClick}
              onEventClick={onEventClick}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────────────
   Week / Day view (react-big-calendar)
───────────────────────────────────────────────────── */
const RBCView = ({ view, currentDate, events, onSelectSlot, onSelectEvent, isAdmin }) => (
  <div className="flex-1 overflow-auto rbc-wrapper">
    <Calendar
      localizer={localizer}
      culture="ko"
      events={events}
      startAccessor="start"
      endAccessor="end"
      defaultView={view}
      view={view}
      date={currentDate}
      onNavigate={() => {}}
      style={{ height: "100%", minHeight: 480 }}
      selectable={isAdmin}
      onSelectSlot={onSelectSlot}
      onSelectEvent={onSelectEvent}
      toolbar={false}
      messages={{ today: "오늘", previous: "이전", next: "다음", month: "월", week: "주", day: "일" }}
      eventPropGetter={(event) => ({
        style: {
          backgroundColor: event.color || "#3B82F6",
          borderColor: event.color || "#3B82F6",
          borderRadius: "6px",
          fontSize: "0.78rem",
          padding: "1px 5px",
          border: "none",
        },
      })}
    />
    <style>{`
      .rbc-wrapper .rbc-calendar { font-family: 'Inter', sans-serif; }
      .rbc-wrapper .rbc-header { background: #f9fafb; border-color: #f3f4f6 !important; padding: 8px 4px; font-size: 0.8rem; font-weight: 600; color: #6b7280; }
      .rbc-wrapper .rbc-today { background: #eff6ff; }
    `}</style>
  </div>
);

/* ─────────────────────────────────────────────────────
   Memo (sticky note) Panel – admin only
───────────────────────────────────────────────────── */
const MemoPanel = ({ isOpen, onClose }) => {
  const STORAGE_KEY = "imhaming_calendar_memo";
  const [text, setText] = useState(() => localStorage.getItem(STORAGE_KEY) || "");

  const save = () => localStorage.setItem(STORAGE_KEY, text);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.2 }}
          className="absolute right-0 top-14 z-50 w-72 bg-yellow-50 rounded-2xl shadow-xl border border-yellow-200 p-4 flex flex-col gap-2"
          style={{ minHeight: 220 }}
        >
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-bold text-sm text-yellow-800 flex items-center gap-1">
              <PenLine size={14} /> 메모장
            </h3>
            <button
              onClick={() => { save(); onClose(); }}
              className="text-xs bg-yellow-200 hover:bg-yellow-300 text-yellow-800 px-2 py-1 rounded-lg transition-colors"
            >
              저장 &amp; 닫기
            </button>
          </div>
          <textarea
            className="flex-1 w-full bg-transparent resize-none outline-none text-sm text-yellow-900 placeholder-yellow-400 leading-relaxed"
            style={{ minHeight: 150 }}
            placeholder="간단한 메모를 입력하세요..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ─────────────────────────────────────────────────────
   Main CalendarPage
───────────────────────────────────────────────────── */
const CalendarPage = () => {
  const [events, setEvents]       = useState([]);
  const { isAdmin }               = useAuth();

  const [view, setView]           = useState("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isMemoOpen, setIsMemoOpen]   = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState({ start: null, end: null });
  const [selectedEvent, setSelectedEvent] = useState(null);

  /* ── Fetch events ─────────────────────────────── */
  const fetchEvents = useCallback(async () => {
    try {
      const items = await base44.entities.CalendarEvent.list();
      const parsed = items
        .map((e) => ({ ...e, start: new Date(e.start), end: new Date(e.end) }));
      setEvents(parsed);
    } catch (err) {
      console.error("Failed to fetch events:", err);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    const id = setInterval(fetchEvents, 6000);
    return () => clearInterval(id);
  }, [fetchEvents]);

  /* ── Navigation ───────────────────────────────── */
  const goToday = () => setCurrentDate(new Date());
  const goPrev  = () => {
    if (view === "month") setCurrentDate((d) => subMonths(d, 1));
    else if (view === "week") setCurrentDate((d) => subWeeks(d, 1));
    else setCurrentDate((d) => addDays(d, -1));
  };
  const goNext  = () => {
    if (view === "month") setCurrentDate((d) => addMonths(d, 1));
    else if (view === "week") setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate((d) => addDays(d, 1));
  };

  /* ── Slot / Event handlers ────────────────────── */
  const handleSelectSlot  = ({ start, end }) => {
    if (!isAdmin) return;
    setSelectedEvent(null);
    setSelectedSlot({ start, end });
    setIsModalOpen(true);
  };

  const handleSelectEvent = (ev) => {
    if (!isAdmin) return;
    setSelectedEvent(ev);
    setSelectedSlot({ start: ev.start, end: ev.end });
    setIsModalOpen(true);
  };

  const handleSaveEvent = async ({ title, color, time, memo }) => {
    try {
      if (selectedEvent) {
        /* Update */
        const updated = await base44.entities.CalendarEvent.update(selectedEvent.id, {
          title,
          color,
          time,
          memo,
          start: selectedEvent.start.toISOString(),
          end:   selectedEvent.end.toISOString(),
          order: selectedEvent.order || 0,
        });
        setEvents((prev) =>
          prev.map((e) =>
            e.id === updated.id
              ? { ...updated, start: new Date(updated.start), end: new Date(updated.end) }
              : e
          )
        );
      } else {
        /* Create */
        const { start, end } = selectedSlot;
        const dayEvents = events.filter(
          (e) => e.start.toDateString() === start.toDateString()
        );
        const maxOrder = dayEvents.length > 0
          ? Math.max(...dayEvents.map((e) => e.order || 0))
          : -1;

        const created = await base44.entities.CalendarEvent.create({
          title,
          color,
          time,
          memo,
          start: start.toISOString(),
          end:   end.toISOString(),
          order: maxOrder + 1,
        });
        setEvents((prev) => [
          ...prev,
          { ...created, start: new Date(created.start), end: new Date(created.end) },
        ]);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Failed to save event:", err);
      alert("일정 저장에 실패했습니다.");
    }
  };

  const handleDeleteEvent = async (id) => {
    try {
      await base44.entities.CalendarEvent.delete(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
      setIsModalOpen(false);
    } catch (err) {
      console.error("Failed to delete event:", err);
    }
  };

  /* ── Render ───────────────────────────────────── */
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col"
      style={{ minHeight: "calc(100vh - 80px)", fontFamily: "'MemomentKkukkuk', sans-serif" }}
    >
      {/* ── Calendar Card ─────────────────────────── */}
      <div className="bg-white rounded-3xl shadow-md border border-gray-100 flex flex-col flex-1 overflow-hidden relative">

        {/* ── Toolbar ──────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 gap-2 flex-wrap">

          {/* Left: Title */}
          <div className="flex flex-col">
            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight leading-none">
              임하밍 일정
            </h2>
            <p className="text-[11px] text-gray-400 mt-0.5">임하밍의 방송 / 이벤트 일정</p>
          </div>

          {/* Center: Today + Nav */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToday}
              className="px-3 py-1.5 text-sm font-semibold border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Today
            </button>
            <div className="flex items-center gap-0.5">
              <button onClick={goPrev} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                <ChevronLeft size={18} />
              </button>
              <span className="text-base font-bold text-gray-800 min-w-[112px] text-center px-1">
                {formatMonthTitle(currentDate)}
              </span>
              <button onClick={goNext} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Right: View toggles + Memo (admin only) */}
          <div className="flex items-center gap-2">
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              {["month", "week", "day"].map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={[
                    "px-3 py-1.5 text-sm font-semibold transition-colors",
                    view === v ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-50",
                  ].join(" ")}
                >
                  {VIEW_LABELS[v]}
                </button>
              ))}
            </div>

            {/* Memo – admin only */}
            {isAdmin && (
              <button
                onClick={() => setIsMemoOpen((o) => !o)}
                className={[
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors",
                  isMemoOpen
                    ? "bg-yellow-100 border-yellow-300 text-yellow-800"
                    : "border-gray-200 text-gray-500 hover:bg-gray-50",
                ].join(" ")}
              >
                <PenLine size={14} /> 메모장
              </button>
            )}
          </div>
        </div>

        {/* Memo panel – admin only */}
        {isAdmin && (
          <div className="relative">
            <MemoPanel isOpen={isMemoOpen} onClose={() => setIsMemoOpen(false)} />
          </div>
        )}

        {/* ── Calendar Body ───────────────────── */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {view === "month" ? (
            <MonthGrid
              currentDate={currentDate}
              events={events}
              onSlotClick={handleSelectSlot}
              onEventClick={handleSelectEvent}
              isAdmin={isAdmin}
            />
          ) : (
            <RBCView
              view={view}
              currentDate={currentDate}
              events={events}
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              isAdmin={isAdmin}
            />
          )}
        </div>
      </div>

      {/* ── Add/Edit Modal (admin only) ────────── */}
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
