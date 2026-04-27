const axios = require('axios');
async function test() {
    const q = encodeURIComponent('태연 11:11');
    const res = await axios.get(`https://music.bugs.co.kr/search/track?q=${q}`, {
        headers: {'User-Agent': 'Mozilla/5.0'}
    });
    const matches = res.data.match(/image\.bugsm\.co\.kr\/album\/images\/[^"']+/g);
    console.log("Matches:", matches ? matches.slice(0, 5) : 'not found');
}
test();
