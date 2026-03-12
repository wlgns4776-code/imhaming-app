const axios = require('axios');

async function test() {
    const artist = '넬';
    const title = '기억을 걷는 시간';
    const API_KEY = '5ccbc1d3c6ce67532f9af5aa10137362b8934bab2f3dcc4c533b61551ced6174';
    
    const searchString = `${artist} ${title}`.trim();
    const query = encodeURIComponent(`${searchString} 가사`);
    const targetUrl = `https://serpapi.com/search.json?engine=google&q=${query}&api_key=${API_KEY}`;
    const url = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
    
    try {
        console.log('Fetching', url);
        const res = await axios.get(url);
        console.log('Status', res.status);
        console.log('HAS_CONTENTS', !!res.data.contents);
        
        if (res.data.contents) {
            const data = JSON.parse(res.data.contents);
            console.log('HAS_ANSWER_BOX', !!data.answer_box);
            if (data.answer_box) {
                console.log('HAS_LYRICS', !!data.answer_box.lyrics);
                if (data.answer_box.lyrics) {
                    console.log(data.answer_box.lyrics.substring(0, 50) + "...");
                }
            }
        }
    } catch(e) {
        console.error('ERROR:', e.message);
    }
}
test();
