const axios = require('axios');

async function getLyricsWithSerpApi(artist, title) {
    // 여기에 SerpApi에서 발급받은 API 키를 넣으세요!
    const API_KEY = "5ccbc1d3c6ce67532f9af5aa10137362b8934bab2f3dcc4c533b61551ced6174";
    
    // 검색어: "가수 이름 + 노래 제목 + 가사"
    const query = encodeURIComponent(`${artist} ${title} 가사`);
    
    // SerpApi 구글 검색 엔드포인트
    const url = `https://serpapi.com/search.json?engine=google&q=${query}&api_key=${API_KEY}`;

    try {
        console.log(`"${artist} - ${title}" 가사를 검색합니다...`);
        const response = await axios.get(url);
        const data = response.data;

        // 구글 검색 결과에서 맨 위에 크게 뜨는 "answer_box" 에 가사가 있는 경우
        if (data.answer_box && data.answer_box.lyrics) {
            console.log("✅ 구글 답변 상자(Answer Box)에서 가사를 찾았습니다!");
            return data.answer_box.lyrics;
        }

        console.log("❌ 구글 답변 상자에서 가사를 찾지 못했습니다. 일반 검색 결과만 있습니다.");
        return null;

    } catch (error) {
        console.error("API 요청 중 오류 발생:", error.message);
        return null;
    }
}

// 테스트 실행
(async () => {
   const lyrics = await getLyricsWithSerpApi("아이유", "밤편지");
   if (lyrics) {
       console.log("===============================");
       console.log(lyrics);
       console.log("===============================");
   } else {
       console.log("가사를 가져오지 못했습니다.");
   }
})();
