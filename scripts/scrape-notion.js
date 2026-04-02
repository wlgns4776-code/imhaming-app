/**
 * scrape-notion.js
 * ────────────────────────────────────────────
 * 노션 '밍조각 방셀 안내' 데이터베이스를 스크래핑하여
 * 이미지와 텍스트 데이터를 로컬에 저장합니다.
 *
 * 사용법: node scripts/scrape-notion.js
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const NOTION_URL =
  'https://www.notion.so/25b7a4cde9738022bf03eb256b5e5daf?v=25b7a4cde97381b197a9000ca449d5b5';

const OUTFITS_IMG_DIR = path.join(ROOT, 'public', 'images', 'outfits');
const OUTFITS_JSON = path.join(ROOT, 'src', 'data', 'outfits.json');

/* ─── 유틸: 이미지 다운로드 ─── */
function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const client = url.startsWith('https') ? https : http;
    client
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          if (fs.existsSync(dest)) fs.unlinkSync(dest);
          return downloadImage(res.headers.location, dest).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          file.close();
          if (fs.existsSync(dest)) fs.unlinkSync(dest);
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      })
      .on('error', (err) => {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        reject(err);
      });
  });
}

/* ─── 파일명 안전 변환 ─── */
function sanitize(name) {
  return name.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_').substring(0, 80);
}

function getExtension(url) {
  try {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname).split('?')[0].toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif'].includes(ext)) return ext;
  } catch {}
  return '.png';
}

