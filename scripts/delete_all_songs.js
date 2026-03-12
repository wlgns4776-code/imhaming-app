import { createClient } from '@base44/sdk';

const base44 = createClient({
  appId: '698c8fe4f23098983e1aa792',
});

async function deleteAllSongs() {
  try {
    const songs = await base44.entities.Song.list();
    console.log(`Found ${songs.length} songs. Starting deletion...`);
    
    let deletedCount = 0;
    for (const song of songs) {
      console.log(`Deleting [${deletedCount + 1}/${songs.length}]: ${song.title} - ${song.artist}`);
      await base44.entities.Song.delete(song.id);
      deletedCount++;
    }
    
    console.log('---------------------------');
    console.log(`Successfully deleted ${deletedCount} songs.`);
  } catch (error) {
    console.error('Deletion failed:', error.message);
  }
}

deleteAllSongs();
