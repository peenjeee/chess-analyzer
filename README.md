# Chess Analyzer

![Preview](image.png)
![Demo](video.gif)
A lightweight, minimalist browser extension for real-time chess analysis.

> **Note:** A userscript version of this tool is also available in the [chess-userscript](https://github.com/peenjeee/chess-userscript) repository.

## Features

- Sites: Works on **chess.com**, **lichess.org**, and **endgame.ai**.
- Engine: Full-strength Stockfish 18 NNUE (~113MB, downloaded once and cached), with chess.com's built-in engine as a fallback. On lichess, suggestions come instantly from the lichess cloud evaluation (depth 60+), with the local engine as a fallback.
- Lichess variants: King of the Hill, Three-Check, Antichess, Atomic, Horde, Racing Kings and Crazyhouse are analyzed by multi-variant Stockfish 10 ([lichess-org/stockfish.js](https://github.com/lichess-org/stockfish.js), GPLv3, ~0.6MB from jsDelivr, version-pinned and hash-checked). Crazyhouse pockets and three-check counters are read from the page; a suggested drop shows as a ringed square with the piece letter. Variant games are not relayed, since the web app analyzes standard chess only.
- Chess960 (all three sites): the engine runs in Chess960 mode, with castling rights taken from the game's start position (looked up once per game from the site's own game API). A suggested castle is drawn to the king's landing square, or as the rook's move when the king already stands there.
- Fast Parsing: Extracts FEN from the DOM instantly (piece classes on chess.com, piece transforms on lichess, square cells on endgame.ai).
- SecretQueen (endgame.ai): hidden queens (own square + revealed pieces from API/DOM badges) analyzed as queens. Features Secret Queen Threat Overlay (dashed danger lines & target beacons from all living opponent pawns) and auto-detection toast alerts when opponent pawns or their Secret Queen are captured. Both appear only once endgame.ai's API confirms the game is Secret Queen.
- Visual Overlays: Draws SVG arrows (Blue, Green, Red) to indicate top moves. Knights use L-shaped paths.
- Turn Detection: Automatically reads the current turn and board orientation.
- Pondering: Displays anticipated opponent replies via dashed lines.
- Live Relay: Press **Ctrl+Shift+C** or **Ctrl+Shift+X** to copy your **Relay ID** — enter it in the [Chess Analyzer web app](https://chess.0xpnj.dev) (**Live** tab → **Session ID**) to mirror your game with engine suggestions on another device, with a full Game Review when it ends. No persistent relay UI.
- Hotkeys: Show/hide the move suggestions with the 'A' key (starts/stops the analyzer), and hide or show the Analyze button with the 'Insert' key.

> `scripts/main.js` is generated from `userscript.js` in the [chess-userscript](https://github.com/peenjeee/chess-userscript) repository — edit it there.

## Installation

### 1. Clone the Repository
Open your terminal and clone the repository using Git:
```bash
git clone https://github.com/peenjeee/chess-analyzer.git
```

### 2. Load into Browser
1. Open your browser's extensions page (`edge://extensions/` or `chrome://extensions/`).
2. Enable "Developer Mode".
3. Click "Load unpacked" and select the extension directory.
4. The extension is now ready to use on supported pages.

## Usage

1. Open a chess game.
2. Press 'A' on your keyboard to toggle the analyzer overlay.
3. Follow the arrow guides on the board.
4. Press 'Insert' to hide or show the analyzer button (the 'A' hotkey keeps working while it is hidden).

## Troubleshooting

- **Analyzer is stuck or arrows don't appear:** If the engine stops responding or the arrows freeze, simply press the **'A'** key twice (to turn it off and on again). This will instantly reset the engine memory and resync it with the current board position.
- **"Engine unavailable":** the engine failed to load or crashed more than three times in a row (it restarts by itself before that — usually an interrupted 113MB download). Press **'A'** twice to retry from scratch. In a lichess variant game it can also mean cdn.jsdelivr.net is blocked on your network.
