// One Fairy-Stockfish 14 (fsf_14.js and fsf_14.wasm, from
// @lichess-org/stockfish-web 0.5.0, AGPLv3; Fairy-Stockfish is GPLv3).
// UCI lines wait until the variant's network arrives; a failed start is
// thrown from a timer so it reaches the worker's onerror.
import Fsf_14_Web from './fsf_14.js';

let queue = [], sf = null;

onmessage = async e => {
    if (typeof e.data === 'string') return queue ? queue.push(e.data) : sf.uci(e.data);
    try {
        sf = await Fsf_14_Web();
        sf.listen = line => postMessage(line);
        sf.onError = line => postMessage('info string ' + line);
        sf.uci('setoption name UCI_Variant value ' + e.data.variant);
        sf.setNnueBuffer(new Uint8Array(e.data.nnue), 0);
        queue.forEach(c => sf.uci(c));
        queue = null;
    } catch (err) {
        setTimeout(() => { throw err; });
    }
};
