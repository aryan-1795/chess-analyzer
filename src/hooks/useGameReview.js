import { useState, useEffect, useCallback, useRef } from 'react'
import { useStockfish } from './useStockfish'
import { classifyMove, calculateEvalLoss, generateMoveExplanation } from '../utils/moveClassification'
import { generateGameSummary } from '../utils/accuracyCalculation'

/**
 * Hook for comprehensive game review
 * Analyzes all moves and generates review data
 */
export function useGameReview(moveHistory) {
  const { analyzePosition, isReady } = useStockfish()
  const [reviewData, setReviewData] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const analysisCacheRef = useRef(new Map()) // Cache evaluations by FEN

  /**
   * Analyze a single position and cache the result
   */
  const analyzePositionCached = useCallback((fen, depth = 15) => {
    return new Promise((resolve) => {
      // Check cache first
      if (analysisCacheRef.current.has(fen)) {
        resolve(analysisCacheRef.current.get(fen))
        return
      }

      analyzePosition(fen, (result) => {
        // Cache the result
        analysisCacheRef.current.set(fen, result)
        resolve(result)
      }, depth)
    })
  }, [analyzePosition])

  /**
   * Generate full game review
   */
  const generateReview = useCallback(async () => {
    if (!moveHistory || moveHistory.length === 0 || !isReady) {
      return
    }

    setIsAnalyzing(true)
    setAnalysisProgress(0)

    try {
      const { Chess } = await import('chess.js')
      const reviewMoves = []

      // Analyze each move
      for (let i = 0; i < moveHistory.length; i++) {
        const move = moveHistory[i]
        
        // Create position before the move
        const chessBefore = new Chess()
        for (let j = 0; j < i; j++) {
          chessBefore.move(moveHistory[j].move)
        }
        const fenBefore = chessBefore.fen()

        // Create position after the move
        const chessAfter = new Chess()
        for (let j = 0; j <= i; j++) {
          chessAfter.move(moveHistory[j].move)
        }
        const fenAfter = chessAfter.fen()

        // Analyze both positions
        const [analysisBefore, analysisAfter] = await Promise.all([
          analyzePositionCached(fenBefore, 15),
          analyzePositionCached(fenAfter, 15)
        ])

        // Ensure evaluation objects have the expected structure
        const evalBefore = analysisBefore?.evaluation || { type: 'cp', value: 0, centipawns: 0 }
        const evalAfter = analysisAfter?.evaluation || { type: 'cp', value: 0, centipawns: 0 }

        // Normalize evaluation structure
        if (!evalBefore.centipawns) {
          if (evalBefore.type === 'mate') {
            evalBefore.centipawns = evalBefore.value > 0 ? 10000 : -10000
          } else {
            evalBefore.centipawns = evalBefore.value || 0
          }
        }
        if (!evalAfter.centipawns) {
          if (evalAfter.type === 'mate') {
            evalAfter.centipawns = evalAfter.value > 0 ? 10000 : -10000
          } else {
            evalAfter.centipawns = evalAfter.value || 0
          }
        }

        // Calculate evaluation loss
        const { evalLoss, isMate } = calculateEvalLoss(
          evalBefore,
          evalAfter,
          move.color
        )

        // Classify the move
        const classification = classifyMove(evalLoss, isMate)

        // Get best move (from position before)
        const bestMove = analysisBefore?.bestMove || null

        // Generate explanation if not best move
        const comment = classification === 'Best' 
          ? 'This is the best move according to the engine.'
          : generateMoveExplanation(move, bestMove, evalLoss, classification)

        // Convert evaluation to pawns for display
        const evalBeforePawns = evalBefore.centipawns / 100
        const evalAfterPawns = evalAfter.centipawns / 100

        reviewMoves.push({
          move: move.move,
          moveIndex: i,
          color: move.color,
          evalBefore: evalBeforePawns,
          evalAfter: evalAfterPawns,
          evalLoss,
          bestMove,
          classification,
          comment,
          principalVariation: analysisBefore?.principalVariation || []
        })

        // Update progress
        setAnalysisProgress(Math.round(((i + 1) / moveHistory.length) * 100))
      }

      // Generate summary
      const summary = generateGameSummary(reviewMoves)

      // Create final review data
      const review = {
        moves: reviewMoves,
        summary
      }

      setReviewData(review)
      setIsAnalyzing(false)
      return review
    } catch (error) {
      console.error('Error generating review:', error)
      setIsAnalyzing(false)
      throw error
    }
  }, [moveHistory, isReady, analyzePositionCached])

  /**
   * Clear review data and cache
   */
  const clearReview = useCallback(() => {
    setReviewData(null)
    analysisCacheRef.current.clear()
    setAnalysisProgress(0)
  }, [])

  return {
    reviewData,
    isAnalyzing,
    analysisProgress,
    generateReview,
    clearReview
  }
}
