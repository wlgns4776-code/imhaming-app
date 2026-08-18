import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '../api/base44Client';
import { useAuth } from '../context/AuthContext';
import LoginModal from '../components/LoginModal';
import { Info, Pencil, Trash2, X } from 'lucide-react';
import '../scrapbook.css';

const navItems = [
  { id: 'home', label: 'HOME' },
  { id: 'schedule', label: '일정' },
  { id: 'songs', label: '노래책' },
  { id: 'karma', label: '업보' },
  { id: 'parts', label: '파트분배' },
];

const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const partColors = ['#ff5b8f', '#ff965b', '#ffd15b', '#83e05a', '#5bc4ff', '#5b79ff', '#9e5bff', '#ff5bd4'];
const proficiencyOk = new Set(['가능', '완료', 'ok', 'OK']);
const heroSettingTitle = '__imhaming_site_setting__hero_image_url';
const stationId = 'imha22';
const stationUrl = 'https://www.sooplive.com/station/imha22';
const stationLiveUrl = `https://play.sooplive.com/${stationId}`;
const stationBoardUrl = `${stationUrl}/board`;
const noticeBoardNo = 90076414;
const soopStationApiUrl = `https://bjapi.afreecatv.com/api/${stationId}/station`;
const soopBoardApiUrl = `https://api-channel.sooplive.com/v1.1/channel/${stationId}/board?perPage=20&page=1`;
const eventColors = ['#ff8fc4', '#8edff0', '#ffe477', '#d7f276', '#cbb7ff', '#ff965b', '#5bc4ff', '#83e05a', '#6b7280'];
const songProficiencyOptions = ['가능', '보류', '완료'];
const karmaCategoryOptions = [
  { value: 'upbo', label: '업보' },
  { value: 'ming', label: '밍조각' },
];
function toKstDateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || '').slice(0, 10);
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}-${String(kst.getUTCDate()).padStart(2, '0')}`;
}

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function makeCalendar(base) {
  const first = new Date(base.getFullYear(), base.getMonth(), 1);
  const last = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  return {
    leading: first.getDay(),
    dates: Array.from({ length: last.getDate() }, (_, index) => index + 1),
  };
}

function formatScheduleTime(time) {
  const match = String(time || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return time || '일정';
  const hour = Number(match[1]);
  const minute = match[2];
  const period = hour < 12 ? '오전' : '오후';
  return `${period} ${hour % 12 || 12}:${minute}`;
}

function normalizeEvent(item) {
  return {
    id: String(item.id),
    date: toKstDateKey(item.start || item.date || item.created_at),
    time: item.time || '',
    title: item.title || '제목 없는 일정',
    location: item.memo || '',
    color: item.color || '#ff8fc4',
  };
}

function decodeHtmlEntities(value) {
  return String(value || '').replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (match, entity) => ({
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    '#39': "'",
    nbsp: ' ',
  })[entity] || match);
}

function extractTextFromHtml(html) {
  if (!html) return '';
  if (typeof DOMParser === 'undefined') {
    return decodeHtmlEntities(String(html).replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, ' '));
  }

  const doc = new DOMParser().parseFromString(String(html), 'text/html');
  const paragraphText = Array.from(doc.body.querySelectorAll('p, li, figcaption'))
    .map((node) => node.textContent.trim())
    .filter(Boolean)
    .join(' ');

  return paragraphText || doc.body.textContent || '';
}

function cleanNoticeText(value) {
  return decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function proxiedUrls(targetUrl) {
  return [
    targetUrl,
    `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`,
    `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(targetUrl)}`,
  ];
}

function absoluteImageUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  if (url.startsWith('/')) return `https://www.sooplive.com${url}`;
  return url;
}

function findFirstImage(value) {
  if (!value) return '';
  if (typeof value === 'string') return absoluteImageUrl(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const image = findFirstImage(item);
      if (image) return image;
    }
    return '';
  }
  if (typeof value !== 'object') return '';

  const directKeys = ['thumbnail', 'thumb', 'thumb_url', 'thumbUrl', 'broad_thumb', 'broadThumb', 'title_image', 'titleImage', 'profile_image', 'profileImage'];
  for (const key of directKeys) {
    const image = findFirstImage(value[key]);
    if (image) return image;
  }
  return '';
}

function normalizeNoticePost(post) {
  const bodyText = cleanNoticeText(
    extractTextFromHtml(post.content?.content)
    || post.content?.textContent
    || post.content?.summary
  );

  return {
    id: String(post.titleNo || ''),
    title: post.titleName || '임하밍 최신 공지',
    summary: bodyText || '공지 내용은 게시글에서 확인할 수 있어요.',
    date: post.regDate || '',
    url: post.titleNo ? `${stationUrl}/post/${post.titleNo}` : stationBoardUrl,
  };
}

async function fetchLatestSoopNotice() {
  let lastError;
  for (const url of proxiedUrls(soopBoardApiUrl)) {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json, text/plain, */*' },
      });
      if (!response.ok) throw new Error(`SOOP notice request failed: ${response.status}`);
      const data = await response.json();
      const contents = Array.isArray(data.contents) ? data.contents : [];
      const notice = contents.find((post) => Number(post.bbsNo) === noticeBoardNo || post.display?.bbsName?.includes('공지'));
      if (notice) return normalizeNoticePost(notice);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('SOOP notice was not found.');
}

function parseLiveStatusFromStation(data) {
  const broad = data?.broad || null;
  const station = data?.station || {};
  const broadNo = broad?.broad_no || broad?.broadNo;
  const isLive = Boolean(broad) || Number(station?.active_no) === 1;

  return {
    isLive,
    isLoading: false,
    title: String(broad?.broad_title || broad?.title || station?.station_title || station?.station_name || '임하밍 생방송'),
    thumbnailUrl: findFirstImage(broad) || (broadNo ? `https://liveimg.afreecatv.com/m/${broadNo}` : '') || (isLive ? findFirstImage(data) : ''),
    url: stationLiveUrl,
  };
}

function parseLiveStatusFromPlayHtml(html) {
  const text = String(html || '');
  const isLive = /broadcasting-type=["']live["']/i.test(text) || /id=["']broadState["'][^>]*>\s*방송중\s*</i.test(text);
  const title = decodeHtmlEntities(text.match(/<h1[^>]*id=["']broadTitle["'][^>]*>(.*?)<\/h1>/i)?.[1]?.replace(/<[^>]*>/g, '') || '임하밍 생방송').trim();
  const image = absoluteImageUrl(text.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)?.[1] || '');

  return {
    isLive,
    isLoading: false,
    title,
    thumbnailUrl: image && !image.includes('blind_background') ? image : '',
    url: stationLiveUrl,
  };
}

async function fetchLatestLiveStatus() {
  let lastError;
  for (const url of proxiedUrls(soopStationApiUrl)) {
    try {
      const response = await fetch(url, { headers: { Accept: 'application/json, text/plain, */*' } });
      if (!response.ok) throw new Error(`SOOP station request failed: ${response.status}`);
      const data = await response.json();
      const status = parseLiveStatusFromStation(data);
      if (status.isLive) return status;
    } catch (error) {
      lastError = error;
    }
  }

  for (const url of proxiedUrls(stationLiveUrl)) {
    try {
      const response = await fetch(url, { headers: { Accept: 'text/html, text/plain, */*' } });
      if (!response.ok) throw new Error(`SOOP live page request failed: ${response.status}`);
      const status = parseLiveStatusFromPlayHtml(await response.text());
      if (status.isLive) return status;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) console.warn('Failed to load SOOP live status:', lastError);
  return { isLive: false, isLoading: false, title: '', thumbnailUrl: '', url: stationLiveUrl };
}