/* ─── 메인 ─── */
async function main() {
  console.log('🚀 노션 스크래핑 시작...');
  console.log(`📌 URL: ${NOTION_URL}\n`);

  fs.mkdirSync(OUTFITS_IMG_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(OUTFITS_JSON), { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  try {
    // 1) 노션 페이지 접속
    console.log('🌐 노션 페이지 로딩 중...');
    await page.goto(NOTION_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // 노션 동적 렌더링 대기 — 테이블 행이 나타날 때까지
    console.log('⏳ 테이블 렌더링 대기...');
    await page.waitForTimeout(8000);
    
    // 2) 스크롤하여 모든 데이터 로드
    console.log('📜 스크롤하여 전체 데이터 로드 중...');
    
    // 노션의 스크롤 컨테이너 찾기
    for (let i = 0; i < 15; i++) {
      await page.evaluate(() => {
        // 여러 스크롤 컨테이너 시도
        const containers = [
          document.querySelector('.notion-scroller'),
          document.querySelector('.notion-frame'),
          document.querySelector('.notion-page-content'),
          document.querySelector('[class*="scroller"]'),
          document.documentElement,
        ];
        for (const c of containers) {
          if (c) {
            c.scrollTop = c.scrollHeight;
          }
        }
        window.scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForTimeout(1000);
    }
    
    // 다시 맨 위로
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);

    // 3) 데이터 추출 — 노션 테이블 뷰의 구체적 구조
    console.log('📊 데이터 추출 중...\n');
    
    const outfits = await page.evaluate(() => {
      const results = [];
      
      // 노션 테이블의 행(row) 찾기 — 여러 셀렉터 시도
      const allRows = document.querySelectorAll(
        '.notion-table-view-row, .notion-collection-row, [style*="display: flex"][role="button"]'
      );
      
      // notion-page-block을 찾아서 행 단위로 처리
      const pageBlocks = document.querySelectorAll('.notion-page-block');
      
      if (pageBlocks.length > 0) {
        pageBlocks.forEach(block => {
          const title = block.textContent?.trim() || '';
          if (!title) return;
          
          // 해당 행(부모 row)에서 이미지와 속성 텍스트 추출
          const row = block.closest('[style*="display: flex"]') ||
                      block.closest('.notion-table-view-row') ||
                      block.closest('.notion-collection-row') ||
                      block.parentElement?.parentElement;
          
          if (!row) {
            results.push({ title, description: '', imageUrls: [] });
            return;
          }
          
          // 이미지 URL 수집
          const images = [];
          row.querySelectorAll('img').forEach(img => {
            const src = img.src || '';
            if (src && src.startsWith('http') && !src.includes('notion-static.com/icons')) {
              images.push(src);
            }
          });
          
          // 속성 텍스트 수집 (제목 이후 셀들)
          const allTextInRow = [];
          const spans = row.querySelectorAll('span, div');
          const seenTexts = new Set([title]);
          spans.forEach(el => {
            const t = el.textContent?.trim();
            if (t && !seenTexts.has(t) && t.length > 1 && t.length < 50 && !t.includes('http')) {
              // 의미 있는 텍스트만 수집 (상태, 옵션 등)
              if (t.includes('구매') || t.includes('선택') || t.includes('제거') || 
                  t.includes('의상') || t.includes('헤어') || t.includes('판매') ||
                  t.includes('모자') || t.includes('안경') || t.includes('색상') ||
                  t.includes('악세') || t.includes('겉옷') || t.includes('밍조각')) {
                if (!allTextInRow.includes(t)) allTextInRow.push(t);
                seenTexts.add(t);
              }
            }
          });
          
          results.push({
            title,
            description: allTextInRow.join(' | '),
            imageUrls: images,
          });
        });
      }
      
      // 대안: 전체 이미지 + 타이틀 매칭
      if (results.length === 0) {
        // 모든 텍스트에서 "ver" 패턴을 찾아 제목 추출
        const walker = document.createTreeWalker(
          document.body, 
          NodeFilter.SHOW_TEXT,
          { acceptNode: (node) => {
            const t = node.textContent?.trim();
            return t && /ver\d+\.\s*\d+번/.test(t) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
          }}
        );
        
        let node;
        while (node = walker.nextNode()) {
          const title = node.textContent.trim();
          results.push({ title, description: '', imageUrls: [] });
        }
      }
      
      return results;
    });

    console.log(`✅ ${outfits.length}개 항목 발견!\n`);

    if (outfits.length === 0) {
      // 디버그: HTML 구조 분석
      console.log('⚠️ 항목을 찾지 못했습니다. 페이지 구조 분석 중...');
      
      const debugInfo = await page.evaluate(() => {
        const info = {};
        info.bodyTextLength = document.body.innerText.length;
        info.firstText = document.body.innerText.substring(0, 2000);
        info.imgCount = document.querySelectorAll('img').length;
        info.pageBlocks = document.querySelectorAll('.notion-page-block').length;
        info.tableRows = document.querySelectorAll('[role="row"]').length;
        info.collectionItems = document.querySelectorAll('.notion-collection-item').length;
        info.allDivClasses = new Set();
        document.querySelectorAll('div[class]').forEach(d => { 
          d.className.split(' ').forEach(c => { if (c.includes('notion')) info.allDivClasses.add(c); });
        });
        info.notionClasses = [...info.allDivClasses].slice(0, 30);
        
        // 모든 img src 수집
        info.imgSrcs = [];
        document.querySelectorAll('img').forEach(img => {
          if (img.src) info.imgSrcs.push(img.src.substring(0, 100));
        });
        
        return info;
      });
      
      console.log('Body text length:', debugInfo.bodyTextLength);
      console.log('Image count:', debugInfo.imgCount);
      console.log('Page blocks:', debugInfo.pageBlocks);
      console.log('Table rows:', debugInfo.tableRows);
      console.log('Collection items:', debugInfo.collectionItems);
      console.log('Notion classes:', debugInfo.notionClasses);
      console.log('Image sources:', debugInfo.imgSrcs);
      console.log('\n--- 페이지 텍스트 ---\n');
      console.log(debugInfo.firstText);
      
      const debugPath = path.join(ROOT, 'scripts', 'debug-notion.png');
      await page.screenshot({ path: debugPath, fullPage: true });
      console.log(`📸 디버그 스크린샷: ${debugPath}`);
      
      await browser.close();
      return;
    }

    // 4) 항목 출력 & 이미지 다운로드
    const finalData = [];
    
    for (let i = 0; i < outfits.length; i++) {
      const outfit = outfits[i];
      const baseName = sanitize(outfit.title || `outfit_${i + 1}`);
      const localImages = [];
      
      console.log(`[${i + 1}/${outfits.length}] "${outfit.title}" (이미지 ${outfit.imageUrls.length}개)`);
      if (outfit.description) console.log(`   📝 ${outfit.description}`);
      
      for (let j = 0; j < outfit.imageUrls.length; j++) {
        const imgUrl = outfit.imageUrls[j];
        const ext = getExtension(imgUrl);
        const filename = outfit.imageUrls.length > 1
          ? `${baseName}_${j + 1}${ext}`
          : `${baseName}${ext}`;
        const destPath = path.join(OUTFITS_IMG_DIR, filename);
        const localPath = `/images/outfits/${filename}`;
        
        try {
          await downloadImage(imgUrl, destPath);
          localImages.push(localPath);
          console.log(`   📥 이미지 ${j + 1} 저장 완료`);
        } catch (err) {
          console.log(`   ⚠️ 이미지 ${j + 1} 다운로드 실패: ${err.message}`);
        }
      }
      
      finalData.push({
        id: i + 1,
        title: outfit.title,
        description: outfit.description,
        images: localImages,
      });
    }

    // 5) JSON 저장
    fs.writeFileSync(OUTFITS_JSON, JSON.stringify(finalData, null, 2), 'utf-8');
    console.log(`\n💾 JSON 저장 완료: ${OUTFITS_JSON}`);
    console.log(`📁 이미지 폴더: ${OUTFITS_IMG_DIR}`);
    console.log(`📊 총 ${finalData.length}개 의상 데이터 수집 완료!`);
    
  } catch (err) {
    console.error('❌ 스크래핑 에러:', err.message);
    try {
      await page.screenshot({ path: path.join(ROOT, 'scripts', 'error-notion.png'), fullPage: true });
      console.log('📸 에러 스크린샷: scripts/error-notion.png');
    } catch {}
  } finally {
    await browser.close();
  }
}

main();
