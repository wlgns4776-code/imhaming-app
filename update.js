const fs = require('fs');
let code = fs.readFileSync('src/pages/CalendarPage.jsx', 'utf8');

const importReplacement = `  startOfDay,
  differenceInCalendarDays,
} from "date-fns";`;

code = code.replace(/} from "date-fns";/, importReplacement);

const newGridContent = fs.readFileSync('update_content.txt', 'utf8');
const regex = /\/\*\s*─────────────────────────────────────────────────────\n\s*EventItem[\s\S]*?(?=\/\*\s*─────────────────────────────────────────────────────\n\s*Week \/ Day view)/;

code = code.replace(regex, newGridContent + '\n');
fs.writeFileSync('src/pages/CalendarPage.jsx', code);
