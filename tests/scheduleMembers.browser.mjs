import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.SCHEDULE_TEST_URL || 'http://127.0.0.1:5175/';
const fixedDate = new Date('2099-10-14T12:00:00+09:00');
const portrait = 'https://profile.img.sooplive.com/LOGO/im/imha22/imha22.jpg';
const title = 'QA schedule with SOOP members';
const rows = {
  CalendarEvent: [
    { id: 'legacy-event', title: 'Legacy schedule', start: '2099-10-14T00:00:00+09:00', end: '2099-10-14T23:59:59+09:00', memo: 'Original memo' },
    { id: 'many-members', title: 'Many members', start: '2099-10-14T00:00:00+09:00', end: '2099-10-14T23:59:59+09:00', members: Array.from({ length: 12 }, (_, i) => ({ userId: `qa_member_${i}`, nickname: i === 0 ? 'LongNicknameWithoutSpaces123456789' : `member ${i + 1}`, profileImage: i === 1 ? 'https://profile.img.sooplive.com/qa-missing.jpg' : portrait })) },
  ],
  ScheduleMember: [],
};
let sequence = 0;
const browser = await chromium.launch({ headless: true });
const pageErrors = [];

async function createPage(viewport, admin = false) {
  const context = await browser.newContext({ viewport, timezoneId: 'Asia/Seoul' });
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith('/functions/search-soop-members')) {
      const { query, page: resultPage } = request.postDataJSON();
      const member = (userId) => ({ userId, nickname: 'same nickname', profileImage: portrait });
      if (query === 'QA_DUPLICATE') return route.fulfill({ json: { members: [member('qa_one'), member('qa_two')], page: 1, hasMore: false } });
      if (query === 'QA_EMPTY') return route.fulfill({ json: { members: [], page: 1, hasMore: false } });
      if (query === 'QA_FAILURE') return route.fulfill({ status: 502, json: { error: 'SOOP 검색을 불러오지 못했습니다.' } });
      if (query === 'QA_PAGED') return route.fulfill({ json: {
        members: resultPage === 1 ? [member('qa_one'), member('qa_two')] : [member('qa_two'), member('qa_three')],
        page: resultPage, hasMore: resultPage === 1,
      } });
    }
    if (url.pathname.includes('/entities/')) {
      const segments = url.pathname.split('/');
      const index = segments.indexOf('entities');
      const entity = segments[index + 1];
      const id = segments[index + 2];
      rows[entity] ||= [];
      if (request.method() === 'POST') {
        const saved = { ...request.postDataJSON(), id: `qa-${++sequence}` };
        rows[entity].push(saved);
        return route.fulfill({ json: saved });
      }
      if (request.method() === 'PUT') {
        const saved = rows[entity].find((item) => item.id === id);
        assert.ok(saved);
        Object.assign(saved, request.postDataJSON());
        return route.fulfill({ json: saved });
      }
      const query = JSON.parse(url.searchParams.get('q') || '{}');
      const matching = rows[entity].filter((item) => Object.entries(query).every(([key, value]) => item[key] === value));
      return route.fulfill({ json: id ? rows[entity].find((item) => item.id === id) : matching });
    }
    if (url.pathname.endsWith('/qa-missing.jpg')) return route.fulfill({ status: 404 });
    if (['bjapi.afreecatv.com', 'play.sooplive.com', 'corsproxy.io', 'api.codetabs.com'].includes(url.hostname)
      || (url.hostname === 'api-channel.sooplive.com' && url.pathname.includes('/board'))) {
      return route.fulfill({ json: { contents: [] } });
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => pageErrors.push(error.message));
  if (admin) await page.addInitScript(() => localStorage.setItem('moeum_auth_v2', JSON.stringify({ role: 'admin', username: 'QA' })));
  await page.clock.setFixedTime(fixedDate);
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.locator('.today-event').first().waitFor();
  return page;
}

async function openCalendar(page) {
  await page.locator('nav.tabs').getByRole('button', { name: '일정', exact: true }).click();
}

