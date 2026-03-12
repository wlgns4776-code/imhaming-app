import { base44 } from './src/api/base44Client.js';

async function main() {
  const songs = await base44.entities.Song.list();
  const missing = songs.filter(s => !s.lyrics || s.lyrics.trim() === '');
  console.log(`Total songs: ${songs.length}, Missing lyrics: ${missing.length}`);
  missing.forEach(s => console.log(`- ${s.title} (${s.artist})`));
}

main().catch(console.error);
