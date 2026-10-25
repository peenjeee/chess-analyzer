// Runs Fairy-Stockfish for content scripts on pages that cannot run threads
// (chess.com is not cross-origin isolated; this document is, through the
// manifest's COOP and COEP). One engine per port, ended when the port closes.
const NNUE_URL = 'https://lichess1.org/assets/lifat/nnue/';

async function sha256(bytes) {
    let digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// A variant's network: fetched once, checked against the hash in its name, then
// cached. Storage that fails (a full disk, a broken profile) only costs the cache.
async function loadNnue(name) {
    let url = NNUE_URL + name + '.nnue';
    let cache = await caches.open('nnue').catch(() => null);
    let hit = await cache?.match(url).catch(() => null);
    if (hit) return hit.arrayBuffer();
    let res = await fetch(url);
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
    // the first message names the variant and its network, the rest are UCI lines
    port.onMessage.addListener(msg => {
        if (worker) return typeof msg === 'string' ? worker.postMessage(msg) : close();
        let { variant, nnue } = msg || {};
        if (!/^\w+$/.test(variant) || !/^\w+-[0-9a-f]{12}$/.test(nnue)) return close();
        worker = new Worker('fsf-worker.js', { type: 'module' });
        worker.onmessage = e => open && port.postMessage(e.data);
        worker.onerror = close;
        loadNnue(nnue).then(bytes => worker.postMessage({ variant, nnue: bytes }, [bytes]), close);
    });
});
