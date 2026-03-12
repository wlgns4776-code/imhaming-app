import { createClient } from '@base44/sdk';

const base44 = createClient({
  appId: '698c8fe4f23098983e1aa792',
});

async function verify() {
  try {
    const songs = await base44.entities.Song.list();
    console.log(`CURRENT_COUNT: ${songs.length}`);
    if (songs.length > 0) {
      console.log(`First song: ${songs[0].title} - ${songs[0].artist}`);
    }
  } catch (error) {
    console.error('Verification failed:', error.message);
  }
}

verify();
