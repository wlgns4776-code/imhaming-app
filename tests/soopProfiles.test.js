import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchSoopProfile, normalizeScheduleMembers, parseSoopUserId, soopStationUrl } from '../src/utils/soopProfiles.js';

test('accepts SOOP IDs and current and legacy station links', () => {
  for (const input of [
    ' IMHA22 ',
    'https://www.sooplive.com/station/imha22',
    'sooplive.com/station/imha22?from=calendar',
    'https://play.sooplive.com/imha22/1234',
    'https://bj.afreecatv.com/imha22',
  ]) {
    assert.equal(parseSoopUserId(input), 'imha22');
    assert.equal(soopStationUrl(input), 'https://www.sooplive.com/station/imha22');
  }
});

test('rejects unsupported hosts, scripts, missing IDs and nicknames', () => {
  for (const input of [
    'https://example.com/imha22',
    'https://sooplive.com.example.com/station/imha22',
    'javascript:alert(1)',
    'https://www.sooplive.com/station/',
    '임하밍',
    '',
  ]) assert.equal(parseSoopUserId(input), '');
});

test('old schedules need no members and duplicate accounts stay unique', () => {
  assert.deepEqual(normalizeScheduleMembers(undefined), []);
  assert.deepEqual(normalizeScheduleMembers([
    null,
    { userId: 'IMHA22', nickname: 'old name' },
    { userId: 'imha22', nickname: 'new name', profileImage: 'javascript:alert(1)' },
  ]), [{
    userId: 'imha22',
    nickname: 'new name',
    profileImage: 'https://profile.img.sooplive.com/LOGO/im/imha22/imha22.jpg',
  }]);
});

test('looks up the station nickname and image, and reports missing stations', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url) => {
      assert.equal(url, 'https://api-channel.sooplive.com/v1.1/channel/imha22/station');
      return Response.json({ station: { userId: 'imha22', userNick: 'current name', profileImage: 'https://profile.img.sooplive.com/current.jpg' } });
    };
    assert.deepEqual(await fetchSoopProfile('imha22'), {
      userId: 'imha22', nickname: 'current name', profileImage: 'https://profile.img.sooplive.com/current.jpg',
    });
    globalThis.fetch = async () => new Response('', { status: 404 });
    await assert.rejects(fetchSoopProfile('imha22'), /SOOP ID/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
