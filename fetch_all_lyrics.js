import { base44 } from './src/api/base44Client.js';
import axios from 'axios';
import * as cheerio from 'cheerio';

async function getLyrics(artist, title) {
    try {
        const query = encodeURIComponent(`${artist} ${title}`);
        const searchUrl = `https://genius.com/api/search/multi?per_page=1&q=${query}`;
        const searchRes = await axios.get(searchUrl);
        
        let url = null;
        for (let section of searchRes.data.response.sections) {
            if (section.hits && section.hits.length > 0) {
                let hit = section.hits[0].result;
                if(hit && hit.url && hit.url.includes('genius.com')) {
                    url = hit.url;
                    break;
                }
            }
        }
        
        if (!url) return null;

        const pageRes = await axios.get(url);
        const $ = cheerio.load(pageRes.data);
        
        $('[data-lyrics-container="true"]').find('br').replaceWith('\n');
        
        let lyrics = '';
        $('[data-lyrics-container="true"]').each((i, el) => {
            lyrics += $(el).text() + '\n\n';
        });

        lyrics = lyrics.trim();
        // Remove the "number Contributors ... Lyrics" heading
        lyrics = lyrics.replace(/^[0-9]*\s*Contributors.*Lyrics/, '');
        // Remove trailing Embed at the end
        lyrics = lyrics.replace(/[0-9]*Embed$/, '');
        
        return lyrics.trim() || null;
    } catch (err) {
        return null;
    }
}

async function main() {
    const songs = await base44.entities.Song.list();
    const missing = songs.filter(s => !s.lyrics || s.lyrics.trim() === '');
    console.log(`Starting to fetch lyrics for ${missing.length} songs...`);
    
    let updatedCount = 0;
    
    // Process in batches of 5 to not hammer the server too hard but still be fast
    for (let i = 0; i < missing.length; i += 5) {
        const batch = missing.slice(i, i + 5);
        await Promise.all(batch.map(async (song) => {
            const cleanTitle = song.title.replace(/\(.*\)/g, '').trim(); // Remove brackets like (Live)
            const cleanArtist = song.artist.replace(/\(.*\)/g, '').trim();
            const fetched = await getLyrics(cleanArtist, cleanTitle);
            
            if (fetched) {
                try {
                    await base44.entities.Song.update(song.id, { lyrics: fetched });
                    console.log(`✅ [${updatedCount+1}/${missing.length}] Updated: ${song.title} (${song.artist})`);
                    updatedCount++;
                } catch(e) {
                    console.log(`❌ Failed DB update: ${song.title}`);
                }
            } else {
                console.log(`⚠️ Not found on Genius: ${song.title} (${song.artist})`);
            }
        }));
    }
    
    console.log(`\nFinished! Successfully added lyrics for ${updatedCount} out of ${missing.length} missing songs.`);
}

main().catch(console.error);