function normalizeSong(item) {
  return {
    id: String(item.id),
    title: item.title || 'Untitled',
    artist: item.artist || '',
    lyrics: item.lyrics || '',
    key: item.key || '',
    tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
    proficiency: item.proficiency || '',
    conditionCheck: Boolean(item.conditionCheck),
    remarks: item.remarks || '',
    coverUrl: item.coverUrl || '',
  };
}

function emptySongDraft() {
  return {
    id: '',
    title: '',
    artist: '',
    key: '',
    tags: [],
    proficiency: '보류',
    conditionCheck: false,
    remarks: '',
  };
}

function emptyKarmaDraft() {
  return {
    nickname: '',
    userId: '',
    category: 'upbo',
    itemName: '',
    itemValue: '',
  };
}

function defaultKarmaItemName(category) {
  return karmaCategoryOptions.find((item) => item.value === category)?.label || '업보';
}

function isCountValue(value) {
  const text = String(value ?? '').trim();
  return text === '' || !Number.isNaN(Number(text));
}

function eventDatePayload(dateKey) {
  return {
    start: `${dateKey}T00:00:00+09:00`,
    end: `${dateKey}T23:59:59+09:00`,
  };
}

function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseAssignments(value) {
  return parseJsonArray(value).reduce((acc, item) => {
    if (item && typeof item === 'object' && 'lineIndex' in item && 'memberId' in item) {
      acc[Number(item.lineIndex)] = String(item.memberId);
    }
    return acc;
  }, {});
}

function cleanRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function isIgnoredKarmaEntry(name, value) {
  const key = name.trim().toLowerCase();
  const text = String(value ?? '').trim().toLowerCase();
  return ['avatarurl', 'avatar_url', 'profileimage', 'profile_image', 'image', 'status'].includes(key)
    || text === ''
    || text === '0'
    || text === '완료'
    || Number(value) === 0;
}

function karmaItems(user) {
  const counts = Object.entries(user.counts || {})
    .filter(([name, count]) => !isIgnoredKarmaEntry(name, count))
    .map(([name, count]) => ({ name, value: String(count) }));
  const data = Object.entries(user.data || {})
    .filter(([name, value]) => !isIgnoredKarmaEntry(name, value))
    .map(([name, value]) => ({ name, value: String(value) }));
  return [...counts, ...data];
}

function karmaTotal(user) {
  return Object.values(user.counts || {}).reduce((sum, value) => sum + (Number(value) || 0), 0) || karmaItems(user).length;
}

function soopProfileImageUrl(userId) {
  const cleanId = String(userId || '').trim().toLowerCase();
  if (!/^[a-z0-9_]+$/.test(cleanId) || cleanId.length < 2) return '';
  return `https://stimg.afreecatv.com/LOGO/${cleanId.slice(0, 2)}/${cleanId}/${cleanId}.jpg`;
}

function karmaAvatarUrl(user) {
  return user.profileImage
    || user.data?.avatarUrl
    || user.data?.avatar_url
    || user.data?.profileImage
    || user.data?.profile_image
    || user.data?.image
    || soopProfileImageUrl(user.userId || user.user_id);
}

function karmaInitial(name) {
  return (name || '?').trim().slice(0, 1).toUpperCase();
}

function normalizeKarmaUsers(items) {
  const grouped = new Map();
  items.forEach((item) => {
    const userId = String(item.userId || item.user_id || '').trim();
    const key = userId.toLowerCase() || String(item.id);
    const target = grouped.get(key) || {
      id: String(item.id),
      nickname: item.nickname || '',
      userId,
      category: item.category || '',
      counts: {},
      data: {},
      profileImage: '',
    };
    Object.assign(target.counts, cleanRecord(item.counts));
    Object.assign(target.data, cleanRecord(item.data));
    target.nickname ||= item.nickname || '';
    target.userId ||= userId;
    target.profileImage = karmaAvatarUrl(target);
    grouped.set(key, target);
  });
  return Array.from(grouped.values())
    .filter((user) => karmaItems(user).length > 0)
    .sort((a, b) => (a.nickname || a.userId).localeCompare(b.nickname || b.userId, 'ko'));
}

function lyricLines(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line, index) => ({ lineIndex: index, text: line.trim() }))
    .filter((line) => line.text);
}

function levelText(song) {
  return song.proficiency || song.tags?.[0] || '미분류';
}

