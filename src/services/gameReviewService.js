/**
 * Game Review Service
 * Provides a clean API for game review data
 */

/**
 * Get review data in the requested format
 * @param {Object} reviewData - Review data from useGameReview hook
 * @returns {Object} - Formatted review data
 */
export function getReviewData(reviewData) {
  if (!reviewData || !reviewData.moves) {
    return null
  }

  return {
    moves: reviewData.moves.map(move => ({
      move: move.move,
      evalBefore: move.evalBefore,
      evalAfter: move.evalAfter,
      bestMove: move.bestMove,
      classification: move.classification,
      comment: move.comment
    })),
    summary: {
      whiteAccuracy: reviewData.summary.whiteAccuracy,
      blackAccuracy: reviewData.summary.blackAccuracy,
      blunders: reviewData.summary.blunders,
      mistakes: reviewData.summary.mistakes,
      inaccuracies: reviewData.summary.inaccuracies,
      keyMoments: reviewData.summary.keyMoments
    }
  }
}

/**
 * Export review data as JSON
 * @param {Object} reviewData - Review data from useGameReview hook
 * @returns {string} - JSON string
 */
export function exportReviewAsJSON(reviewData) {
  const formatted = getReviewData(reviewData)
  return JSON.stringify(formatted, null, 2)
}
