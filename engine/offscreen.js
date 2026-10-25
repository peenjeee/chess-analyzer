// Runs Fairy-Stockfish for content scripts on pages that cannot run threads
// (chess.com is not cross-origin isolated; this document is, through the
// manifest's COOP and COEP). One engine per port, ended when the port closes.
const NNUE_URL = 'https://lichess1.org/assets/lifat/nnue/';
// Networks for variants lichess does not play come from the Google Drive folder
// the Fairy-Stockfish project shares them in (fairy-stockfish.github.io/nnue).
// Drive sends browsers no CORS headers, so the manifest's host permission is
// what lets this page read them. One that cannot be had leaves the engine on
// its own evaluation.
const DRIVE = {
    'torpedo-25da2c94c6cb': '1GQHE3efeHFeu8OqQw98v6md17P_aOXpO',
    'pawnsideways-68b37e5c25b0': '1AvP9VBjZbU02AEcOCqeAy3hJ-Ye3jCt3',
    'petrified-fa7e5810f172': '1AQvihbxa30tQmUxX_0DDWci7AzoAyeja',
    'seirawan-432c65fe71fc': '1vZfLrkKdO1Sdo__jRPpuvrvvQD_mYsZX',
    'chaturanga-1889e98f8d54': '1kqqsa-sY-Azrqe0pFMPNPN2ztIYpg0OA'
};
let urlOf = name => DRIVE[name]
    ? 'https://drive.usercontent.google.com/download?export=download&confirm=t&id=' + DRIVE[name]
    : NNUE_URL + name + '.nnue';

async function sha256(bytes) {
    let digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// A variant's network: fetched once, checked against the hash in its name, then
// cached. Storage that fails (a full disk, a broken profile) only costs the cache.
async function loadNnue(name) {
    let url = urlOf(name);
    let cache = await caches.open('nnue').catch(() => null);
    let hit = await cache?.match(url).catch(() => null);
    if (hit) return hit.arrayBuffer();
    // kept in the cache below, so not in the browser's HTTP cache as well
    let res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    let bytes = await res.arrayBuffer();
    if (!(await sha256(bytes)).startsWith(name.split('-').pop())) {
        throw new Error('network ' + name + ' does not match its name');
    }
    await cache?.put(url, new Response(bytes)).catch(() => { });
    return bytes;
}

chrome.runtime.onConnect.addListener(port => {
    if (port.name !== 'fsf') return;
    let worker = null, open = true;
    let close = () => {
        worker?.terminate();
        if (open) port.disconnect();
        open = false;
    };
    port.onDisconnect.addListener(() => {
        open = false;
        worker?.terminate();
    });
    // the first message names the variant and its network (null: none), the rest are UCI lines
    port.onMessage.addListener(msg => {
        if (worker) return typeof msg === 'string' ? worker.postMessage(msg) : close();
        let { variant, nnue } = msg || {};
        if (!/^\w+$/.test(variant) || (nnue !== null && !/^\w+-[0-9a-f]{12}$/.test(nnue))) return close();
        worker = new Worker('fsf-worker.js', { type: 'module' });
        worker.onmessage = e => open && port.postMessage(e.data);
        worker.onerror = close;
        let network = !nnue ? Promise.resolve(null) : DRIVE[nnue] ? loadNnue(nnue).catch(() => null) : loadNnue(nnue);
        network.then(bytes => worker.postMessage({ variant, nnue: bytes }, bytes ? [bytes] : []), close);
    });
});
