# Chess Analyzer

![Preview](image.png)
A lightweight, minimalist browser extension for real-time chess analysis.

## Features

- Engine: Utilizes stockfish.asm.1abfa10c.js (NNUE enabled, depth 50).
- Fast Parsing: Extracts FEN from the DOM instantly using regex.
- Visual Overlays: Draws SVG arrows (Blue, Green, Red) to indicate top moves. Knights use L-shaped paths.
- Turn Detection: Automatically reads the current turn and board orientation.
- Pondering: Displays anticipated opponent replies via dashed lines.
- Hotkey: Toggle the analyzer on and off by pressing the 'A' key.

## Installation

1. Open your browser's extensions page (edge://extensions/ or chrome://extensions/).
2. Enable "Developer Mode".
3. Click "Load unpacked" and select the extension directory.
4. The extension is now ready to use on supported pages.

## Usage

1. Open a chess game.
2. Press 'A' on your keyboard to toggle the analyzer overlay.
3. Follow the arrow guides on the board.

## Troubleshooting

- **Analyzer is stuck or arrows don't appear:** If the engine stops responding or the arrows freeze, simply press the **'A'** key twice (to turn it off and on again). This will instantly reset the engine memory and resync it with the current board position.