export default function ScrapbookPage() {
  const { isAdmin, logout } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [activePage, setActivePage] = useState('home');
  const [query, setQuery] = useState('');
  const [songQuery, setSongQuery] = useState('');
  const [selectedSongTag, setSelectedSongTag] = useState('');
  const [karmaQuery, setKarmaQuery] = useState('');
  const [baseDate, setBaseDate] = useState(new Date());
  const [schedules, setSchedules] = useState([]);
  const [songs, setSongs] = useState([]);
  const [karmaUsers, setKarmaUsers] = useState([]);
  const [exchangeRates, setExchangeRates] = useState([]);
  const [heroImageUrl, setHeroImageUrl] = useState(() => localStorage.getItem('imhaming.heroImageUrl') || '');
  const [karmaDetail, setKarmaDetail] = useState(null);
  const [partSongQuery, setPartSongQuery] = useState('');
  const [selectedPartSongId, setSelectedPartSongId] = useState('');
  const [partMembers, setPartMembers] = useState([]);
  const [partMemberName, setPartMemberName] = useState('');
  const [partLyrics, setPartLyrics] = useState('');
  const [partAssignments, setPartAssignments] = useState({});
  const [partCopied, setPartCopied] = useState(false);
  const [latestNotice, setLatestNotice] = useState(null);
  const [noticeLoadFailed, setNoticeLoadFailed] = useState(false);
  const [liveStatus, setLiveStatus] = useState({ isLive: false, isLoading: true, title: '', thumbnailUrl: '', url: stationLiveUrl });
  const [editingEvent, setEditingEvent] = useState(null);
  const [editingSong, setEditingSong] = useState(null);
  const [newKarmaEntry, setNewKarmaEntry] = useState(null);
  const [editingKarmaEntry, setEditingKarmaEntry] = useState(null);
  const [isMingGuideOpen, setIsMingGuideOpen] = useState(false);
  const [isKarmaEditMode, setIsKarmaEditMode] = useState(false);
  const [karmaDrafts, setKarmaDrafts] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const [calendarRows, songRows, ledgerRows, partRows, exchangeRateRows, noticeData] = await Promise.all([
          base44.entities.CalendarEvent.list().catch(() => []),
          base44.entities.Song.list().catch(() => []),
          base44.entities.LedgerUser.list().catch(() => []),
          base44.entities.PartDistributor.list().catch(() => []),
          base44.entities.ShopExchangeRate.list().catch(() => []),
          fetchLatestSoopNotice().catch((error) => {
            console.warn('Failed to load latest SOOP notice:', error);
            return null;
          }),
        ]);
        if (ignore) return;

        const normalizedSongs = songRows
          .filter((song) => song.title !== heroSettingTitle)
          .map(normalizeSong)
          .sort((a, b) => a.title.localeCompare(b.title, 'ko'));
        const heroSetting = songRows.find((song) => song.title === heroSettingTitle);
        const partSession = partRows[0];

        setSchedules(calendarRows.map(normalizeEvent).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)));
        setSongs(normalizedSongs);
        setKarmaUsers(normalizeKarmaUsers(ledgerRows));
        setExchangeRates([...exchangeRateRows].sort((a, b) => (Number(a.sortOrder ?? a.sort_order ?? a.pieces) || 0) - (Number(b.sortOrder ?? b.sort_order ?? b.pieces) || 0)));
        setLatestNotice(noticeData);
        setNoticeLoadFailed(!noticeData);
        if (heroSetting && !localStorage.getItem('imhaming.heroImageUrl')) {
          setHeroImageUrl(heroSetting.lyrics || heroSetting.remarks || heroSetting.coverUrl || '');
        }
        if (partSession) {
          setSelectedPartSongId(String(partSession.song_id || ''));
          setPartSongQuery(partSession.song_title || '');
          setPartLyrics(partSession.lyrics || '');
          setPartMembers(parseJsonArray(partSession.members).map((member, index) => ({
            id: String(member.id || `member-${index}`),
            name: String(member.name || ''),
            color: String(member.color || partColors[index % partColors.length]),
          })).filter((member) => member.name));
          setPartAssignments(parseAssignments(partSession.assignments));
        }
      } catch (error) {
        console.error('Failed to load scrapbook data:', error);
      }
    }
    loadData();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function refreshLiveStatus() {
      const status = await fetchLatestLiveStatus();
      if (!ignore) setLiveStatus(status);
    }

    refreshLiveStatus();
    const timer = window.setInterval(refreshLiveStatus, 60 * 1000);
    return () => {
      ignore = true;
      window.clearInterval(timer);
    };
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const normalizedSongQuery = songQuery.trim().toLowerCase();
  const normalizedKarmaQuery = karmaQuery.trim().toLowerCase();
  const today = new Date();
  const calendar = makeCalendar(baseDate);
  const monthLabel = `${baseDate.getFullYear()}.${String(baseDate.getMonth() + 1).padStart(2, '0')}`;

  const schedulesByDate = useMemo(() => schedules.reduce((acc, item) => {
    acc[item.date] ??= [];
    acc[item.date].push(item);
    return acc;
  }, {}), [schedules]);

  const visibleSongs = useMemo(() => songs.filter((song) => {
    const haystack = `${song.title} ${song.artist} ${song.key} ${song.tags.join(' ')} ${song.proficiency} ${song.remarks}`.toLowerCase();
    const matchesTag = !selectedSongTag || song.tags.some((tag) => tag.toLowerCase() === selectedSongTag.toLowerCase());
    return matchesTag && (!normalizedQuery || haystack.includes(normalizedQuery)) && (!normalizedSongQuery || haystack.includes(normalizedSongQuery));
  }), [normalizedQuery, normalizedSongQuery, selectedSongTag, songs]);

  const songTagOptions = useMemo(() => Array.from(new Set(songs.flatMap((song) => song.tags).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ko')), [songs]);

  const visibleKarma = useMemo(() => karmaUsers.filter((user) => {
    const itemText = karmaItems(user).map((item) => `${item.name} ${item.value}`).join(' ');
    const haystack = `${user.nickname} ${user.userId} ${user.category} ${itemText}`.toLowerCase();
    return (!normalizedQuery || haystack.includes(normalizedQuery)) && (!normalizedKarmaQuery || haystack.includes(normalizedKarmaQuery));
  }), [karmaUsers, normalizedKarmaQuery, normalizedQuery]);

  const selectedPartSong = useMemo(() => songs.find((song) => song.id === selectedPartSongId), [selectedPartSongId, songs]);
  const visiblePartSongs = useMemo(() => {
    const needle = partSongQuery.trim().toLowerCase().replace(/\s+/g, '');
    return songs.filter((song) => {
      if (!needle) return true;
      return `${song.title} ${song.artist}`.toLowerCase().replace(/\s+/g, '').includes(needle);
    }).slice(0, 80);
  }, [partSongQuery, songs]);
  const partLines = useMemo(() => lyricLines(partLyrics), [partLyrics]);
  const memberById = useMemo(() => new Map(partMembers.map((member) => [member.id, member])), [partMembers]);
  const partResultText = useMemo(() => partLines.map((line) => {
    const memberId = partAssignments[line.lineIndex] || '';
    const memberName = memberId === 'ALL_MEMBER' ? 'ALL' : memberById.get(memberId)?.name || '미정';
    return `[${memberName}] ${line.text}`;
  }).join('\n'), [memberById, partAssignments, partLines]);
  const todayEvents = schedulesByDate[toDateKey(today)] || [];
  const noticeTitle = latestNotice?.title || '최신 공지 확인 중';
  const noticeSummary = latestNotice?.summary || (noticeLoadFailed ? '공지 게시판에서 최신 공지를 확인해 주세요.' : '임하밍 방송국 최신 공지를 불러오고 있어요.');
  const noticeDate = latestNotice?.date || new Date().toLocaleDateString('ko-KR');
  const noticeUrl = latestNotice?.url || stationBoardUrl;
  const karmaEditRows = useMemo(() => visibleKarma.flatMap((user) => karmaItems(user).map((item) => {
    const key = `${user.id}:${item.name}`;
    return {
      key,
      user,
      item,
      draft: karmaDrafts[key] || {
        nickname: user.nickname || '',
        userId: user.userId || '',
        itemName: item.name,
        itemValue: item.value,
      },
    };
  })), [karmaDrafts, visibleKarma]);

  function saveHeroImage(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const imageUrl = String(reader.result || '');
      setHeroImageUrl(imageUrl);
      localStorage.setItem('imhaming.heroImageUrl', imageUrl);
    };
    reader.readAsDataURL(file);
  }

  function selectPartSong(song) {
    setSelectedPartSongId(song.id);
    setPartSongQuery(`${song.title} - ${song.artist || '가수 미상'}`);
    setPartLyrics(song.lyrics || '');
    setPartAssignments({});
  }

  function clearPartSong() {
    setSelectedPartSongId('');
    setPartSongQuery('');
    setPartLyrics('');
    setPartAssignments({});
  }

  function addPartMember(event) {
    event.preventDefault();
    const name = partMemberName.trim();
    if (!name) return;
    const id = `member-${Date.now()}`;
    setPartMembers((members) => [...members, { id, name, color: partColors[members.length % partColors.length] }]);
    setPartMemberName('');
  }

  function removePartMember(id) {
    setPartMembers((members) => members.filter((member) => member.id !== id));
    setPartAssignments((assignments) => Object.fromEntries(Object.entries(assignments).filter(([, memberId]) => memberId !== id)));
  }

  function assignPartLine(lineIndex, memberId) {
    setPartAssignments((assignments) => ({ ...assignments, [lineIndex]: memberId }));
  }

  function autoAssignParts(mode) {
    if (!partLines.length || !partMembers.length) return;
    const next = {};
    partLines.forEach((line, index) => {
      if (mode === 'chunk') {
        next[line.lineIndex] = partMembers[Math.floor(index / 4) % partMembers.length].id;
      } else {
        next[line.lineIndex] = partMembers[index % partMembers.length].id;
      }
    });
    setPartAssignments(next);
  }

  function openEventEditor(dateKey, event = null) {
    setEditError('');
    setEditingEvent(event ? {
      id: event.id,
      date: event.date,
      title: event.title,
      time: event.time || '',
      memo: event.location || '',
      color: event.color || eventColors[0],
    } : {
      id: '',
      date: dateKey || toDateKey(today),
      title: '',
      time: '',
      memo: '',
      color: eventColors[0],
    });
  }

  async function saveEvent() {
    if (!editingEvent?.title?.trim()) return;
    setIsSaving(true);
    setEditError('');
    try {
      const payload = {
        title: editingEvent.title.trim(),
        time: editingEvent.time.trim(),
        memo: editingEvent.memo.trim(),
        color: editingEvent.color || eventColors[0],
        ...eventDatePayload(editingEvent.date),
      };
      if (editingEvent.id) {
        const updated = await base44.entities.CalendarEvent.update(editingEvent.id, payload);
        setSchedules((items) => items.map((item) => (item.id === editingEvent.id ? normalizeEvent(updated) : item))
          .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)));
      } else {
        const created = await base44.entities.CalendarEvent.create(payload);
        setSchedules((items) => [...items, normalizeEvent(created)]
          .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)));
      }
      setEditingEvent(null);
    } catch (error) {
      console.error('Failed to save event:', error);
      setEditError('일정을 저장하지 못했습니다.');
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteEvent(event) {
    if (!event?.id || !window.confirm('이 일정을 삭제할까요?')) return;
    setIsSaving(true);
    try {
      await base44.entities.CalendarEvent.delete(event.id);
      setSchedules((items) => items.filter((item) => item.id !== event.id));
      setEditingEvent(null);
    } catch (error) {
      console.error('Failed to delete event:', error);
      setEditError('일정을 삭제하지 못했습니다.');
    } finally {
      setIsSaving(false);
    }
  }

  function openSongEditor(song = null) {
    setEditError('');
    setEditingSong(song ? {
      id: song.id,
      title: song.title,
      artist: song.artist,
      key: song.key,
      tags: Array.isArray(song.tags) ? song.tags : [],
      proficiency: song.proficiency || '보류',
      conditionCheck: Boolean(song.conditionCheck),
      remarks: song.remarks || '',
    } : emptySongDraft());
  }

  async function saveSong() {
    if (!editingSong?.title?.trim()) return;
    setIsSaving(true);
    setEditError('');
    try {
      const payload = {
        title: editingSong.title.trim(),
        artist: editingSong.artist.trim(),
        key: editingSong.key.trim(),
        tags: editingSong.tags,
        proficiency: editingSong.proficiency,
        conditionCheck: Boolean(editingSong.conditionCheck),
        remarks: editingSong.remarks.trim(),
      };
      if (editingSong.id) {
        const updated = await base44.entities.Song.update(editingSong.id, payload);
        setSongs((items) => items.map((song) => (song.id === editingSong.id ? normalizeSong({ ...song, ...updated, ...payload }) : song))
          .sort((a, b) => a.title.localeCompare(b.title, 'ko')));
      } else {
        const created = await base44.entities.Song.create({ ...payload, lyrics: '' });
        setSongs((items) => [...items, normalizeSong({ ...created, ...payload })]
          .sort((a, b) => a.title.localeCompare(b.title, 'ko')));
      }
      setEditingSong(null);
    } catch (error) {
      console.error('Failed to save song:', error);
      setEditError('노래를 저장하지 못했습니다.');
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteSong(song) {
    if (!song?.id || !window.confirm(`"${song.title}" 노래를 삭제할까요?`)) return;
    setIsSaving(true);
    try {
      await base44.entities.Song.delete(song.id);
      setSongs((items) => items.filter((item) => item.id !== song.id));
    } catch (error) {
      console.error('Failed to delete song:', error);
      setEditError('노래를 삭제하지 못했습니다.');
    } finally {
      setIsSaving(false);
    }
  }

  function mergeKarmaPayload(user, draft, previousName = '') {
    const itemName = (draft.itemName || previousName || defaultKarmaItemName(draft.category)).trim();
    const itemValue = String(draft.itemValue || '1').trim();
    const counts = { ...(user?.counts || {}) };
    const data = { ...(user?.data || {}) };
    if (previousName && previousName !== itemName) {
      delete counts[previousName];
      delete data[previousName];
    }
    if (draft.category === 'costume' || !isCountValue(itemValue)) {
      delete counts[itemName];
      data[itemName] = itemValue || '완료';
    } else {
      delete data[itemName];
      counts[itemName] = Number(itemValue || 1);
    }
    return { itemName, counts, data };
  }

  async function saveNewKarma() {
    if (!newKarmaEntry?.nickname?.trim()) return;
    setIsSaving(true);
    setEditError('');
    try {
      const draft = {
        ...newKarmaEntry,
        nickname: newKarmaEntry.nickname.trim(),
        userId: newKarmaEntry.userId.trim(),
      };
      const existing = karmaUsers.find((user) => (
        draft.userId && user.userId?.toLowerCase() === draft.userId.toLowerCase()
      ) || user.nickname === draft.nickname);
      const merged = mergeKarmaPayload(existing, draft);
      const payload = {
        nickname: draft.nickname,
        userId: draft.userId,
        category: draft.category,
        counts: merged.counts,
        data: merged.data,
      };
      const saved = existing
        ? await base44.entities.LedgerUser.update(existing.id, payload)
        : await base44.entities.LedgerUser.create(payload);
      setKarmaUsers((items) => normalizeKarmaUsers(existing
        ? items.map((user) => (user.id === existing.id ? { ...user, ...saved, ...payload } : user))
        : [...items, { ...saved, ...payload }]));
      setNewKarmaEntry(null);
    } catch (error) {
      console.error('Failed to save karma:', error);
      setEditError('업보를 저장하지 못했습니다.');
    } finally {
      setIsSaving(false);
    }
  }

  async function saveKarmaEdit(draft, user, previousName) {
    if (!draft?.nickname?.trim() || !draft?.itemName?.trim()) return;
    setIsSaving(true);
    setEditError('');
    try {
      const merged = mergeKarmaPayload(user, draft, previousName);
      const payload = {
        nickname: draft.nickname.trim(),
        userId: draft.userId.trim(),
        category: user.category || 'upbo',
        counts: merged.counts,
        data: merged.data,
      };
      const updated = await base44.entities.LedgerUser.update(user.id, payload);
      setKarmaUsers((items) => normalizeKarmaUsers(items.map((item) => (item.id === user.id ? { ...item, ...updated, ...payload } : item))));
      setKarmaDrafts((drafts) => {
        const next = { ...drafts };
        delete next[`${user.id}:${previousName}`];
        return next;
      });
      setEditingKarmaEntry(null);
    } catch (error) {
      console.error('Failed to update karma:', error);
      setEditError('업보를 수정하지 못했습니다.');
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteKarmaItem(user, itemName) {
    if (!user?.id || !itemName || !window.confirm('이 업보 항목을 삭제할까요?')) return;
    setIsSaving(true);
    try {
      const counts = { ...(user.counts || {}) };
      const data = { ...(user.data || {}) };
      delete counts[itemName];
      delete data[itemName];
      const updated = await base44.entities.LedgerUser.update(user.id, { counts, data });
      setKarmaUsers((items) => normalizeKarmaUsers(items.map((item) => (item.id === user.id ? { ...item, ...updated, counts, data } : item))));
      setKarmaDetail((current) => (current?.id === user.id ? { ...current, counts, data } : current));
    } catch (error) {
      console.error('Failed to delete karma:', error);
      setEditError('업보를 삭제하지 못했습니다.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="desk">
      <section className="book" aria-label="임하밍 아카이브">
        <div className="rings" aria-hidden="true">
          {Array.from({ length: 9 }).map((_, index) => <i className="ring" key={index} />)}
        </div>

        <nav className="tabs" aria-label="페이지 이동">
          {navItems.map((item) => (
            <button className={`tab ${activePage === item.id ? 'active' : ''}`} key={item.id} onClick={() => setActivePage(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="paper">
          <header className="book-top">
            <button className="book-brand" onClick={() => setActivePage('home')}>IMHAMING SCRAP BOOK</button>
            <input className="book-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="노래, 일정, 업보 검색" />
            <div className="book-admin">
              {isAdmin ? <button onClick={logout}>LOGOUT</button> : <button onClick={() => setIsLoginOpen(true)}>ADMIN</button>}
            </div>
          </header>

          <section className={`sheet ${activePage === 'home' ? 'active' : ''}`}>
            <div className="home-grid">
              <div className="hero-side">
                <span className="mini-date">IMHAMING DAILY ARCHIVE · {new Date().getFullYear()}</span>
                <h1 className="cut-title archive-title">
                  <span className="title-line">임하밍의</span>
                  <span className="title-line">아카이브</span>
                </h1>
                <div className="photo-card">
                  <div className="photo-art">
                    {heroImageUrl ? <img src={heroImageUrl} alt="임하밍 아카이브 대표 이미지" /> : <><span>IM</span><span>HAMING</span></>}
                  </div>
                  {isAdmin ? (
                    <label className="photo-upload">
                      이미지 추가
                      <input type="file" accept="image/*" onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) saveHeroImage(file);
                        event.target.value = '';
                      }} />
                    </label>
                  ) : null}
                  <p>오늘도 같이 저장해 둘 순간들</p>
                </div>
                <i className="sticker star" />
                <i className="sticker heart">IM</i>
              </div>

              <div className="info-side">
                <article className="memo today">
                  <span className="label">TODAY</span>
                  <h2>오늘의 일정</h2>
                  {todayEvents.length ? todayEvents.slice(0, 3).map((event) => <p key={event.id}>{event.time || '시간 미정'} · {event.title}</p>) : <p>오늘 등록된 일정이 없습니다.</p>}
                  <button onClick={() => setActivePage('schedule')}>일정 보기</button>
                </article>
                <article className="memo live">
                  <span className={`label ${liveStatus.isLive ? 'is-live' : ''}`}>ON AIR</span>
                  <a className={`live-card ${liveStatus.isLive ? 'is-live' : ''}`} href={liveStatus.url || stationLiveUrl} target="_blank" rel="noreferrer" aria-label={liveStatus.isLive ? '임하밍 생방송 보기' : '임하밍 방송 페이지 열기'}>
                    {liveStatus.isLive ? (
                      liveStatus.thumbnailUrl ? (
                        <>
                          <img src={liveStatus.thumbnailUrl} alt="현재 방송 썸네일" />
                          <div className="live-onair-caption"><span>LIVE</span><strong>{liveStatus.title || '임하밍 생방송'}</strong></div>
                        </>
                      ) : (
                        <div className="live-onair"><strong>LIVE</strong><span>{liveStatus.title || '방송 중'}</span></div>
                      )
                    ) : (
                      <div className="live-offline"><strong>{liveStatus.isLoading ? '...' : 'Zzz...'}</strong><span>{liveStatus.isLoading ? 'CHECKING' : 'OFF LINE'}</span></div>
                    )}
                  </a>
                </article>
                <article className="memo notice">
                  <span className="label">NOTICE</span>
                  <h2>{noticeTitle}</h2>
                  <p>{noticeSummary}</p>
                  <small>{noticeDate}</small>
                  <a href={noticeUrl} target="_blank" rel="noreferrer">공지 보기</a>
                </article>
                <article className="memo next">
                  <span className="label">STATION</span>
                  <h2>임하밍 방송국</h2>
                  <p>공지와 다시보기는 방송국에서 확인해요.</p>
                  <a href={stationUrl} target="_blank" rel="noreferrer">바로가기</a>
                </article>
              </div>
            </div>
          </section>

          <section className={`sheet ${activePage === 'schedule' ? 'active' : ''}`}>
            <PageHead title={`${monthLabel} 일정표`}>
              <div className="month-tools">
                <button onClick={() => setBaseDate(new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 1))}>이전</button>
                <button onClick={() => setBaseDate(new Date())}>오늘</button>
                <button onClick={() => setBaseDate(new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1))}>다음</button>
                {isAdmin ? <button type="button" onClick={() => openEventEditor(toDateKey(today))}>일정 등록</button> : null}
              </div>
            </PageHead>
            <div className="page-body paper-panel">
              <div className="calendar">
                {days.map((day) => <div className="cal-head" key={day}>{day}</div>)}
                {Array.from({ length: calendar.leading }).map((_, index) => <div className="day out" key={`out-${index}`} />)}
                {calendar.dates.map((date) => {
                  const key = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
                  const events = schedulesByDate[key] || [];
                  return (
                    <div className={`day ${key === toDateKey(today) ? 'today' : ''}`} key={key} onDoubleClick={() => isAdmin && openEventEditor(key)}>
                      <div className="day-top"><b>{date}</b></div>
                      <div className="event-stack">
                        {events.map((event) => (
                          <div className="event" key={event.id} style={{ '--event-color': event.color || '#4c8df6' }} title={[event.time, event.title, event.location].filter(Boolean).join(' · ')}>
                            <i aria-hidden="true" />
                            <span>{formatScheduleTime(event.time)}</span>
                            <strong>{event.title}</strong>
                            {isAdmin ? (
                              <em>
                                <button type="button" onClick={(clickEvent) => { clickEvent.stopPropagation(); openEventEditor(key, event); }} aria-label="일정 수정"><Pencil size={11} /></button>
                                <button type="button" onClick={(clickEvent) => { clickEvent.stopPropagation(); void deleteEvent(event); }} aria-label="일정 삭제"><Trash2 size={11} /></button>
                              </em>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className={`sheet ${activePage === 'songs' ? 'active' : ''}`}>
            <PageHead title="임하밍 노래책">
              {isAdmin ? <div className="month-tools"><button type="button" onClick={() => openSongEditor()}>노래 등록</button></div> : null}
            </PageHead>
            <div className="page-body song-layout">
              <aside className="filters">
                <h3>분류</h3>
                <div className="chips">
                  <button type="button" className={`chip ${selectedSongTag === '' ? 'active' : ''}`} onClick={() => setSelectedSongTag('')}>전체</button>
                  {songTagOptions.slice(0, 24).map((tag) => (
                    <button type="button" className={`chip ${selectedSongTag === tag ? 'active' : ''}`} key={tag} onClick={() => setSelectedSongTag((current) => (current === tag ? '' : tag))}>{tag}</button>
                  ))}
                </div>
              </aside>
              <div className="songs-area">
                <div className="song-toolbar">
                  <input value={songQuery} onChange={(event) => setSongQuery(event.target.value)} placeholder="노래 제목, 가수, 태그 검색" />
                  {songQuery ? <button type="button" onClick={() => setSongQuery('')}>초기화</button> : null}
                </div>
                <div className="song-card-grid">
                  {visibleSongs.map((song) => (
                    <article className={`song-card${isAdmin ? ' has-actions' : ''}`} key={song.id}>
                      <div className="song-card-main">
                        <div className="song-cover">
                          {song.coverUrl ? <span className="song-cover-img" style={{ backgroundImage: `url(${song.coverUrl})` }} /> : <span className="song-cover-empty">NO<br />COVER</span>}
                        </div>
                        <div className="song-card-title"><strong>{song.title}</strong><span>↗ {song.artist || '가수 미상'}</span></div>
                        <div className="song-card-tags">
                          {song.key ? <span className="key-chip">{song.key}</span> : null}
                          {song.tags.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}
                        </div>
                      </div>
                      <div className="song-badges">
                        <span className={`status-badge ${proficiencyOk.has(song.proficiency) ? 'ok' : 'hold'}`}>{levelText(song)}</span>
                        {song.conditionCheck ? <span className="condition-badge">컨디션 체크 필요</span> : null}
                      </div>
                      {song.remarks ? <p className="song-remarks">{song.remarks}</p> : <p className="song-remarks muted">비고 없음</p>}
                      {isAdmin ? (
                        <div className="song-card-footer">
                          <div className="song-admin-actions">
                            <button type="button" onClick={() => openSongEditor(song)}>수정</button>
                            <button type="button" onClick={() => void deleteSong(song)}>삭제</button>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  ))}
                  {!visibleSongs.length ? <p className="empty-text">찾는 노래가 없습니다.</p> : null}
                </div>
              </div>
            </div>
          </section>

          <section className={`sheet ${activePage === 'karma' ? 'active' : ''}`}>
            <PageHead title="업보 현황">
              <div className="month-tools karma-head-tools">
                {isAdmin ? <button type="button" onClick={() => setNewKarmaEntry(emptyKarmaDraft())}>업보 등록</button> : null}
                <div className="ming-guide-wrap">
                  <button type="button" className="ming-guide-button" onClick={() => setIsMingGuideOpen((value) => !value)} aria-expanded={isMingGuideOpen}>
                    <Info size={14} />밍조각
                  </button>
                  {isMingGuideOpen ? (
                    <aside className="ming-guide-popover">
                      <div className="ming-exchange-list">
                        {exchangeRates.length ? exchangeRates.map((rate) => (
                          <span key={rate.id || `${rate.pieces}-${rate.reward}`}>
                            <b>{Number(rate.pieces).toLocaleString('ko-KR')}조각</b>
                            <em>{rate.reward}</em>
                          </span>
                        )) : <p>등록된 교환비율이 없습니다.</p>}
                      </div>
                    </aside>
                  ) : null}
                </div>
                {isAdmin ? <button type="button" onClick={() => setIsKarmaEditMode((value) => !value)}>{isKarmaEditMode ? '카드 보기' : '업보 수정'}</button> : null}
              </div>
            </PageHead>
            <div className="page-body karma-board">
              {isKarmaEditMode && isAdmin ? (
                <section className="karma-edit-panel">
                  <div className="karma-card-search"><span>검색</span><input value={karmaQuery} onChange={(event) => setKarmaQuery(event.target.value)} placeholder="닉네임, SOOP ID, 업보 항목 검색" /></div>
                  <div className="karma-edit-table-wrap">
                    <table className="karma-edit-table">
                      <thead>
                        <tr><th>#</th><th>닉네임</th><th>SOOP ID</th><th>업보 항목</th><th>내용/수량</th><th>관리</th></tr>
                      </thead>
                      <tbody>
                        {karmaEditRows.map(({ key, user, item, draft }, index) => (
                          <tr key={key}>
                            <td>{index + 1}</td>
                            <td><input value={draft.nickname} onChange={(event) => setKarmaDrafts((drafts) => ({ ...drafts, [key]: { ...draft, nickname: event.target.value } }))} /></td>
                            <td><input value={draft.userId} onChange={(event) => setKarmaDrafts((drafts) => ({ ...drafts, [key]: { ...draft, userId: event.target.value } }))} /></td>
                            <td><input value={draft.itemName} onChange={(event) => setKarmaDrafts((drafts) => ({ ...drafts, [key]: { ...draft, itemName: event.target.value } }))} /></td>
                            <td><input value={draft.itemValue} onChange={(event) => setKarmaDrafts((drafts) => ({ ...drafts, [key]: { ...draft, itemValue: event.target.value } }))} /></td>
                            <td>
                              <div className="karma-edit-actions">
                                <button type="button" onClick={() => void saveKarmaEdit(draft, user, item.name)} disabled={isSaving}>저장</button>
                                <button type="button" onClick={() => void deleteKarmaItem(user, item.name)} disabled={isSaving}>삭제</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {!karmaEditRows.length ? <tr><td colSpan={6} className="karma-empty-row">수정할 업보가 없습니다.</td></tr> : null}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : (
                <section className="karma-card-panel">
                  <div className="karma-card-search"><span>검색</span><input value={karmaQuery} onChange={(event) => setKarmaQuery(event.target.value)} placeholder="닉네임 또는 SOOP ID 검색" /></div>
                  <div className="karma-profile-grid">
                    {visibleKarma.map((user, index) => {
                      const avatar = karmaAvatarUrl(user);
                      const items = karmaItems(user);
                      return (
                        <button type="button" className="karma-profile-card" key={user.id} onClick={() => setKarmaDetail(user)}>
                          <span className="karma-rank">{String(index + 1).padStart(2, '0')}</span>
                          <div className="karma-avatar"><strong>{karmaInitial(user.nickname || user.userId)}</strong>{avatar ? <img src={avatar} alt={`${user.nickname || user.userId} 프로필`} loading="lazy" decoding="async" onError={(event) => event.currentTarget.remove()} /> : null}</div>
                          <p>SOOP · {user.userId || '-'}</p>
                          <h2>{user.nickname || '이름 없음'}</h2>
                          <div className="karma-card-line" />
                          <div className="karma-card-meta"><strong>업보 {karmaTotal(user)}</strong><span>{items.length} CATEGORIES</span></div>
                          <span className="karma-record-empty">VIEW RECORD ↗</span>
                        </button>
                      );
                    })}
                    {!visibleKarma.length ? <p className="empty-text">NO RECORDS YET</p> : null}
                  </div>
                </section>
              )}
            </div>
          </section>

          <section className={`sheet ${activePage === 'parts' ? 'active' : ''}`}>
            <PageHead title="파트분배" />
            <div className="page-body part-board">
              <section className="part-editor">
                <div className="part-panel-head"><h2>노래 선택</h2>{selectedPartSong ? <button type="button" onClick={clearPartSong}>선택 해제</button> : null}</div>
                <input value={partSongQuery} onChange={(event) => setPartSongQuery(event.target.value)} placeholder="노래 검색 또는 선택..." />
                <div className="part-song-list">
                  {visiblePartSongs.map((song) => <button type="button" className={selectedPartSongId === song.id ? 'selected' : ''} key={song.id} onClick={() => selectPartSong(song)}><strong>{song.title}</strong><span>↗ {song.artist || '가수 미상'}</span></button>)}
                  {!visiblePartSongs.length ? <p>검색 결과가 없습니다.</p> : null}
                </div>
                <label className="lyrics-input">가사<textarea value={partLyrics} onChange={(event) => { setPartLyrics(event.target.value); setPartAssignments({}); }} placeholder="노래를 선택하거나 가사를 직접 입력하세요." /></label>
                <div className="part-actions">
                  <button type="button" onClick={() => setPartLyrics('')}>가사 지우기</button>
                  <button type="button" onClick={() => { void navigator.clipboard.writeText(partResultText); setPartCopied(true); window.setTimeout(() => setPartCopied(false), 1200); }} disabled={!partResultText}>{partCopied ? '복사됨' : '결과 복사'}</button>
                </div>
              </section>
              <section className="part-preview">
                <div className="part-preview-head"><span>PART DISTRIBUTION</span><h2>{selectedPartSong?.title || partSongQuery || '새로 시작하기'}</h2><p>{partLines.length} lines · {partMembers.length} members</p></div>
                <div className="part-member-panel">
                  <div className="part-panel-head"><h2>참여 멤버</h2><button type="button" onClick={() => { setPartMembers([]); setPartAssignments({}); }}>초기화</button></div>
                  <form className="part-member-form" onSubmit={addPartMember}><input value={partMemberName} onChange={(event) => setPartMemberName(event.target.value)} placeholder="멤버 이름 입력" /><button type="submit">추가</button></form>
                  <div className="part-member-list">{partMembers.map((member) => <button type="button" key={member.id} style={{ '--member-color': member.color }} onClick={() => removePartMember(member.id)}>{member.name}<span>×</span></button>)}{!partMembers.length ? <p>멤버를 추가하면 파트 지정이 가능해요.</p> : null}</div>
                  <div className="part-auto-actions"><button type="button" onClick={() => autoAssignParts('auto')} disabled={!partLines.length || !partMembers.length}>자동분배</button><button type="button" onClick={() => autoAssignParts('chunk')} disabled={!partLines.length || !partMembers.length}>4줄씩</button></div>
                </div>
                <div className="part-lines">
                  {partLines.map((line) => {
                    const memberId = partAssignments[line.lineIndex] || '';
                    const member = memberId === 'ALL_MEMBER' ? null : memberById.get(memberId);
                    return (
                      <article className="part-line" key={`${line.text}-${line.lineIndex}`}>
                        <span style={{ '--member-color': member?.color || '#e7edf2' }}>{memberId === 'ALL_MEMBER' ? 'ALL' : member?.name || '미정'}</span>
                        <p>{line.text}</p>
                        <div className="part-line-buttons">
                          {partMembers.map((partMember) => <button type="button" className={memberId === partMember.id ? 'selected' : ''} key={partMember.id} style={{ '--member-color': partMember.color }} onClick={() => assignPartLine(line.lineIndex, partMember.id)}>{partMember.name}</button>)}
                          <button type="button" className={memberId === 'ALL_MEMBER' ? 'selected all' : 'all'} onClick={() => assignPartLine(line.lineIndex, 'ALL_MEMBER')}>ALL</button>
                        </div>
                      </article>
                    );
                  })}
                  {!partLines.length ? <div className="part-empty"><strong>노래를 선택하거나 가사를 입력하면 여기에 파트가 보여요.</strong><p>멤버 추가 후 자동분배를 누르거나 줄마다 직접 지정할 수 있습니다.</p></div> : null}
                </div>
              </section>
            </div>
          </section>
        </div>
      </section>

      {karmaDetail ? (
        <div className="modal-dim" onClick={() => setKarmaDetail(null)}>
          <section className="karma-detail-modal" onClick={(event) => event.stopPropagation()}>
            <div className="karma-detail-head"><h2>업보 상세</h2><button type="button" onClick={() => setKarmaDetail(null)} aria-label="닫기">×</button></div>
            <div className="karma-detail-profile">
              <div className="karma-avatar"><strong>{karmaInitial(karmaDetail.nickname || karmaDetail.userId)}</strong>{karmaAvatarUrl(karmaDetail) ? <img src={karmaAvatarUrl(karmaDetail)} alt={`${karmaDetail.nickname || karmaDetail.userId} 프로필`} loading="lazy" decoding="async" onError={(event) => event.currentTarget.remove()} /> : null}</div>
              <div><p>SOOP · {karmaDetail.userId || '-'}</p><h3>{karmaDetail.nickname || '이름 없음'}</h3></div>
              {karmaDetail.userId ? <a href={`https://www.sooplive.com/station/${encodeURIComponent(karmaDetail.userId)}`} target="_blank" rel="noreferrer">STATION ↗</a> : null}
            </div>
            <div className="karma-detail-line" />
            <div className="karma-detail-list">
              {karmaItems(karmaDetail).map((item) => (
                <article key={`${item.name}-${item.value}`}>
                  <div><strong>{item.name}</strong><span>{item.value}</span></div>
                  {isAdmin ? (
                    <div className="karma-detail-actions">
                      <button type="button" onClick={() => setEditingKarmaEntry({ nickname: karmaDetail.nickname || '', userId: karmaDetail.userId || '', itemName: item.name, itemValue: item.value, previousName: item.name, user: karmaDetail })}>수정</button>
                      <button type="button" onClick={() => void deleteKarmaItem(karmaDetail, item.name)}>삭제</button>
                    </div>
                  ) : null}
                </article>
              ))}
              {!karmaItems(karmaDetail).length ? <p>등록된 업보가 없습니다.</p> : null}
            </div>
          </section>
        </div>
      ) : null}

      {editingEvent ? (
        <div className="modal-dim" onClick={() => setEditingEvent(null)}>
          <form className="edit-panel" onSubmit={(event) => { event.preventDefault(); void saveEvent(); }} onClick={(event) => event.stopPropagation()}>
            <div className="edit-head"><h2>{editingEvent.id ? '일정 수정' : '일정 추가'}</h2><button type="button" onClick={() => setEditingEvent(null)} aria-label="닫기"><X size={18} /></button></div>
            <label>제목<input value={editingEvent.title} onChange={(event) => setEditingEvent({ ...editingEvent, title: event.target.value })} required /></label>
            <label>날짜<input type="date" value={editingEvent.date} onChange={(event) => setEditingEvent({ ...editingEvent, date: event.target.value })} required /></label>
            <label>시간<input value={editingEvent.time} onChange={(event) => setEditingEvent({ ...editingEvent, time: event.target.value })} placeholder="20:00" /></label>
            <label>색상<input type="color" value={editingEvent.color} onChange={(event) => setEditingEvent({ ...editingEvent, color: event.target.value })} /></label>
            <div className="event-color-palette" aria-label="기본 색상 팔레트">
              {eventColors.map((color) => <button type="button" className={editingEvent.color.toLowerCase() === color.toLowerCase() ? 'active' : ''} style={{ '--swatch-color': color }} onClick={() => setEditingEvent({ ...editingEvent, color })} aria-label={`색상 ${color}`} key={color} />)}
            </div>
            <label>메모<textarea value={editingEvent.memo} onChange={(event) => setEditingEvent({ ...editingEvent, memo: event.target.value })} rows={4} /></label>
            {editError ? <p className="edit-error">{editError}</p> : null}
            <button className="edit-save" disabled={isSaving}>{isSaving ? '저장 중' : '저장'}</button>
          </form>
        </div>
      ) : null}

      {editingSong ? (
        <div className="modal-dim" onClick={() => setEditingSong(null)}>
          <form className="edit-panel" onSubmit={(event) => { event.preventDefault(); void saveSong(); }} onClick={(event) => event.stopPropagation()}>
            <div className="edit-head"><h2>{editingSong.id ? '노래 수정' : '노래 등록'}</h2><button type="button" onClick={() => setEditingSong(null)} aria-label="닫기"><X size={18} /></button></div>
            <label>곡명<input value={editingSong.title} onChange={(event) => setEditingSong({ ...editingSong, title: event.target.value })} required /></label>
            <label>가수<input value={editingSong.artist} onChange={(event) => setEditingSong({ ...editingSong, artist: event.target.value })} /></label>
            <label>키<input value={editingSong.key} onChange={(event) => setEditingSong({ ...editingSong, key: event.target.value })} placeholder="F# 원키, -2키" /></label>
            <fieldset className="tag-picker">
              <legend>태그</legend>
              {songTagOptions.map((tag) => (
                <label key={tag}>
                  <input type="checkbox" checked={editingSong.tags.includes(tag)} onChange={(event) => {
                    const tags = event.target.checked ? [...editingSong.tags, tag] : editingSong.tags.filter((item) => item !== tag);
                    setEditingSong({ ...editingSong, tags });
                  }} />
                  <span>{tag}</span>
                </label>
              ))}
              {!songTagOptions.length ? <p>선택할 태그가 없습니다.</p> : null}
            </fieldset>
            <label>숙련도<select value={editingSong.proficiency} onChange={(event) => setEditingSong({ ...editingSong, proficiency: event.target.value })}>{songProficiencyOptions.map((option) => <option value={option} key={option}>{option}</option>)}</select></label>
            <label className="check-line"><input type="checkbox" checked={editingSong.conditionCheck} onChange={(event) => setEditingSong({ ...editingSong, conditionCheck: event.target.checked })} /><span>컨디션 체크</span></label>
            <label>비고<textarea value={editingSong.remarks} onChange={(event) => setEditingSong({ ...editingSong, remarks: event.target.value })} rows={3} /></label>
            {editError ? <p className="edit-error">{editError}</p> : null}
            <button className="edit-save" disabled={isSaving}>{isSaving ? '저장 중' : '저장'}</button>
          </form>
        </div>
      ) : null}

      {newKarmaEntry ? (
        <div className="modal-dim" onClick={() => setNewKarmaEntry(null)}>
          <form className="edit-panel" onSubmit={(event) => { event.preventDefault(); void saveNewKarma(); }} onClick={(event) => event.stopPropagation()}>
            <div className="edit-head"><h2>업보 등록</h2><button type="button" onClick={() => setNewKarmaEntry(null)} aria-label="닫기"><X size={18} /></button></div>
            <label>닉네임<input value={newKarmaEntry.nickname} onChange={(event) => setNewKarmaEntry({ ...newKarmaEntry, nickname: event.target.value })} required /></label>
            <label>SOOP ID<input value={newKarmaEntry.userId} onChange={(event) => setNewKarmaEntry({ ...newKarmaEntry, userId: event.target.value })} required /></label>
            <label>분류<select value={newKarmaEntry.category} onChange={(event) => setNewKarmaEntry({ ...newKarmaEntry, category: event.target.value })}>{karmaCategoryOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
            <label>업보 항목<input value={newKarmaEntry.itemName} onChange={(event) => setNewKarmaEntry({ ...newKarmaEntry, itemName: event.target.value })} placeholder="예: 밍조각, 노래권, costume" /></label>
            <label>내용/수량<input value={newKarmaEntry.itemValue} onChange={(event) => setNewKarmaEntry({ ...newKarmaEntry, itemValue: event.target.value })} placeholder="예: 1 또는 완료" /></label>
            {editError ? <p className="edit-error">{editError}</p> : null}
            <button className="edit-save" disabled={isSaving}>{isSaving ? '등록 중' : '등록'}</button>
          </form>
        </div>
      ) : null}

      {editingKarmaEntry ? (
        <div className="modal-dim" onClick={() => setEditingKarmaEntry(null)}>
          <form className="edit-panel" onSubmit={(event) => { event.preventDefault(); void saveKarmaEdit(editingKarmaEntry, editingKarmaEntry.user, editingKarmaEntry.previousName); }} onClick={(event) => event.stopPropagation()}>
            <div className="edit-head"><h2>업보 수정</h2><button type="button" onClick={() => setEditingKarmaEntry(null)} aria-label="닫기"><X size={18} /></button></div>
            <label>닉네임<input value={editingKarmaEntry.nickname} onChange={(event) => setEditingKarmaEntry({ ...editingKarmaEntry, nickname: event.target.value })} required /></label>
            <label>SOOP ID<input value={editingKarmaEntry.userId} onChange={(event) => setEditingKarmaEntry({ ...editingKarmaEntry, userId: event.target.value })} required /></label>
            <label>업보 항목<input value={editingKarmaEntry.itemName} onChange={(event) => setEditingKarmaEntry({ ...editingKarmaEntry, itemName: event.target.value })} required /></label>
            <label>내용/수량<input value={editingKarmaEntry.itemValue} onChange={(event) => setEditingKarmaEntry({ ...editingKarmaEntry, itemValue: event.target.value })} placeholder="예: 1 또는 완료" /></label>
            {editError ? <p className="edit-error">{editError}</p> : null}
            <button className="edit-save" disabled={isSaving}>{isSaving ? '수정 중' : '수정 저장'}</button>
          </form>
        </div>
      ) : null}

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </main>
  );
}

function PageHead({ title, children }) {
  return (
    <header className="page-head">
      <div><h1>{title}</h1></div>
      {children}
    </header>
  );
}
