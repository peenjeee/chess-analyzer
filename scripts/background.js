// Opens the offscreen document that runs Fairy-Stockfish (engine/offscreen.js)
// when a content script asks; it stays open for later games.
let opening = null;

async function openEngine() {
    if (await chrome.offscreen.hasDocument()) return;
    await chrome.offscreen.createDocument({
        url: 'engine/offscreen.html',
        reasons: ['WORKERS'],
        justification: 'Runs the multi-threaded variant engine for pages that cannot run threads'
    });
}

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
    if (msg !== 'open-engine') return;
    opening ??= openEngine().finally(() => { opening = null; });
    opening.then(() => reply(true), () => reply(false));
    return true;
});
