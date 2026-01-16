/**
 * Material calculation utility
 * Calculates material difference between two positions
 */

const PIECE_VALUES = {
  'p': 1,   // Pawn
  'n': 3,   // Knight
  'b': 3,   // Bishop
  'r': 5,   // Rook
  'q': 9,   // Queen
  'k': 0    // King (not counted in material)
}

/**
 * Calculate material value for a position
 * @param {Object} chess - Chess.js instance
 * @param {string} color - 'w' or 'b'
 * @returns {number} - Total material value
 */
export function calculateMaterial(chess, color) {
  const board = chess.board()
  let material = 0

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col]
      if (piece && piece.color === color) {
        const pieceType = piece.type.toLowerCase()
        material += PIECE_VALUES[pieceType] || 0
      }
    }
  }

  return material
}

/**
 * Calculate material difference between two positions
 * @param {Object} chessBefore - Chess.js instance before move
 * @param {Object} chessAfter - Chess.js instance after move
 * @param {string} color - 'w' or 'b' - the color of the player making the move
 * @returns {number} - Material lost (positive = lost material, negative = gained material)
 */
export function calculateMaterialLoss(chessBefore, chessAfter, color) {
  const materialBefore = calculateMaterial(chessBefore, color)
  const materialAfter = calculateMaterial(chessAfter, color)
  
  // Positive value means material was lost
  return materialBefore - materialAfter
}
