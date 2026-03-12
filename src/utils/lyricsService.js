import axios from 'axios';
import { base44 } from '../api/base44Client';

export const fetchLyricsWithSerpApi = async (artist, title) => {
    const API_KEY = import.meta.env.VITE_SERPAPI_KEY;
    const searchString = `${artist} ${title}`.trim();
    
    // 1. 먼저 벅스(Bugs)에서 가사 검색 시도 (가장 정확하고 빠르며 한글 곡에 최적화됨)
    try {
        const bugsQuery = encodeURIComponent(searchString);
        const bugsSearchUrl = `https://music.bugs.co.kr/search/track?q=${bugsQuery}`;
        const bugsProxyUrl = `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(bugsSearchUrl)}`;
        
        const bugsSearchRes = await axios.get(bugsProxyUrl);
        // HTML 내에서 트랙 URL 추출
        const trackUrlMatch = bugsSearchRes.data.match(/https:\/\/music\.bugs\.co\.kr\/track\/\d+/);
        
        if (trackUrlMatch && trackUrlMatch[0]) {
            const trackUrl = trackUrlMatch[0];
            const trackProxyUrl = `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(trackUrl)}`;
            const trackRes = await axios.get(trackProxyUrl);
            
            // 벅스는 <xmp> 태그 안에 원본 가사를 보존합니다.
            const lyricsMatch = trackRes.data.match(/<xmp[^>]*>([\s\S]*?)<\/xmp>/i);
            if (lyricsMatch && lyricsMatch[1]) {
                const bugsLyrics = lyricsMatch[1].trim();
                if (bugsLyrics.length > 30) {
                    console.log("벅스(Bugs)에서 가사를 성공적으로 찾았습니다!");
                    return bugsLyrics;
                }
            }
        }
    } catch (err) {
        console.log("벅스 가사 검색 중 오류 발생 또는 찾지 못함, 다음 단계로 넘어갑니다.", err.message);
    }

    // 2. 벅스 실패 시 SerpApi 구글 검색 시도
    const query = encodeURIComponent(`${searchString} 가사`);
    const targetUrl = `https://serpapi.com/search.json?engine=google&q=${query}&api_key=${API_KEY}`;
    const url = `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(targetUrl)}`;

    try {
        const response = await axios.get(url);
        // codetabs 프록시는 원본 JSON을 그대로 반환합니다.
        const data = response.data;

        // 2-1. 일반 검색 시 가사 답변 박스가 있는지 확인
        if (data.answer_box && data.answer_box.lyrics) {
            console.log("구글 검색(SerpApi)에서 가사를 찾았습니다!");
            return data.answer_box.lyrics;
        }

        // 2-2. 구글이 오타 수정을 제안한 경우 ("이것으로 검색하셨습니까?")
        if (data.search_information && data.search_information.spelling_fix) {
            const correctedTargetUrl = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(data.search_information.spelling_fix + ' 가사')}&api_key=${API_KEY}`;
            const correctedUrl = `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(correctedTargetUrl)}`;
            const correctedRes = await axios.get(correctedUrl);
            const correctedData = correctedRes.data;
            if (correctedData.answer_box && correctedData.answer_box.lyrics) {
                 console.log("구글 오타 교정 검색(SerpApi)에서 가사를 찾았습니다!");
                 return correctedData.answer_box.lyrics;
            }
        }

        // 3. 서프API가 답변 박스를 찾지 못했다면 AI로 폴백 검색
        console.log("SerpApi 실패. AI로 넘겨서 가사를 찾습니다...");
        const llmResponse = await base44.integrations.Core.InvokeLLM({
             prompt: `노래 '${searchString}'의 전체 가사 전문을 구글 검색이나 여러 지식을 통합해 찾아주세요. 
규칙:
1. "죄송합니다", "찾을 수 없습니다", "저작권" 등의 부연 설명은 절대 하지 마세요.
2. 만약 가사를 안다면 오직 '가사 본문'만 출력하세요.
3. [가수명] 처럼 파트가 구분된 원본 가사가 있다면 그대로 유지하세요.
4. 가사를 도저히 모르겠다면 오직 'NOT_FOUND'라고만 답변하세요.
`,
             add_context_from_internet: true
        });

        if (llmResponse && typeof llmResponse === 'string' && !llmResponse.includes('NOT_FOUND') && llmResponse.length > 30) {
            let cleanedLyrics = llmResponse.trim();
            if (cleanedLyrics.toLowerCase().startsWith('가사:')) {
                cleanedLyrics = cleanedLyrics.substring(3).trim();
            }
            return cleanedLyrics;
        }

        return null; // 최종 실패
    } catch (error) {
        console.error("가사 통합 검색 중 오류:", error.message);
        return null; // 에러 발생 시
    }
};
