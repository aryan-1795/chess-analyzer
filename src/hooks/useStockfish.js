import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Enhanced Stockfish hook that extracts:
 * - Evaluation (centipawns or mate)
 * - Best move
 * - Principal variation
 */
export function useStockfish() {
  const [isReady, setIsReady] = useState(false)
  const workerRef = useRef(null)
  const callbacksRef = useRef(new Map())
  const currentFenRef = useRef(null)

  useEffect(() => {
    // Initialize Stockfish Web Worker
    const initWorker = () => {
      try {
        // Try to load from public folder first
        workerRef.current = new Worker('/stockfish.js', { type: 'module' })
        setupWorker()
      } catch (error) {
        console.warn('Failed to load local Stockfish, trying CDN...', error)
        // Fallback: try CDN version
        try {
          workerRef.current = new Worker('https://cdn.jsdelivr.net/npm/stockfish.js@10/stockfish.js')
          setupWorker()
        } catch (cdnError) {
          console.error('Error loading Stockfish from CDN:', cdnError)
          alert('Failed to load Stockfish engine. Please ensure stockfish.js is in the public folder.')
        }
      }
    }

    const setupWorker = () => {
      if (!workerRef.current) return

      const pendingAnalysis = new Map() // Store analysis data per FEN

      workerRef.current.onmessage = (event) => {
        let message = event.data

        // Handle both string and object messages (Stockfish.js can send either)
        if (typeof message === 'object' && message !== null) {
          // Stockfish.js object format
          if (message.type === 'bestmove') {
            const fen = currentFenRef.current
            if (fen && pendingAnalysis.has(fen)) {
              const analysis = pendingAnalysis.get(fen)
              const callback = callbacksRef.current.get(fen)
              if (callback) {
                callback({
                  evaluation: analysis.evaluation,
                  bestMove: message.bestmove || null,
                  principalVariation: analysis.principalVariation || []
                })
                pendingAnalysis.delete(fen)
                callbacksRef.current.delete(fen)
              }
            }
          } else if (message.type === 'info' && message.evaluation) {
            const fen = currentFenRef.current
            if (fen) {
              let evaluation = { type: 'cp', value: 0 }
              if (message.evaluation.type === 'mate') {
                evaluation = { 
                  type: 'mate', 
                  value: message.evaluation.value,
                  // Convert mate to a large centipawn value for comparison
                  centipawns: message.evaluation.value > 0 ? 10000 : -10000
                }
              } else if (message.evaluation.type === 'cp') {
                evaluation = { 
                  type: 'cp', 
                  value: message.evaluation.value,
                  centipawns: message.evaluation.value
                }
              }
              
              const analysis = pendingAnalysis.get(fen) || {}
              analysis.evaluation = evaluation
              if (message.pv) {
                analysis.principalVariation = message.pv
              }
              pendingAnalysis.set(fen, analysis)
            }
          }
          return
        }

        // Handle string messages (UCI protocol)
        if (typeof message !== 'string') return

        if (message === 'uciok') {
          setIsReady(true)
          // Set options for better analysis
          workerRef.current.postMessage('setoption name MultiPV value 1')
          workerRef.current.postMessage('setoption name Skill Level value 20')
        } else if (message.startsWith('bestmove')) {
          // Parse bestmove: "bestmove e2e4 ponder e7e5"
          const fen = currentFenRef.current
          if (fen && pendingAnalysis.has(fen)) {
            const analysis = pendingAnalysis.get(fen)
            const bestMoveMatch = message.match(/bestmove (\S+)/)
            const bestMove = bestMoveMatch ? bestMoveMatch[1] : null
            
            const callback = callbacksRef.current.get(fen)
            if (callback) {
              callback({
                evaluation: analysis.evaluation,
                bestMove: bestMove,
                principalVariation: analysis.principalVariation || []
              })
              pendingAnalysis.delete(fen)
              callbacksRef.current.delete(fen)
            }
          }
        } else if (message.startsWith('info')) {
          // Parse info line for evaluation and principal variation
          const fen = currentFenRef.current
          if (!fen) return

          let evaluation = null
          let principalVariation = []

          // Parse score (cp or mate)
          const cpMatch = message.match(/score cp (-?\d+)/)
          const mateMatch = message.match(/score mate (-?\d+)/)
          
          if (mateMatch) {
            const mateMoves = parseInt(mateMatch[1])
            evaluation = {
              type: 'mate',
              value: mateMoves,
              centipawns: mateMoves > 0 ? 10000 : -10000
            }
          } else if (cpMatch) {
            const cp = parseInt(cpMatch[1])
            evaluation = {
              type: 'cp',
              value: cp,
              centipawns: cp
            }
          }

          // Parse principal variation
          const pvMatch = message.match(/pv (.+)/)
          if (pvMatch) {
            principalVariation = pvMatch[1].trim().split(/\s+/)
          }

          if (evaluation) {
            const analysis = pendingAnalysis.get(fen) || {}
            analysis.evaluation = evaluation
            if (principalVariation.length > 0) {
              analysis.principalVariation = principalVariation
            }
            pendingAnalysis.set(fen, analysis)
          }
        }
      }

      // Initialize UCI
      workerRef.current.postMessage('uci')
      workerRef.current.postMessage('isready')
    }

    initWorker()

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
      }
    }
  }, [])

  const analyzePosition = useCallback((fen, callback, depth = 15) => {
    if (!workerRef.current || !isReady) {
      console.warn('Stockfish not ready')
      if (callback) callback({ evaluation: { type: 'cp', value: 0, centipawns: 0 }, bestMove: null, principalVariation: [] })
      return
    }

    // Store callback with FEN as key
    currentFenRef.current = fen
    callbacksRef.current.set(fen, callback)

    // Start analysis
    workerRef.current.postMessage(`position fen ${fen}`)
    workerRef.current.postMessage(`go depth ${depth}`)
    
    // Set timeout to ensure callback is called even if no response
    setTimeout(() => {
      if (callbacksRef.current.has(fen)) {
        const callback = callbacksRef.current.get(fen)
        if (callback) {
          callback({ 
            evaluation: { type: 'cp', value: 0, centipawns: 0 }, 
            bestMove: null, 
            principalVariation: [] 
          })
        }
        callbacksRef.current.delete(fen)
      }
    }, 10000) // Increased timeout for deeper analysis
  }, [isReady])

  return { analyzePosition, isReady }
}
