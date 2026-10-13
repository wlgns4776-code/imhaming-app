const stationHosts = new Set([
  'sooplive.com', 'www.sooplive.com', 'ch.sooplive.com', 'play.sooplive.com',
  'afreecatv.com', 'www.afreecatv.com', 'bj.afreecatv.com', 'play.afreecatv.com',
]);

export function parseSoopUserId(value) {
  const input = String(value || '').trim().toLowerCase();
  if (/^[a-z0-9_]{2,64}$/.test(input)) return input;
  try {
    const url = new URL(input.includes('://') ? input : `https://${input}`);
    if (!['http:', 'https:'].includes(url.protocol) || !stationHosts.has(url.hostname)) return '';
    const segments = url.pathname.split('/').filter(Boolean);
    const userId = segments[0] === 'station' ? segments[1] : segments[0];
    return /^[a-z0-9_]{2,64}$/.test(userId || '') ? userId : '';
  } catch {
    return '';
  }
}

export function soopStationUrl(userId) {
  const id = parseSoopUserId(userId);
  return id ? `https://www.sooplive.com/station/${id}` : '';
}

export function soopProfileImageUrl(userId) {
  const id = parseSoopUserId(userId);
  return id ? `https://profile.img.sooplive.com/LOGO/${id.slice(0, 2)}/${id}/${id}.jpg` : '';
}

export function normalizeScheduleMembers(value) {
  const members = new Map();
  for (const item of Array.isArray(value) ? value : []) {
    const userId = parseSoopUserId(item?.userId);
    if (!userId) continue;
    const profileImage = String(item.profileImage || '');
    members.set(userId, {
      userId,
      nickname: String(item.nickname || userId).trim() || userId,
      profileImage: profileImage.startsWith('https://') ? profileImage : soopProfileImageUrl(userId),
    });
  }
  return [...members.values()];
}

export async function fetchSoopProfile(value, signal) {
  const userId = parseSoopUserId(value);
  if (!userId) throw new Error('올바른 SOOP ID 또는 방송국 주소를 입력해 주세요.');
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, 10000);
  try {
    const response = await fetch(`https://api-channel.sooplive.com/v1.1/channel/${userId}/station`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (response.status === 404) throw new Error('방송국을 찾을 수 없습니다. SOOP ID를 확인해 주세요.');
    if (!response.ok) throw new Error('SOOP 프로필을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    const { station } = await response.json();
    if (!station?.userNick) throw new Error('방송국을 찾을 수 없습니다. SOOP ID를 확인해 주세요.');
    return normalizeScheduleMembers([{
      userId: station.userId || userId,
      nickname: station.userNick,
      profileImage: station.profileImage,
    }])[0];
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}
