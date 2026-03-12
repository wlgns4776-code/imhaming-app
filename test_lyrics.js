const axios = require('axios');
const cheerio = require('cheerio');

async function getLyrics(artist, title) {
    try {
        const query = encodeURIComponent(`${artist} ${title}`);
        const searchUrl = `https://genius.com/api/search/multi?per_page=1&q=${query}`;
        const searchRes = await axios.get(searchUrl);
        
        let url = null;
        for (let section of searchRes.data.response.sections) {
            if (section.hits && section.hits.length > 0) {
                let hit = section.hits[0].result;
                if(hit && hit.url) {
                    url = hit.url;
                    break;
                }
            }
        }
        
        if (!url) return null;

        const pageRes = await axios.get(url);
        const $ = cheerio.load(pageRes.data);
        
        // Convert <br> to newlines
        $('[data-lyrics-container="true"]').find('br').replaceWith('\n');
        
        let lyrics = '';
        $('[data-lyrics-container="true"]').each((i, el) => {
            lyrics += $(el).text() + '\n';
        });

        return lyrics.trim() || null;
    } catch (err) {
        return null; // Ignore errors like 404
    }
}

(async () => {
   console.log("아이유 밤편지:", await getLyrics("아이유", "밤편지"));
})();
