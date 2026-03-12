const axios = require('axios');

async function test() {
    try {
        const query = encodeURIComponent('넬 기억을 걷는 시간');
        const searchUrl = `https://music.bugs.co.kr/search/track?q=${query}`;
        console.log('Searching Bugs for:', searchUrl);
        
        const res = await axios.get(searchUrl);
        
        let trackUrlMatch = res.data.match(/https:\/\/music\.bugs\.co\.kr\/track\/\d+/);
        if (trackUrlMatch) {
            const tb = trackUrlMatch[0];
            console.log('Found Track URL:', tb);
            const res2 = await axios.get(tb);
            
            // Bugs uses <xmp> inside <div class="lyricsContainer">
            let lyricsMatch = res2.data.match(/<xmp[^>]*>([\s\S]*?)<\/xmp>/i);
            if (lyricsMatch && lyricsMatch[1]) {
                const lyricsText = lyricsMatch[1].trim();
                console.log('Lyrics snippet:', lyricsText.substring(0, 100));
            } else {
                console.log('No lyrics <xmp> tag found on Bugs.');
            }
        } else {
            console.log('No track found on Bugs.');
        }
    } catch(err) {
        console.error('Error:', err.message);
    }
}
test();