async function openDetails(page, scheduleTitle) {
  await page.getByRole('button', { name: `${scheduleTitle} 일정 상세`, exact: true }).click();
  await page.getByRole('dialog').waitFor();
}

try {
  await mkdir('artifacts', { recursive: true });
  const admin = await createPage({ width: 1440, height: 1000 }, true);
  await openCalendar(admin);
  await admin.getByRole('button', { name: '일정 등록', exact: true }).click();
  await admin.getByLabel('제목', { exact: true }).fill(title);
  await admin.getByLabel('메모', { exact: true }).fill('Memo survives member registration');
  const input = admin.getByLabel('참여 멤버 검색');
  await input.fill('https://example.com/imha22');
  await input.press('Enter');
  assert.match(await admin.getByRole('alert').innerText(), /올바른 SOOP/);
  await input.fill('QA_EMPTY');
  await input.press('Enter');
  await admin.getByRole('status').filter({ hasText: '검색 결과가 없습니다.' }).waitFor();
  await input.fill('QA_FAILURE');
  await input.press('Enter');
  await admin.getByRole('alert').filter({ hasText: 'SOOP 검색을 불러오지 못했습니다.' }).waitFor();
  await input.fill('QA_PAGED');
  await input.press('Enter');
  await admin.getByRole('list', { name: '멤버 검색 결과' }).waitFor();
  assert.equal(await admin.locator('.schedule-member-results li').count(), 2);
  await admin.getByRole('button', { name: '더 보기', exact: true }).click();
  await admin.locator('.schedule-member-more').waitFor({ state: 'hidden' });
  assert.equal(await admin.locator('.schedule-member-results li').count(), 3);
  await input.fill('QA_DUPLICATE');
  await input.press('Enter');
  await admin.getByRole('button', { name: 'same nickname (qa_two) 선택', exact: true }).click();
  await admin.getByRole('button', { name: '멤버 추가', exact: true }).click();
  await admin.getByRole('button', { name: 'same nickname 제외', exact: true }).waitFor();
  assert.equal(rows.ScheduleMember[0].userId, 'qa_two');
  await admin.getByRole('button', { name: 'same nickname 제외', exact: true }).click();
  await input.fill('문모모');
  await input.press('Enter');
  await admin.getByRole('button', { name: '문모모 (doormomo) 선택', exact: true }).waitFor({ timeout: 20000 });
  await admin.locator('.schedule-member-results').screenshot({ path: 'artifacts/schedule-nickname-search-desktop.png' });
  await input.fill('임하밍');
  await input.press('Enter');
  await admin.locator('.schedule-member-candidate').waitFor({ timeout: 20000 });
  assert.equal(await admin.getByLabel('닉네임', { exact: true }).inputValue(), '임하밍');
  await admin.locator('.edit-panel').screenshot({ path: 'artifacts/schedule-member-editor-desktop.png' });
  await admin.getByRole('button', { name: '멤버 추가', exact: true }).click();
  await admin.locator('.schedule-member-selected li').waitFor();
  await admin.locator('.edit-panel .edit-save').click();
  await admin.locator('.edit-panel').waitFor({ state: 'hidden' });
  const saved = rows.CalendarEvent.find((item) => item.title === title);
  assert.equal(saved.members.length, 1);
  assert.equal(saved.members[0].userId, 'imha22');
  assert.equal(rows.ScheduleMember.length, 2);

  await admin.reload({ waitUntil: 'domcontentloaded' });
  await admin.locator('.today-event').first().waitFor();
  await openCalendar(admin);
  await openDetails(admin, title);
  const dialog = admin.getByRole('dialog');
  assert.match(await dialog.innerText(), /Memo survives member registration/);
  const stationLink = dialog.getByRole('link', { name: '임하밍 방송국' });
  assert.equal(await stationLink.getAttribute('href'), 'https://www.sooplive.com/station/imha22');
  await dialog.locator('img').evaluate((img) => img.decode());
  const popupPromise = admin.waitForEvent('popup');
  await stationLink.click();
  const popup = await popupPromise;
  await popup.waitForURL('https://www.sooplive.com/station/imha22');
  await popup.close();
  await dialog.getByRole('button', { name: '일정 수정', exact: true }).click();
  await admin.getByRole('button', { name: '임하밍 제외', exact: true }).click();
  await admin.locator('.edit-panel .edit-save').click();
  await admin.locator('.edit-panel').waitFor({ state: 'hidden' });
  assert.deepEqual(saved.members, []);
  assert.equal(saved.memo, 'Memo survives member registration');

  await openDetails(admin, title);
  assert.equal(await admin.locator('.schedule-detail-members').count(), 0);
  await admin.getByRole('dialog').getByRole('button', { name: '일정 수정', exact: true }).click();
  await admin.locator('.schedule-member-library summary').click();
  await admin.locator('.schedule-member-library').getByRole('button', { name: '임하밍', exact: true }).click();
  await admin.locator('.edit-panel .edit-save').click();
  await admin.locator('.edit-panel').waitFor({ state: 'hidden' });
  assert.equal(saved.members.length, 1);

  await openDetails(admin, 'Legacy schedule');
  assert.match(await admin.getByRole('dialog').innerText(), /Original memo/);
  await admin.keyboard.press('Escape');
  assert.equal(await admin.getByRole('dialog').count(), 0);
  await openDetails(admin, 'Many members');
  await admin.getByRole('dialog').screenshot({ path: 'artifacts/schedule-members-desktop.png' });

  for (const width of [390, 320]) {
    const mobile = await createPage({ width, height: 844 });
    await mobile.getByRole('button', { name: /Many members/ }).click();
    const mobileDialog = mobile.getByRole('dialog');
    assert.equal(await mobileDialog.locator('.schedule-member').count(), 12);
    assert.equal(await mobileDialog.getByRole('button', { name: '일정 수정', exact: true }).count(), 0);
    await mobileDialog.locator('img').first().evaluate((img) => img.decode());
    const dimensions = await mobileDialog.evaluate((node) => ({ width: node.getBoundingClientRect().width, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth }));
    assert.ok(dimensions.width <= width - 16);
    assert.ok(dimensions.scrollWidth <= dimensions.clientWidth + 1);
    await mobileDialog.screenshot({ path: `artifacts/schedule-members-mobile-${width}.png` });
    await mobile.keyboard.press('Escape');
    await mobile.context().close();
  }
  const mobileAdmin = await createPage({ width: 320, height: 844 }, true);
  await openCalendar(mobileAdmin);
  await mobileAdmin.getByRole('button', { name: '일정 등록', exact: true }).click();
  await mobileAdmin.getByLabel('참여 멤버 검색').fill('문모모');
  await mobileAdmin.getByRole('button', { name: '멤버 검색', exact: true }).click();
  await mobileAdmin.getByRole('button', { name: '문모모 (doormomo) 선택', exact: true }).waitFor();
  await mobileAdmin.locator('.edit-panel').screenshot({ path: 'artifacts/schedule-nickname-search-mobile.png' });
  await mobileAdmin.getByRole('button', { name: '문모모 (doormomo) 선택', exact: true }).click();
  await mobileAdmin.locator('.schedule-member-candidate').waitFor();
  const editorDimensions = await mobileAdmin.locator('.edit-panel').evaluate((node) => ({ scrollWidth: node.scrollWidth, clientWidth: node.clientWidth }));
  assert.ok(editorDimensions.scrollWidth <= editorDimensions.clientWidth + 1);
  await mobileAdmin.locator('.edit-panel').screenshot({ path: 'artifacts/schedule-member-editor-mobile.png' });
  assert.deepEqual(pageErrors, []);
  console.log('PASS: SOOP lookup, library, save/reload, profile link, removal, legacy memo, desktop and mobile dialogs.');
} finally {
  await browser.close();
}
