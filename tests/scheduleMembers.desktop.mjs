import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { _electron as electron } from 'playwright';

const require = createRequire(import.meta.url);
const tempRoot = path.resolve(tmpdir());
const userData = await mkdtemp(path.join(tempRoot, 'imhaming-desktop-qa-'));
const packedApp = path.resolve('release-build-v2/win-unpacked/resources/app.asar');
let desktop;
try {
  desktop = await electron.launch({
    executablePath: require('electron'),
    args: [path.resolve('tests/desktopSmoke.cjs')],
    env: { ...process.env, IMHAMING_QA_USER_DATA: userData, IMHAMING_QA_PACKED_APP: packedApp },
  });
  desktop.process().stderr.on('data', (chunk) => process.stderr.write(chunk));
  desktop.process().stdout.on('data', (chunk) => process.stdout.write(chunk));
  console.log('Desktop startup:', await desktop.evaluate(({ app, BrowserWindow }) => ({ ready: app.isReady(), windows: BrowserWindow.getAllWindows().length, version: app.getVersion() })));
  const page = await desktop.firstWindow();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await desktop.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1100, 900));
  const calendarEvent = {
    id: 'desktop-member-qa', title: 'Desktop members',
    start: '2099-10-14T00:00:00+09:00', end: '2099-10-14T23:59:59+09:00',
    memo: 'Desktop schedule memo',
    members: [{ userId: 'imha22', nickname: '임하밍', profileImage: 'https://profile.img.sooplive.com/LOGO/im/imha22/imha22.jpg' }],
  };
  await desktop.context().route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.includes('/entities/')) return route.fulfill({ json: url.pathname.includes('/CalendarEvent') ? [calendarEvent] : [] });
    if (['bjapi.afreecatv.com', 'play.sooplive.com', 'corsproxy.io', 'api.codetabs.com'].includes(url.hostname)
      || (url.hostname === 'api-channel.sooplive.com' && url.pathname.includes('/board'))) return route.fulfill({ json: { contents: [] } });
    return route.continue();
  });
  await page.clock.setFixedTime(new Date('2099-10-14T12:00:00'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.desktop-titlebar').waitFor();
  assert.equal(await page.evaluate(() => window.electronAPI.getAppVersion()), '1.0.38');
  console.log('Desktop icon:', await page.locator('.desktop-app-icon').evaluate((img) => ({ src: img.src, complete: img.complete, width: img.naturalWidth })));
  await page.locator('.desktop-app-icon').evaluate((img) => img.decode());
  await page.locator('.today-event').click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor();
  assert.match(await dialog.innerText(), /Desktop schedule memo/);
  await dialog.locator('img').evaluate((img) => { img.loading = 'eager'; return img.decode(); });
  await dialog.getByRole('link', { name: '임하밍 방송국' }).click();
  const links = await desktop.evaluate(() => global.desktopTestLinks);
  assert.deepEqual(links, ['https://www.sooplive.com/station/imha22']);
  await page.keyboard.press('Escape');

  await page.evaluate(() => localStorage.setItem('moeum_auth_v2', JSON.stringify({ role: 'admin', username: 'QA' })));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('nav.tabs').getByRole('button', { name: '일정', exact: true }).click();
  await page.getByRole('button', { name: '일정 등록', exact: true }).click();
  await page.getByLabel('참여 멤버 검색').fill('문모모');
  await page.getByRole('button', { name: '멤버 검색', exact: true }).click();
  await page.getByRole('button', { name: '문모모 (doormomo) 선택', exact: true }).click({ timeout: 20000 });
  assert.equal(await page.getByLabel('닉네임', { exact: true }).inputValue(), '문모모');
  await page.locator('.edit-panel').screenshot({ path: 'artifacts/desktop-nickname-search.png' });
  assert.ok(page.url().startsWith('file:'));
  assert.deepEqual(errors, []);
  console.log('PASS: packaged v1.0.38 files, desktop icon, schedule dialog, profile, external station link and live nickname search from file://.');
} finally {
  if (desktop) await desktop.close();
  const resolved = path.resolve(userData);
  if (path.dirname(resolved) !== tempRoot || !path.basename(resolved).startsWith('imhaming-desktop-qa-')) throw new Error('Unexpected test directory');
  await rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
