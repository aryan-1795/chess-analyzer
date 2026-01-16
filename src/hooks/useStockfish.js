import { useState, useEffect, useRef, useCallback } from 'react'

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

      const pendingEvaluations = new Map() // Store latest evaluation per FEN

      workerRef.current.onmessage = (event) => {
        let message = event.data

        // Handle both string and object messages (Stockfish.js can send either)
        if (typeof message === 'object' && message !== null) {
          // Stockfish.js object format
          if (message.type === 'bestmove') {
            // Analysis complete - use the latest evaluation
            const fen = currentFenRef.current
            if (fen && pendingEvaluations.has(fen)) {
              const callback = callbacksRef.current.get(fen)
              if (callback) {
                callback(pendingEvaluations.get(fen))
                pendingEvaluations.delete(fen)
                callbacksRef.current.delete(fen)
              }
            }
          } else if (message.type === 'info' && message.evaluation) {
            // Extract evaluation from object
            const fen = currentFenRef.current
            if (fen) {
              let evaluation = 0
              if (message.evaluation.type === 'mate') {
                evaluation = message.evaluation.value > 0 ? 10 : -10
              } else if (message.evaluation.type === 'cp') {
                evaluation = message.evaluation.value / 100
              }
              pendingEvaluations.set(fen, evaluation)
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
          // Analysis complete - use the latest evaluation
          const fen = currentFenRef.current
          if (fen && pendingEvaluations.has(fen)) {
            const callback = callbacksRef.current.get(fen)
            if (callback) {
              callback(pendingEvaluations.get(fen))
              pendingEvaluations.delete(fen)
              callbacksRef.current.delete(fen)
            }
          }
        } else if (message.startsWith('info')) {
          // Parse evaluation from info line
          // Look for score cp (centipawns) or mate
          const cpMatch = message.match(/score cp (-?\d+)/)
          const mateMatch = message.match(/score mate (-?\d+)/)
          
          if (cpMatch || mateMatch) {
            let evaluation = 0
            if (mateMatch) {
              // Mate in N moves - use a large evaluation
              const mateMoves = parseInt(mateMatch[1])
              evaluation = mateMoves > 0 ? 10 : -10 // Simplified mate score
            } else if (cpMatch) {
              // Convert centipawns to evaluation (divide by 100)
              evaluation = parseInt(cpMatch[1]) / 100
            }
            
            // Store the latest evaluation for this position
            const fen = currentFenRef.current
            if (fen) {
              pendingEvaluations.set(fen, evaluation)
            }
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

  const analyzePosition = useCallback((fen, callback) => {
    if (!workerRef.current || !isReady) {
      console.warn('Stockfish not ready')
      if (callback) callback(0)
      return
    }

    // Store callback with FEN as key
    currentFenRef.current = fen
    callbacksRef.current.set(fen, callback)

    // Start analysis
    workerRef.current.postMessage(`position fen ${fen}`)
    workerRef.current.postMessage('go depth 15')
    
    // Set timeout to ensure callback is called even if no response
    setTimeout(() => {
      if (callbacksRef.current.has(fen)) {
        callback(0) // Default to 0 if no response
        callbacksRef.current.delete(fen)
      }
    }, 5000)
  }, [isReady])

  return { analyzePosition, isReady }
}
