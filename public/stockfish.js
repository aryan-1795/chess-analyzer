// Stockfish.js Web Worker
// This is a placeholder - in production, you should use the actual Stockfish.js library
// 
// To get the real Stockfish.js:
// 1. Download from: https://github.com/niklasf/stockfish.js
// 2. Or use: npm install stockfish.js and copy the file
// 3. Or the app will attempt to use CDN fallback: https://cdn.jsdelivr.net/npm/stockfish.js@10/stockfish.js
//
// For now, this is a minimal mock implementation for development

let currentPosition = null;
let analysisDepth = 0;

self.onmessage = function(e) {
  const message = e.data;
  
  if (message === 'uci') {
    self.postMessage('id name Stockfish.js Mock');
    self.postMessage('id author Mock Engine');
    self.postMessage('uciok');
  } else if (message === 'isready') {
    self.postMessage('readyok');
  } else if (message.startsWith('position')) {
    // Parse position command: "position fen <fen>" or "position startpos moves ..."
    const parts = message.split(' ');
    if (parts[1] === 'fen') {
      currentPosition = parts.slice(2).join(' ');
    } else if (parts[1] === 'startpos') {
      currentPosition = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    }
  } else if (message.startsWith('go')) {
    // Parse go command
    const depthMatch = message.match(/depth (\d+)/);
    analysisDepth = depthMatch ? parseInt(depthMatch[1]) : 15;
    
    // Simulate analysis with mock evaluation
    // In real Stockfish, this would be actual engine analysis
    setTimeout(() => {
      if (currentPosition) {
        // Generate a somewhat realistic mock evaluation
        // This is just for development - real Stockfish will provide actual analysis
        const mockEval = (Math.random() - 0.5) * 3; // Random eval between -1.5 and +1.5
        const cp = Math.round(mockEval * 100);
        const nodes = Math.floor(Math.random() * 1000000) + 500000;
        const time = Math.floor(Math.random() * 2000) + 500;
        
        self.postMessage(`info depth ${analysisDepth} score cp ${cp} nodes ${nodes} time ${time}`);
      }
      self.postMessage('bestmove e2e4');
    }, 300);
  } else if (message.startsWith('setoption')) {
    // Handle options silently
    // Real Stockfish would process these
  } else if (message === 'quit') {
    self.close();
  }
};
