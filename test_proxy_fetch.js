async function test() {
    const targetUrl = 'https://serpapi.com/search.json?engine=google&q=test&api_key=5ccbc1d3c6ce67532f9af5aa10137362b8934bab2f3dcc4c533b61551ced6174';
    const url = `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(targetUrl)}`;
    
    try {
        console.log('Fetching', url);
        const res = await fetch(url);
        console.log('Status', res.status);
        const data = await res.json();
        console.log('Success!', Object.keys(data).length > 0);
    } catch(e) {
        console.error('ERROR:', e.message);
    }
}
test();
