(function() {
    'use strict';

    // Disable Chessground's isTrusted restriction so synthetic clicks/drags are accepted
    try {
        const origDefine = Object.defineProperty;
        Object.defineProperty = function(obj, prop, descriptor) {
            if (prop === 'trustAllEvents' && descriptor) {
                if ('value' in descriptor) descriptor.value = true;
            }
            return origDefine.apply(this, arguments);
        };
        origDefine(Object.prototype, 'trustAllEvents', {
            get() { return true; },
            set(v) {},
            configurable: true
        });
    } catch (e) {}

    // Hook WebSocket on Lichess and other platforms to capture active game sockets
    let lichessSocket = null;
    const OrigWS = window.WebSocket;
    window.WebSocket = function(url, protocols) {
        const ws = protocols !== undefined ? new OrigWS(url, protocols) : new OrigWS(url);
        const urlStr = String(url || '');
        if (urlStr.includes('lichess') || urlStr.includes('/play/') || urlStr.includes('/round/') || urlStr.includes('/watch/')) {
            lichessSocket = ws;
            window.__saLichessWS = ws;
            console.log('%c[SA-Lichess] Hooked WebSocket:', 'color:#3b82f6;font-weight:bold;', urlStr);
        }
        return ws;
    };
    window.WebSocket.prototype = OrigWS.prototype;

    function isCastlingMatch(m, from, to) {
        if (!m) return false;
        if (m.from === from && m.to === to) return true;
        // Chess960 castling compatibility (king to rook vs king to g/c file)
        const isKingMove = from === 'e1' || from === 'e8' || m.piece === 'k';
        const isCastleSan = m.san === 'O-O' || m.san === 'O-O-O';
        const isCastleTarget = ['g1', 'c1', 'g8', 'c8', 'h1', 'a1', 'h8', 'a8'].includes(to);
        if (isKingMove && isCastleSan && isCastleTarget) {
            return true;
        }
        return false;
    }

    function isDropMatch(m, from, to) {
        if (!m || !from.includes('@')) return false;
        const dropRole = from[0].toLowerCase();
        return (m.dropPiece && m.dropPiece.toLowerCase() === dropRole && m.to === to) ||
               (m.from && m.from.toLowerCase() === (dropRole + '@') && m.to === to);
    }

    function makeChessComMove(from, to, promo, duckTo) {
        const board = document.querySelector('wc-chess-board') || document.querySelector('chess-board');
        if (!board) return false;
        const game = board.game || board._game;
        if (!game) return false;

        // Strategy 1: board.game.getLegalMoves() + board.game.move()
        if (typeof game.getLegalMoves === 'function' && typeof game.move === 'function') {
            try {
                const legal = game.getLegalMoves();
                for (let i = 0; i < legal.length; i++) {
                    const m = legal[i];
                    if (isCastlingMatch(m, from, to) || isDropMatch(m, from, to)) {
                        const moveObj = Object.assign({}, m, { animate: true, userGenerated: true });
                        if (m.promotion || promo) {
                            moveObj.promotion = (promo || 'q').toLowerCase();
                        }
                        if (duckTo) {
                            moveObj.duck = duckTo;
                        }
                        game.move(moveObj);
                        return true;
                    }
                }
            } catch (err) {
                console.warn('[SA Bridge] game.move failed:', err);
            }
        }

        // Strategy 2: board.game.userMove()
        if (typeof game.userMove === 'function') {
            try {
                const res = game.userMove(from, to, promo ? promo.toLowerCase() : undefined);
                if (res) return true;
            } catch (e) {}
            try {
                const res = game.userMove({ from, to, promotion: promo ? promo.toLowerCase() : undefined });
                if (res) return true;
            } catch (e) {}
        }

        // Strategy 3: board.game.move() direct
        if (typeof game.move === 'function') {
            try {
                game.move({ from, to, promotion: promo ? promo.toLowerCase() : undefined, animate: true, userGenerated: true });
                return true;
            } catch (e) {}
        }

        return false;
    }

    function makeLichessMove(from, to, promo, explicitUci) {
        const uci = explicitUci || (from.includes('@') ? (from[0].toUpperCase() + '@' + to) : (from + to + (promo ? promo.toLowerCase() : '')));
        console.log('[SA-Lichess] Attempting move:', uci);

        const isDrop = uci.includes('@') || from.includes('@');
        const isPuzzle = /^\/(training|streak|storm|racer)\b/.test(location.pathname) ||
                         !!document.querySelector('main.puzzle, .puzzle__board, [class*="puzzle"], .streak, .storm, .racer') ||
                         !!window.lichess?.puzzle;

        // In Puzzles / Training / Streak / Storm / Racer:
        if (isPuzzle) {
            // Strategy 1: Official Lichess Puzzle Public API
            try {
                if (window.lichess?.puzzle?.playUci && typeof window.lichess.puzzle.playUci === 'function') {
                    window.lichess.puzzle.playUci(uci);
                    console.log('[SA-Lichess] Move executed via lichess.puzzle.playUci:', uci);
                    return true;
                }
            } catch (e) {}

            // Strategy 2: Analysis Board API
            try {
                if (window.lichess?.analysis?.playUci && typeof window.lichess.analysis.playUci === 'function') {
                    window.lichess.analysis.playUci(uci);
                    console.log('[SA-Lichess] Move executed via lichess.analysis.playUci:', uci);
                    return true;
                }
            } catch (e) {}

            // Strategy 3: Chessground userMove
            if (!isDrop) {
                try {
                    const cg = window.lichess?.chessground || window.lichess?.round?.chessground || window.lichess?.analysis?.chessground;
                    if (cg) {
                        if (typeof cg.userMove === 'function') {
                            cg.userMove(from, to);
                            console.log('[SA-Lichess] Move executed via lichess.chessground.userMove:', from, to);
                            return true;
                        }
                        if (typeof cg.move === 'function') {
                            cg.move(from, to);
                            console.log('[SA-Lichess] Move executed via lichess.chessground.move:', from, to);
                            return true;
                        }
                    }
                } catch (e) {}
            }
            return false;
        }

        // Live Online Match (Standard, Crazyhouse drops, Blitz, Bullet)
        try {
            if (window.lichess?.socket?.send && typeof window.lichess.socket.send === 'function') {
                window.lichess.socket.send('move', { u: uci, b: 1 });
                console.log('[SA-Lichess] Move sent via lichess.socket.send:', uci);
                return true;
            }
        } catch (e) {}

        const ws = window.__saLichessWS || lichessSocket;
        if (ws && ws.readyState === 1) {
            try {
                const payload = JSON.stringify({ t: 'move', d: { u: uci, b: 1 } });
                ws.send(payload);
                console.log('[SA-Lichess] Move sent via WebSocket:', payload);
                return true;
            } catch (err) {
                console.error('[SA-Lichess] WebSocket send error:', err);
            }
        }

        try {
            if (window.site?.socket?.send && typeof window.site.socket.send === 'function') {
                window.site.socket.send('move', { u: uci, b: 1 });
                console.log('[SA-Lichess] Move sent via site.socket.send:', uci);
                return true;
            }
        } catch (e) {}

        // Fallback: Chessground userMove for offline/bot games
        if (!isDrop) {
            try {
                const cg = window.lichess?.chessground || window.lichess?.round?.chessground || window.lichess?.analysis?.chessground;
                if (cg) {
                    if (typeof cg.userMove === 'function') {
                        cg.userMove(from, to);
                        console.log('[SA-Lichess] Move executed via lichess.chessground.userMove:', from, to);
                        return true;
                    }
                    if (typeof cg.move === 'function') {
                        cg.move(from, to);
                        console.log('[SA-Lichess] Move executed via lichess.chessground.move:', from, to);
                        return true;
                    }
                }
            } catch (e) {}
        }

        return false;
    }

    function tryPageBridgePromotion(promo) {
        const p = (promo || 'q').toLowerCase();
        try {
            const board = document.querySelector('wc-chess-board') || document.querySelector('chess-board');
            if (board && board.game) {
                const g = board.game;
                if (typeof g.promote === 'function') { g.promote(p); return true; }
                if (typeof g.onPromotionPiece === 'function') { g.onPromotionPiece(p); return true; }
                if (typeof g.selectPromotionPiece === 'function') { g.selectPromotionPiece(p); return true; }
                if (typeof g.setPromotionPiece === 'function') { g.setPromotionPiece(p); return true; }
                if (typeof g.resolvePromotion === 'function') { g.resolvePromotion(p); return true; }
                for (const k in g) {
                    if (typeof g[k] === 'function' && /promo/i.test(k)) {
                        try { g[k](p); return true; } catch (err) {}
                    }
                }
            }
        } catch (e) {}
        return false;
    }

    window.addEventListener('sa-page-promote', function(e) {
        const promo = e.detail?.promo || 'q';
        tryPageBridgePromotion(promo);
    });

    window.addEventListener('sa-page-move', function(e) {
        const detail = e.detail || {};
        const { from, to, promo, duckTo, uci } = detail;
        if (!from || !to) return;

        let ok = false;
        if (location.hostname.includes('lichess')) {
            ok = makeLichessMove(from, to, promo, uci);
        } else {
            ok = makeChessComMove(from, to, promo, duckTo);
        }
        window.dispatchEvent(new CustomEvent('sa-page-move-ack', { detail: { ok, from, to } }));
    });
})();
