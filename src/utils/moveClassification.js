/**
 * Move classification utility
 * Classifies moves based on evaluation loss using chess.com-style thresholds
 */

export function classifyMove(evalLoss, isMate = false, lostMate = false, materialLoss = 0) {
  if (lostMate) return 'Blunder'

  if (isMate) {
    if (evalLoss <= 0.15) return 'Best'
    return 'Blunder'
  }

  // BRILLIANT: Material sacrifice (>0) with sound position (<0.5 loss)
  if (materialLoss > 0 && evalLoss < 0.5) return 'Brilliant'

  // Standard Thresholds (Removed separate "Great" check)
  if (evalLoss <= 0.15) return 'Best'
  if (evalLoss <= 0.5) return 'Good'
  if (evalLoss <= 1.2) return 'Inaccuracy'
  if (evalLoss <= 2.5) return 'Mistake'
  return 'Blunder'
}

export function calculateEvalLoss(evalBefore, evalAfter, color) {
  if (!evalBefore || !evalAfter) return { evalLoss: 0, isMate: false, lostMate: false }

  const isMateBefore = evalBefore.type === 'mate'
  const isMateAfter = evalAfter.type === 'mate'
  const isMate = isMateBefore || isMateAfter

  if (isMateBefore && !isMateAfter) return { evalLoss: 5.0, isMate: true, lostMate: true }
  if (!isMateBefore && isMateAfter) return { evalLoss: 0, isMate: true, lostMate: false }
  
  if (isMateBefore && isMateAfter) {
    const beforeMate = evalBefore.value
    const afterMate = evalAfter.value
    // Logic for mate-to-mate changes
    if (color === 'w') {
      if (beforeMate > 0 && afterMate < 0) return { evalLoss: 5.0, isMate: true, lostMate: true }
      if (beforeMate > 0 && afterMate > 0 && afterMate > beforeMate) return { evalLoss: 2.0, isMate: true, lostMate: false }
    } else {
      if (beforeMate < 0 && afterMate > 0) return { evalLoss: 5.0, isMate: true, lostMate: true }
      if (beforeMate < 0 && afterMate < 0 && afterMate < beforeMate) return { evalLoss: 2.0, isMate: true, lostMate: false }
    }
    return { evalLoss: 0, isMate: true, lostMate: false }
  }

  let beforeCp = evalBefore.centipawns || 0
  let afterCp = evalAfter.centipawns || 0

  if (color === 'b') {
    beforeCp = -beforeCp
    afterCp = -afterCp
  }

  let evalLoss = Math.max(0, beforeCp - afterCp) / 100
  
  // Discount loss in winning positions
  if (Math.abs(beforeCp) / 100 > 5.0) evalLoss *= 0.3

  return { evalLoss, isMate: false, lostMate: false }
}

export function generateMoveExplanation(moveData, bestMove, evalLoss, classification, materialLoss = 0) {
  if (classification === 'Brilliant') return 'You sacrificed material to gain a positional advantage!'
  if (classification === 'Best') return 'Excellent move! This is the best continuation.'
  
  const explanations = []
  
  if (materialLoss > 0) explanations.push('This move loses material')
  
  if (classification === 'Blunder') explanations.push('A decisive error that gives away the advantage')
  else if (classification === 'Mistake') explanations.push('This move is a mistake')
  else if (classification === 'Inaccuracy') explanations.push('This move is an inaccuracy')

  if (explanations.length === 0) explanations.push('This move is not optimal')

  let explanation = explanations.join('. ')
  if (bestMove && materialLoss === 0) explanation += `. Best move: ${bestMove}`
  
  return explanation
}
