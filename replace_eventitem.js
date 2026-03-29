const fs = require('fs');
let code = fs.readFileSync('src/pages/CalendarPage.jsx', 'utf8');

const regex = /\/\*\s*─────────────────────────────────────────────────────\n\s*EventItem[\s\S]*?(?=\/\*\s*─────────────────────────────────────────────────────\n\s*Custom Month Grid Cell)/;

const replacement = `/* ─────────────────────────────────────────────────────
   EventItem – single event row (used in MonthCell)
───────────────────────────────────────────────────── */
const EventItem = ({ ev, isAdmin, onClick }) => {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: "right", y: "bottom" });
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

  /* Calculate space and decide direction */
  const calculatePosition = useCallback(() => {
    if (tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Use estimated popup sizes to predict overflow
      const popupWidth = 260; // Max expected width
      const popupHeight = 220; // Max expected height

      let x = "right";
      let y = "bottom";

      // If there's no space on the right but there is space on the left, open left
      if (rect.right + popupWidth > vw && rect.left - popupWidth > 0) {
        x = "left";
      }
      
      // If there's no space on the bottom but there is space on the top, open top
      if (rect.bottom + popupHeight > vh && rect.top - popupHeight > 0) {
        y = "top";
      }

      setTooltipPos({ x, y });
    }
  }, []);

  const checkPositionAndOpen = (action) => {
    calculatePosition();
    action();
  };

  useEffect(() => {
    if (isHovered || tooltipOpen) {
      const handleResizeOrScroll = () => calculatePosition();
      window.addEventListener("resize", handleResizeOrScroll);
      window.addEventListener("scroll", handleResizeOrScroll, true);
      return () => {
        window.removeEventListener("resize", handleResizeOrScroll);
        window.removeEventListener("scroll", handleResizeOrScroll, true);
      };
    }
  }, [isHovered, tooltipOpen, calculatePosition]);

  const handleMouseEnter = () => checkPositionAndOpen(() => setIsHovered(true));
  const handleMouseLeave = () => setIsHovered(false);
  
  const handleClick = (e) => {
    e.stopPropagation();
    if (isAdmin) {
      onClick(ev);             // admin → open edit modal
    } else if (hasDetail) {
      checkPositionAndOpen(() => setTooltipOpen((o) => !o)); // user → toggle popup
    }
  };

  return (
    <div 
      className="relative" 
      ref={tooltipRef}
      style={{ zIndex: isHovered ? 9999 : (tooltipOpen ? 9000 : 1) }}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
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
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
            className={[
              "absolute z-[10001] w-52 bg-[#FFFFE1] border border-gray-400 p-3 shadow-xl rounded-sm pointer-events-none",
              tooltipPos.x === "left" ? "right-[90%]" : "left-[90%]",
              tooltipPos.y === "top" ? "bottom-[-10px]" : "top-[-10px]"
            ].join(" ")}
          >
            <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-yellow-200/50">
              <FileText size={11} className="text-yellow-700/60" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-800/60">Memo</span>
            </div>
            <div className="text-[13px] text-gray-800 leading-relaxed break-words whitespace-pre-wrap font-medium">
              {ev.memo}
            </div>
            {/* Pointer arrow */}
            {tooltipPos.x === "left" ? (
              <>
                <div className={\`absolute \${tooltipPos.y === "top" ? "bottom-[15px]" : "top-[15px]"} -right-[6px] w-0 h-0 border-t-[6px] border-t-transparent border-l-[6px] border-l-gray-400 border-b-[6px] border-b-transparent\`} />
                <div className={\`absolute \${tooltipPos.y === "top" ? "bottom-[15px]" : "top-[15px]"} -right-[5px] w-0 h-0 border-t-[6px] border-t-transparent border-l-[6px] border-l-[#FFFFE1] border-b-[6px] border-b-transparent\`} />
              </>
            ) : (
              <>
                <div className={\`absolute \${tooltipPos.y === "top" ? "bottom-[15px]" : "top-[15px]"} -left-[6px] w-0 h-0 border-t-[6px] border-t-transparent border-r-[6px] border-r-gray-400 border-b-[6px] border-b-transparent\`} />
                <div className={\`absolute \${tooltipPos.y === "top" ? "bottom-[15px]" : "top-[15px]"} -left-[5px] w-0 h-0 border-t-[6px] border-t-transparent border-r-[6px] border-r-[#FFFFE1] border-b-[6px] border-b-transparent\`} />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Read-only popup (non-admin) */}
      <AnimatePresence>
        {!isAdmin && tooltipOpen && hasDetail && (
          <motion.div
            initial={{ opacity: 0, y: tooltipPos.y === "top" ? 4 : -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: tooltipPos.y === "top" ? 4 : -4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className={[
              "absolute z-[9000] w-56 bg-white rounded-xl shadow-xl border border-gray-100 p-3",
              tooltipPos.x === "left" ? "right-0" : "left-0",
              tooltipPos.y === "top" ? "bottom-full mb-1" : "top-full mt-1"
            ].join(" ")}
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

`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/pages/CalendarPage.jsx', code);
