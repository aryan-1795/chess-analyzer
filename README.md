# Chess.com Game Analyzer

A React application that fetches Chess.com games and analyzes them using Stockfish engine.

## Features

- Fetch recent games from Chess.com API
- Interactive chess board with move navigation
- Real-time position evaluation using Stockfish
- Visual evaluation bar showing position advantage
- Move classification (Blunder/Mistake/Good) based on evaluation drops
- Move history with clickable moves
- Beautiful, modern UI with Tailwind CSS

## Setup

1. Install dependencies:
```bash
npm install
```

2. Download Stockfish.js:
   - **Option 1 (Recommended)**: Download from https://github.com/niklasf/stockfish.js and place `stockfish.js` in the `public` folder
   - **Option 2**: The app will attempt to use a CDN fallback automatically
   - **Option 3**: Use the mock version in `public/stockfish.js` for development (limited functionality)

3. Run the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:3000`

## Usage

1. Enter a Chess.com username in the input field
2. Click "Fetch Games" to load the last 5 games from the most recent month
3. Click on a game card to load it onto the board
4. Use Prev/Next buttons or click moves in the move list to navigate through the game
5. The evaluation bar on the left shows the current position's evaluation
6. Moves are color-coded:
   - **Red border**: Blunder (evaluation drop > 2.0)
   - **Orange border**: Mistake (evaluation drop > 1.0)
   - **Normal**: Good move

## Tech Stack

- **React** (Vite) - UI framework
- **Tailwind CSS** - Styling
- **chess.js** - Chess game logic and PGN parsing
- **react-chessboard** - Chess board UI component
- **Stockfish.js** - Chess engine for position analysis (Web Worker)

## Project Structure

```
chess-analyzer/
├── public/
│   └── stockfish.js          # Stockfish Web Worker (download real version)
├── src/
│   ├── components/
│   │   ├── EvaluationBar.jsx # Evaluation visualization
│   │   ├── GameInfo.jsx      # Game metadata display
│   │   └── MoveList.jsx      # Move history with classification
│   ├── hooks/
│   │   └── useStockfish.js   # Stockfish Web Worker hook
│   ├── App.jsx               # Main application component
│   ├── main.jsx              # React entry point
│   └── index.css             # Tailwind CSS imports
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## API Usage

The app uses the Chess.com Public API:
- Archives: `https://api.chess.com/pub/player/{username}/games/archives`
- Games: `https://api.chess.com/pub/player/{username}/games/{YYYY}/{MM}`

## Move Classification Logic

Moves are classified by comparing the evaluation before and after the move:
- **Blunder**: Evaluation drops by more than 2.0 (200 centipawns)
- **Mistake**: Evaluation drops by more than 1.0 (100 centipawns)
- **Good**: Evaluation drop is 1.0 or less

The evaluation is adjusted for the moving player's perspective (flipped for Black).

## Notes

- The app requires a valid Chess.com username
- Stockfish analysis may take a few seconds per position
- Evaluations are cached to avoid re-analyzing the same position
- The mock Stockfish in `public/stockfish.js` provides random evaluations for development

## License

MIT
