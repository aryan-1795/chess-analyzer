/**
 * Move classification utility
 * Classifies moves based on evaluation loss using chess.com-style thresholds
 */

/**
 * Classify a move based on evaluation loss
 * @param {number} evalLoss - The absolute evaluation loss (in pawns)
 * @param {boolean} isMate - Whether the evaluation involves mate
 * @returns {string} - Classification: 'Best', 'Excellent', 'Good', 'Inaccuracy', 'Mistake', 'Blunder'
 */
export function classifyMove(evalLoss, isMate = false) {
  // Handle mate scores - if there's a mate, it's usually a blunder or best move
  if (isMate) {
    // If evalLoss is very small with mate, it might be the best move
    if (evalLoss <= 0.2) {
      return 'Best'
    }
    // Large mate changes are blunders
    return 'Blunder'
  }

  // Standard classification thresholds (in pawns)
  if (evalLoss <= 0.2) {
    return 'Best'
  } else if (evalLoss <= 0.7) {
    return 'Good'
  } else if (evalLoss <= 1.5) {
    return 'Inaccuracy'
  } else if (evalLoss <= 3.0) {
    return 'Mistake'
  } else {
    return 'Blunder'
  }
}

/**
 * Calculate evaluation loss between two positions
 * @param {Object} evalBefore - Evaluation before move { type: 'cp'|'mate', value: number, centipawns: number }
 * @param {Object} evalAfter - Evaluation after move { type: 'cp'|'mate', value: number, centipawns: number }
 * @param {string} color - 'w' or 'b' - the color of the player making the move
 * @returns {number} - Evaluation loss in pawns
 */
export function calculateEvalLoss(evalBefore, evalAfter, color) {
  if (!evalBefore || !evalAfter) {
    return { evalLoss: 0, isMate: false }
  }

  // Get centipawn values (normalized for comparison)
  let beforeCp = evalBefore.centipawns || 0
  let afterCp = evalAfter.centipawns || 0

  // If either is a mate, use special handling
  const isMate = evalBefore.type === 'mate' || evalAfter.type === 'mate'

  // For black moves, flip the evaluation perspective
  if (color === 'b') {
    beforeCp = -beforeCp
    afterCp = -afterCp
  }

  // Calculate loss: positive means position got worse for the player
  // We want the absolute difference to measure how much the position changed
  const evalLoss = Math.abs(beforeCp - afterCp) / 100 // Convert to pawns

  return { evalLoss, isMate }
}

/**
 * Generate explanation for a non-best move
 * @param {Object} moveData - Move data with evaluation info
 * @param {string} bestMove - Best move suggested by engine
 * @param {number} evalLoss - Evaluation loss in pawns
 * @param {string} classification - Move classification
 * @returns {string} - Human-readable explanation
 */
export function generateMoveExplanation(moveData, bestMove, evalLoss, classification) {
  if (classification === 'Best' || classification === 'Excellent') {
    return 'This is the best move according to the engine.'
  }

  const explanations = []

  // Material loss
  if (evalLoss > 3.0) {
    explanations.push('This move loses significant material')
  } else if (evalLoss > 1.5) {
    explanations.push('This move loses material')
  }

  // Tactical opportunities
  if (evalLoss > 1.5 && evalLoss <= 3.0) {
    explanations.push('This move misses a tactical opportunity')
  } else if (evalLoss > 0.7 && evalLoss <= 1.5) {
    explanations.push('This move misses a better continuation')
  }

  // Positional issues
  if (evalLoss > 1.0 && evalLoss <= 2.0) {
    explanations.push('This move weakens the position')
  }

  // King safety
  if (evalLoss > 2.0) {
    explanations.push('This move compromises king safety')
  }

  // Default explanation
  if (explanations.length === 0) {
    if (bestMove) {
      explanations.push(`Better is ${bestMove}`)
    } else {
      explanations.push('This move is not optimal')
    }
  }

  // Combine explanations
  let explanation = explanations.join(' and ')
  
  if (bestMove && explanation.indexOf(bestMove) === -1) {
    explanation += `. Best move: ${bestMove}`
  }

  return explanation
}
