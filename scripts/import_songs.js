import { createClient } from '@base44/sdk';
import fs from 'fs';
import path from 'path';

const base44 = createClient({
  appId: '698c8fe4f23098983e1aa792',
});

const DATA_DIR = path.resolve('scripts/data');

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function importSongs() {
  if (!fs.existsSync(DATA_DIR)) {
    console.error('Data directory not found at:', DATA_DIR);
    return;
  }

  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.csv'));
  
  let importedCount = 0;
  let skippedCount = 0;

  for (const file of files) {
    console.log(`Processing file: ${file}`);
    const content = fs.readFileSync(path.join(DATA_DIR, file), 'utf-8');
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      // Skip junk lines
      if (line.includes('K - POP') || line.includes('NO,가수')) continue;
      if (line.startsWith(',,,,,,')) continue;

      const cols = parseCSVLine(line);

    
    // Expected Mapping:
    // Col 2: NO (ignore)
    // Col 3: Artist
    // Col 5: Title
    // Col 6: Proficiency
    // Col 7: Key
    // Col 8: ConditionCheck (TRUE/FALSE)
    // Col 10: Lyrics
    // Col 11: Remarks
    
    // Wait, let's re-verify column indices based on:
    // ,,1,40,,듣는편지,가능,D (+2),FALSE,FALSE,"lyrics..."
    // Col indices (0-based):
    // 0: ""
    // 1: ""
    // 2: "1" (NO)
    // 3: "40" (Artist)
    // 4: ""
    // 5: "듣는편지" (Title)
    // 6: "가능" (Proficiency)
    // 7: "D (+2)" (Key)
    // 8: "FALSE" (ConditionCheck)
    // 9: "FALSE" (Song Link - ignore?)
    // 10: "lyrics..."
    // 11: "Remarks" (if any)

    if (cols.length < 6) {
        skippedCount++;
        continue;
    }

    const artist = cols[3];
    const title = cols[5];
    const proficiency = cols[6];
    const key = cols[7];
    const conditionCheck = cols[8]?.toUpperCase() === 'TRUE';
    const lyrics = cols[10]?.replace(/\\\\n/g, '\n'); // Handle potential double escaped newlines
    const remarks = cols[11] || '';

    if (!title || !artist) {
      skippedCount++;
      continue;
    }

    const songData = {
      title,
      artist,
      lyrics: lyrics || '',
      key: key || '',
      proficiency: proficiency || '가능',
      conditionCheck: conditionCheck || false,
      remarks: remarks || '',
      tags: ['K-POP'] // Default tag based on the CSV header
    };

    try {
      console.log(`Importing: ${title} - ${artist}...`);
      await base44.entities.Song.create(songData);
      importedCount++;
    } catch (error) {
      console.error(`Failed to import ${title}:`, error.message);
    }
    }
  }

  console.log('---------------------------');
  console.log(`Import completed!`);
  console.log(`Imported: ${importedCount}`);
  console.log(`Skipped: ${skippedCount}`);
}

importSongs();
