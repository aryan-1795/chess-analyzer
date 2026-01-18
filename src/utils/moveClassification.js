/**
 * Move classification utility
 * Classifies moves based on evaluation loss using chess.com-style thresholds
 */

/**
 * Classify a move based on evaluation loss (SIDE-AWARE)
 * @param {number} evalLoss - The evaluation loss (in pawns) - already side-aware
 * @param {boolean} isMate - Whether the evaluation involves mate
 * @param {boolean} lostMate - Whether mate was lost
 * @param {number} materialLoss - Material lost (positive = lost, negative = gained)
 * @returns {string} - Classification: 'Brilliant', 'Great', 'Best', 'Good', 'Inaccuracy', 'Mistake', 'Blunder'
 */
export function classifyMove(evalLoss, isMate = false, lostMate = false, materialLoss = 0) {
  // If mate was lost, it's always a blunder
  if (lostMate) {
    return 'Blunder'
  }

  // Handle mate scores - if there's a mate but it wasn't lost
  if (isMate) {
    // If evalLoss is very small with mate, check for Great/Best
    if (evalLoss <= 0.15) {
      // Great move if it's the best (evalLoss == 0) and not a forced recapture
      if (evalLoss === 0 && materialLoss <= 0) {
        return 'Great'
      }
      return 'Best'
    }
    // Any significant mate change is a blunder
    return 'Blunder'
  }

  // BRILLIANT LOGIC: Material sacrifice that doesn't hurt evaluation
  // Player lost material (materialLoss > 0) but eval didn't drop significantly (evalLoss < 0.5)
  if (materialLoss > 0 && evalLoss < 0.5) {
    return 'Brilliant'
  }

  // GREAT LOGIC: Best move (evalLoss == 0) that isn't a forced recapture
  if (evalLoss === 0 && materialLoss <= 0) {
    return 'Great'
  }

  // Updated classification thresholds (in pawns) - using SIDE-AWARE evalLoss
  if (evalLoss <= 0.15) {
    return 'Best'
  } else if (evalLoss <= 0.5) {
    return 'Good'
  } else if (evalLoss <= 1.2) {
    return 'Inaccuracy'
  } else if (evalLoss <= 2.5) {
    return 'Mistake'
  } else {
    return 'Blunder'
  }
}

/**
 * Calculate evaluation loss between two positions
 * SIDE-AWARE: Only counts losses, not improvements
 * @param {Object} evalBefore - Evaluation before move { type: 'cp'|'mate', value: number, centipawns: number }
 * @param {Object} evalAfter - Evaluation after move { type: 'cp'|'mate', value: number, centipawns: number }
 * @param {string} color - 'w' or 'b' - the color of the player making the move
 * @returns {Object} - { evalLoss: number, isMate: boolean, lostMate: boolean }
 */
