/**
 * Accuracy calculation utility
 * Calculates game accuracy based on evaluation loss per move
 */

/**
 * Calculate accuracy for a player based on their moves
 * @param {Array} moves - Array of move review data
 * @param {string} color - 'w' or 'b'
 * @returns {number} - Accuracy percentage (0-100)
 */
export function calculateAccuracy(moves, color) {
  const playerMoves = moves.filter(move => move.color === color)
  
  if (playerMoves.length === 0) {
    return 100 // Default to perfect if no moves
  }

  // Calculate average evaluation loss
  let totalLoss = 0
  let moveCount = 0

  playerMoves.forEach(move => {
    if (move.evalLoss !== undefined && move.evalLoss !== null) {
      totalLoss += move.evalLoss
      moveCount++
    }
  })

  if (moveCount === 0) {
    return 100
  }

  const averageLoss = totalLoss / moveCount

  // Convert average loss to accuracy percentage
  // Lower loss = higher accuracy
  // Formula: accuracy = max(0, 100 - (averageLoss * 20))
  // This maps: 0 loss = 100%, 5 pawns loss = 0%
  const accuracy = Math.max(0, Math.min(100, 100 - (averageLoss * 20)))

  return Math.round(accuracy)
}

/**
 * Count classification types for a player
 * @param {Array} moves - Array of move review data
 * @param {string} color - 'w' or 'b'
 * @returns {Object} - Counts of each classification type
 */
export function countClassifications(moves, color) {
  const playerMoves = moves.filter(move => move.color === color)
  
  const counts = {
    best: 0,
    excellent: 0,
    good: 0,
    inaccuracy: 0,
    mistake: 0,
    blunder: 0
  }

  playerMoves.forEach(move => {
    const classification = move.classification?.toLowerCase() || 'good'
    if (counts.hasOwnProperty(classification)) {
      counts[classification]++
    }
  })

  return counts
}

/**
 * Generate game summary
 * @param {Array} moves - Array of move review data
 * @returns {Object} - Game summary with accuracy, counts, and key moments
 */
export function generateGameSummary(moves) {
  const whiteAccuracy = calculateAccuracy(moves, 'w')
  const blackAccuracy = calculateAccuracy(moves, 'b')

  const whiteCounts = countClassifications(moves, 'w')
  const blackCounts = countClassifications(moves, 'b')

  const totalBlunders = whiteCounts.blunder + blackCounts.blunder
  const totalMistakes = whiteCounts.mistake + blackCounts.mistake
  const totalInaccuracies = whiteCounts.inaccuracy + blackCounts.inaccuracy

  // Find key moments (largest evaluation swings)
  const keyMoments = moves
    .map((move, index) => ({
      moveIndex: index,
      move: move.move,
      evalLoss: move.evalLoss || 0,
      classification: move.classification
    }))
    .filter(m => m.evalLoss > 1.5) // Only significant swings
    .sort((a, b) => b.evalLoss - a.evalLoss)
    .slice(0, 5) // Top 5 key moments

  return {
    whiteAccuracy,
    blackAccuracy,
    blunders: totalBlunders,
    mistakes: totalMistakes,
    inaccuracies: totalInaccuracies,
    keyMoments,
    whiteCounts,
    blackCounts
  }
}
