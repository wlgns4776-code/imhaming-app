import { base44 } from './base44Client';
import { fetchSoopProfile, normalizeSoopSearchResults } from '../utils/soopProfiles';

export async function searchSoopMembers(value, page = 1, signal) {
  const query = String(value || '').trim();
  if (!query) throw new Error('닉네임 또는 SOOP ID를 입력해 주세요.');
  if (/^[a-z][a-z\d+.-]*:|^(?:www\.|bj\.|play\.|ch\.)?[\w.-]+\.[a-z]{2,}\//i.test(query)) {
    return { members: [await fetchSoopProfile(query, signal)], page: 1, hasMore: false };
  }
  if (query.length > 60) throw new Error('닉네임을 60자 이내로 입력해 주세요.');
  try {
    const response = await base44.functions.invoke('search-soop-members', { query, page });
    if (signal?.aborted) throw new DOMException('Search cancelled', 'AbortError');
    return normalizeSoopSearchResults(response.data);
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error(error.response?.data?.error || 'SOOP 검색을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }
}
