const fs = require('fs');

const code = fs.readFileSync('src/pages/CalendarPage.jsx', 'utf8');

const regex = /\/\*\s*─────────────────────────────────────────────────────\n\s*EventItem[\s\S]*?(?=\/\*\s*─────────────────────────────────────────────────────\n\s*Custom Month Grid Cell)/;

const newCode = `/* ─────────────────────────────────────────────────────
   EventItem – single event row (used in MonthCell)
───────────────────────────────────────────────────── */
const EventItem = ({ ev, isAdmin, onClick }) => {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState("right");
  const [isMobile, setIsMobile] = useState(false);
  const tooltipRef = useRef(null);
  const hasDetail = ev.memo || ev.time;

  /* Check mobile and handle window resize */
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize(); // initial check
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* Close tooltip when clicking outside */
  useEffect(() => {
    if (!tooltipOpen) return;
    const handler = (e) => {
      // Mobile modal handles background clicks itself
      if (tooltipRef.current && !tooltipRef.current.contains(e.target) && !isMobile) {
        setTooltipOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [tooltipOpen, isMobile]);

  /* Calculate space and decide direction */
  const checkPositionAndOpen = (action) => {
    if (tooltipRef.current && !isMobile) {
      const rect = tooltipRef.current.getBoundingClientRect();
      if (window.innerWidth - rect.right < 250) {
        setTooltipPos("left");
      } else {
        setTooltipPos("right");
      }
    }
    action();
  };

  const handleMouseEnter = () => {
    if (!isMobile) checkPositionAndOpen(() => setIsHovered(true));
  };

  const handleMouseLeave = () => {
    if (!isMobile) setIsHovered(false);
  };

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

      {/* ── DESKTOP: Hover tooltip (Excel style) ── */}
      <AnimatePresence>
        {isHovered && ev.memo && !tooltipOpen && !isMobile && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className={\`absolute z-[10001] \${tooltipPos === "left" ? "right-[90%]" : "left-[90%]"} top-[-10px] w-52 bg-[#FFFFE1] border border-gray-400 p-3 shadow-xl rounded-sm pointer-events-none\`}
          >
            <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-yellow-200/50">
              <FileText size={11} className="text-yellow-700/60" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-800/60">Memo</span>
            </div>
            <div className="text-[13px] text-gray-800 leading-relaxed break-words whitespace-pre-wrap font-medium">
              {ev.memo}
            </div>
            {/* Pointer arrow */}
            {tooltipPos === "left" ? (
              <>
                <div className="absolute top-[15px] -right-[6px] w-0 h-0 border-t-[6px] border-t-transparent border-l-[6px] border-l-gray-400 border-b-[6px] border-b-transparent" />
                <div className="absolute top-[15px] -right-[5px] w-0 h-0 border-t-[6px] border-t-transparent border-l-[6px] border-l-[#FFFFE1] border-b-[6px] border-b-transparent" />
              </>
            ) : (
              <>
                <div className="absolute top-[15px] -left-[6px] w-0 h-0 border-t-[6px] border-t-transparent border-r-[6px] border-r-gray-400 border-b-[6px] border-b-transparent" />
                <div className="absolute top-[15px] -left-[5px] w-0 h-0 border-t-[6px] border-t-transparent border-r-[6px] border-r-[#FFFFE1] border-b-[6px] border-b-transparent" />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── DESKTOP: Read-only popup (non-admin) ── */}
      <AnimatePresence>
        {!isAdmin && tooltipOpen && hasDetail && !isMobile && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className={\`absolute z-[9000] \${tooltipPos === "left" ? "right-0" : "left-0"} top-full mt-1 w-56 bg-white rounded-xl shadow-xl border border-gray-100 p-3\`}
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

      {/* ── MOBILE: Centered Modal (for User read-only) ── */}
      <AnimatePresence>
        {!isAdmin && tooltipOpen && hasDetail && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50"
            onClick={(e) => {
              e.stopPropagation();
              setTooltipOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between p-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-2 pr-4">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: ev.color || "#3B82F6" }}
                  />
                  <span className="font-bold text-base text-gray-800 leading-snug">
                    {ev.title}
                  </span>
                </div>
                <button
                  onClick={() => setTooltipOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
                >
                  <X size={18} />
                </button>
              </div>
              
              <div className="p-4 flex flex-col gap-4">
                {ev.time && (
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Clock size={16} className="text-blue-500" />
                    </div>
                    <span className="font-semibold text-gray-800 tracking-wide text-[15px]">
                      {formatDisplayTime(ev.time)}
                    </span>
                  </div>
                )}
                
                {ev.memo && (
                  <div className="flex items-start gap-3 text-sm text-gray-600">
                    <div className="w-8 h-8 rounded-full bg-yellow-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FileText size={16} className="text-yellow-600" />
                    </div>
                    <p className="leading-relaxed whitespace-pre-wrap break-words pt-1 flex-1 text-[14px]">
                      {ev.memo}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

`;

const replacedContent = code.replace(regex, newCode);
fs.writeFileSync('src/pages/CalendarPage.jsx', replacedContent);
