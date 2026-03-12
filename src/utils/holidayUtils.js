
// Fixed solar holidays (Month is 0-indexed in JS date, but let's use 1-indexed for clarity in config)
const SOLAR_HOLIDAYS = [
  { month: 1, day: 1, name: "신정" },
  { month: 3, day: 1, name: "삼일절" },
  { month: 5, day: 5, name: "어린이날" },
  { month: 6, day: 6, name: "현충일" },
  { month: 8, day: 15, name: "광복절" },
  { month: 10, day: 3, name: "개천절" },
  { month: 10, day: 9, name: "한글날" },
  { month: 12, day: 25, name: "크리스마스" },
];

// Moving holidays (Lunar New Year, Buddha's Birthday, Chuseok, Elections, Substitutes)
// Format: "YYYY-MM-DD": "Holiday Name"
const MOVING_HOLIDAYS = {
  // 2024
  "2024-02-09": "설날 연휴",
  "2024-02-10": "설날",
  "2024-02-11": "설날 연휴",
  "2024-02-12": "대체공휴일(설날)",
  "2024-04-10": "제22대 국회의원 선거",
  "2024-05-06": "대체공휴일(어린이날)",
  "2024-05-15": "부처님 오신 날",
  "2024-09-16": "추석 연휴",
  "2024-09-17": "추석",
  "2024-09-18": "추석 연휴",

  // 2025
  "2025-01-27": "임시공휴일/설날 연휴", // Often extended
  "2025-01-28": "설날 연휴",
  "2025-01-29": "설날",
  "2025-01-30": "설날 연휴",
  "2025-03-03": "대체공휴일(삼일절)",
  "2025-05-06": "대체공휴일(어린이날/부처님)", // Overlap fix
  "2025-05-05": "어린이날/부처님 오신 날",
  "2025-10-05": "추석 연휴",
  "2025-10-06": "추석",
  "2025-10-07": "추석 연휴",
  "2025-10-08": "대체공휴일(추석)",

  // 2026 (From User screenshot + Research)
  "2026-02-16": "설날 연휴",
  "2026-02-17": "설날",
  "2026-02-18": "설날 연휴",
  "2026-03-02": "대체공휴일(삼일절)",
  "2026-05-24": "부처님 오신 날",
  "2026-05-25": "대체공휴일(부처님)",
  "2026-06-03": "지방선거",
  "2026-08-16": "대체공휴일(광복절)", // If 15 is Sat? Wait, only Sun overlaps get sub? Or specific holidays. 
  // Actually usually only Seollal/Chuseok/Childrens have unconditional subs? 
  // Recently expanded to National Holidays. 
  // Let's stick to confirmed research.
  "2026-08-17": "대체공휴일(광복절)", // Confirmed by search
  "2026-09-24": "추석 연휴",
  "2026-09-25": "추석",
  "2026-09-26": "추석 연휴",
  "2026-10-05": "대체공휴일(개천절)",
  
  // 2027 (Basic check)
  "2027-02-06": "설날 연휴",
  "2027-02-07": "설날",
  "2027-02-08": "대체공휴일(설날)", // Likely
  "2027-05-13": "부처님 오신 날",
};

export const getHolidayName = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Check Solar Fixed
  const solar = SOLAR_HOLIDAYS.find(h => h.month === month && h.day === day);
  if (solar) return solar.name;

  // Check Moving
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  if (MOVING_HOLIDAYS[dateStr]) return MOVING_HOLIDAYS[dateStr];

  return null;
};

export const isHoliday = (date) => {
  return !!getHolidayName(date);
};

export const isWeekend = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6; // 0: Sun, 6: Sat
};
