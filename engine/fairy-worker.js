// One Fairy-Stockfish from the project's own build (fairy-stockfish/, from
// fairy-stockfish-nnue.wasm 1.1.12, GPLv3) for variants the lichess build
// lacks. It speaks like fsf-worker.js: the variant and its network first,
// then UCI lines. The network goes in through the engine's file system.
importScripts('fairy-stockfish/stockfish.js');

let queue = [], sf = null;

onmessage = async e => {
    if (typeof e.data === 'string') return queue ? queue.push(e.data) : sf.postMessage(e.data);
    try {
        sf = await Stockfish({
            locateFile: file => 'fairy-stockfish/' + file,
            mainScriptUrlOrBlob: new URL('fairy-stockfish/stockfish.js', location.href).href
        });
        sf.addMessageListener(line => {
            postMessage(line);
            // a search thread that crashed only says so here; ending this worker lets the analyzer restart it
            if (line.startsWith('pthread sent an error')) setTimeout(() => { throw new Error(line); });
        });
        sf.postMessage('setoption name UCI_Variant value ' + e.data.variant);
        // it only uses a network whose file name starts with the variant's
        if (e.data.nnue) {
            sf.FS.writeFile('/' + e.data.variant + '.nnue', new Uint8Array(e.data.nnue));
            sf.postMessage('setoption name EvalFile value /' + e.data.variant + '.nnue');
        }
        queue.forEach(c => sf.postMessage(c));
        queue = null;
    } catch (err) {
        setTimeout(() => { throw err; });
    }
};
