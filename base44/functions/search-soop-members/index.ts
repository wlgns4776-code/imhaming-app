Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  let input;
  try {
    input = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  const query = typeof input?.query === 'string' ? input.query.trim() : '';
  const page = Number(input?.page || 1);
  if (!query || query.length > 60 || !Number.isInteger(page) || page < 1 || page > 100) {
    return Response.json({ error: '닉네임을 60자 이내로 입력해 주세요.' }, { status: 400 });
  }

  try {
    const pageSize = 24;
    const params = new URLSearchParams({
      l: 'DF', m: 'bjSearch', v: '3.0', szOrder: 'score', szKeyword: query,
      nPageNo: String(page), nListCnt: String(pageSize), w: 'webk', tab: 'bj',
    });
    const response = await fetch(`https://sch.sooplive.com/api.php?${params}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`SOOP search failed: ${response.status}`);
    const result = await response.json();
    if (Number(result.RESULT) !== 1 || !Array.isArray(result.DATA)) throw new Error('Invalid SOOP search response');

    const members = result.DATA
      .filter((member) => /^[a-z0-9_]{2,64}$/i.test(member.user_id || ''))
      .map((member) => ({
        userId: String(member.user_id).toLowerCase(),
        nickname: String(member.user_nick || member.user_id),
        profileImage: String(member.station_logo || ''),
      }));
    const total = Number(result.TOTAL_CNT) || 0;
    return Response.json({ members, page, hasMore: page * pageSize < total && page < 100 });
  } catch (error) {
    console.error('Failed to search SOOP members:', error);
    return Response.json({ error: 'SOOP 검색을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 502 });
  }
});