export function calculateEvalLoss(evalBefore, evalAfter, color) {
  if (!evalBefore || !evalAfter) {
    return { evalLoss: 0, isMate: false, lostMate: false }
  }

  // Handle mate scores separately - DO NOT convert to centipawns
  const isMateBefore = evalBefore.type === 'mate'
  const isMateAfter = evalAfter.type === 'mate'
  const isMate = isMateBefore || isMateAfter

  // If mate was lost, this is a blunder
  if (isMateBefore && !isMateAfter) {
    // Had mate, lost it
    return { evalLoss: 5.0, isMate: true, lostMate: true }
  }
  if (!isMateBefore && isMateAfter) {
    // Gained mate - this is good, not a loss
    return { evalLoss: 0, isMate: true, lostMate: false }
  }
  if (isMateBefore && isMateAfter) {
    // Both are mate - check if mate got worse
    const beforeMate = evalBefore.value
    const afterMate = evalAfter.value
    
    // For white: positive mate is good, negative is bad
    // For black: negative mate is good, positive is bad
    if (color === 'w') {
      if (beforeMate > 0 && afterMate < 0) {
        // Lost winning mate, got losing mate
        return { evalLoss: 5.0, isMate: true, lostMate: true }
      } else if (beforeMate > 0 && afterMate > 0 && afterMate > beforeMate) {
        // Mate got further away (worse)
        return { evalLoss: 2.0, isMate: true, lostMate: false }
      } else {
        // Mate improved or stayed same
        return { evalLoss: 0, isMate: true, lostMate: false }
      }
    } else {
      // Black perspective
      if (beforeMate < 0 && afterMate > 0) {
        // Lost winning mate, got losing mate
        return { evalLoss: 5.0, isMate: true, lostMate: true }
      } else if (beforeMate < 0 && afterMate < 0 && afterMate < beforeMate) {
        // Mate got further away (worse for black)
        return { evalLoss: 2.0, isMate: true, lostMate: false }
      } else {
        // Mate improved or stayed same
        return { evalLoss: 0, isMate: true, lostMate: false }
      }
    }
  }

  // Handle centipawn evaluations - SIDE-AWARE calculation
  let beforeCp = evalBefore.centipawns || 0
  let afterCp = evalAfter.centipawns || 0

  // For black moves, flip the evaluation perspective
  if (color === 'b') {
    beforeCp = -beforeCp
    afterCp = -afterCp
  }

  // SIDE-AWARE: Only count losses, not improvements
  // For White: eval_loss = max(0, eval_before - eval_after)
  // For Black: eval_loss = max(0, eval_after - eval_before)
  // Since we already flipped for black, we can use the same formula
  let evalLoss = Math.max(0, beforeCp - afterCp) / 100 // Convert to pawns

  // Discount eval_loss in clearly winning positions (|eval_before| > 5.0)
  const absBeforeEval = Math.abs(beforeCp) / 100
  if (absBeforeEval > 5.0) {
    evalLoss = evalLoss * 0.3
  }

  return { evalLoss, isMate: false, lostMate: false }
}

/**
 * Generate explanation for a move
 * Material-based feedback takes priority over generic eval-based feedback
 * @param {Object} moveData - Move data with evaluation info
 * @param {string} bestMove - Best move suggested by engine
 * @param {number} evalLoss - Evaluation loss in pawns (side-aware)
 * @param {string} classification - Move classification
 * @param {number} materialLoss - Material lost (positive = lost, negative = gained)
 * @returns {string} - Human-readable explanation
 */
export function generateMoveExplanation(moveData, bestMove, evalLoss, classification, materialLoss = 0) {
  // Handle positive classifications first
  if (classification === 'Brilliant') {
    return 'You sacrificed material to gain a positional advantage! A brilliant find.'
  }
  
  if (classification === 'Great') {
    return 'A critical move that maintains the advantage.'
  }
  
  if (classification === 'Best') {
    return 'This is the best move according to the engine.'
  }

  const explanations = []

  // MATERIAL-BASED FEEDBACK (takes priority for negative moves)
  if (materialLoss >= 5) {
    // More natural language based on evalLoss
    if (evalLoss > 3.0) {
      explanations.push('A decisive error that gives away the game')
    } else {
      explanations.push('A major blunder losing decisive material')
    }
  } else if (materialLoss >= 3) {
    if (evalLoss > 2.5) {
      explanations.push('A serious mistake that loses significant material')
    } else {
      explanations.push('This move loses material')
    }
  } else if (materialLoss > 0) {
    explanations.push('This move loses material')
  }

  // If no material loss, use eval-based feedback with more natural language
  if (materialLoss === 0) {
    // More dramatic language for severe errors
    if (evalLoss > 3.0) {
      explanations.push('A decisive error that gives away the game')
    } else if (evalLoss > 2.5) {
      explanations.push('A serious mistake that throws away the advantage')
    } else if (evalLoss > 1.2 && evalLoss <= 2.5) {
      explanations.push('This move misses a tactical opportunity')
    } else if (evalLoss > 0.5 && evalLoss <= 1.2) {
      explanations.push('This move misses a better continuation')
    }

    // Positional issues with context
    if (evalLoss > 1.0 && evalLoss <= 2.0) {
      explanations.push('This move weakens the position')
    }

    // King safety
    if (evalLoss > 2.0) {
      explanations.push('This move compromises king safety')
    }
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
  let explanation = explanations.join('. ')
  
  // Add best move if not already mentioned
  if (bestMove && explanation.indexOf(bestMove) === -1 && materialLoss === 0) {
    explanation += `. Best move: ${bestMove}`
  }

  return explanation
}
