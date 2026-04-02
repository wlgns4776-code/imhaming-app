import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@base44/sdk';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const base44 = createClient({ appId: process.env.VITE_BASE44_APP_ID });

const OUTFITS_JSON = path.join(__dirname, '..', 'src', 'data', 'outfits.json');

async function importOutfits() {
  console.log('📦 의상 데이터 임포트 시작...');
  const outfits = JSON.parse(fs.readFileSync(OUTFITS_JSON, 'utf-8'));

  console.log(`불러온 데이터 개수: ${outfits.length}개`);
  let successCount = 0;
  let failCount = 0;

  for (const item of outfits) {
    try {
      await base44.entities.Outfit.create({
        title: item.title,
        description: item.description || '',
        category: 'ming', // 초기는 밍조각으로 
        images: item.images || []
      });
      successCount++;
      console.log(`✅ [${item.title}] 추가 완료`);
    } catch(err) {
      failCount++;
      console.error(`❌ [${item.title}] 추가 실패:`, err.message);
    }
  }

  console.log(`✅ 완료! 성공: ${successCount}, 실패: ${failCount}`);
}

importOutfits().catch(console.error);
