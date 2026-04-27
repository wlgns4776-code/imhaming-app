import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@base44/sdk';
import dotenv from 'dotenv';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const base44 = createClient({ appId: process.env.VITE_BASE44_APP_ID });

import axios from 'axios';

const fetchBugsCover = async (artist, title) => {
    try {
        const query = encodeURIComponent(`${artist} ${title}`);
        const res = await axios.get(`https://music.bugs.co.kr/search/track?q=${query}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });
        const match = res.data.match(/https:\/\/image\.bugsm\.co\.kr\/album\/images\/\d+\/\d+\/\d+\.jpg/);
        if (match && match[0]) {
            return match[0].replace('/50/', '/500/');
        }
        return null;
    } catch (err) {
        return null;
    }
};

async function updateCovers() {
  console.log('📦 노래 앨범 커버 업데이트 시작...');
  const songs = await base44.entities.Song.list();

  console.log(`불러온 노래 데이터 개수: ${songs.length}개`);
  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;

  for (const song of songs) {
    if (song.coverUrl) {
        skipCount++;
        continue;
    }

    try {
        const coverUrl = await fetchBugsCover(song.artist, song.title);
        
        if (coverUrl) {
            await base44.entities.Song.update(song.id, { coverUrl });
            successCount++;
            console.log(`✅ [${song.title}] 커버 업데이트 완료: ${coverUrl}`);
        } else {
            console.log(`⚠️ [${song.title}] 커버 찾기 실패`);
            failCount++;
        }
    } catch(err) {
      failCount++;
      console.error(`❌ [${song.title}] 업데이트 중 에러:`, err.message);
    }
    
    // rate limit 방지
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`✅ 완료! 업데이트: ${successCount}, 실패/없음: ${failCount}, 스킵: ${skipCount}`);
}

updateCovers().catch(console.error);
