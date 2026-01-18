import { useState, useEffect, useRef, useCallback } from 'react'

export function useStockfish() {
  const [isReady, setIsReady] = useState(false)
  const workerRef = useRef(null)
  const callbacksRef = useRef(new Map())
  const currentFenRef = useRef(null)

  useEffect(() => {
    // Initialize Worker from local file
    let worker;
    try {
      worker = new Worker('/stockfish.js')
      workerRef.current = worker
    } catch (error) {
      console.error("Worker init failed:", error)
      return
    }

    worker.onerror = (e) => { 
      console.error("Stockfish Worker Error:", e) 
      alert("Error loading /stockfish.js. Please check if the file exists in 'public/'")
    }

    worker.onmessage = (event) => {
      const message = event.data
      if (typeof message === 'string') {
        if (message === 'uciok') {
          setIsReady(true)
          worker.postMessage('setoption name MultiPV value 1')
          worker.postMessage('setoption name Threads value 2')
        }
        
        // Parse Info (Score)
        if (message.startsWith('info') && message.includes('score')) {
           const fen = currentFenRef.current
           if (!fen) return
           // (Optional: You can parse intermediate scores here for live updates)
        }

        // Parse Best Move
        if (message.startsWith('bestmove')) {
          const fen = currentFenRef.current
          const bestMoveMatch = message.match(/bestmove (\S+)/)
          const bestMove = bestMoveMatch ? bestMoveMatch[1] : null
          
          if (fen && callbacksRef.current.has(fen)) {
            const callback = callbacksRef.current.get(fen)
            if (callback) {
              // Return the analysis result
              callback({
                evaluation: { type: 'cp', value: 0 }, // Simplified, real eval comes from 'info'
                bestMove: bestMove,
                principalVariation: [] 
              })
            }
            callbacksRef.current.delete(fen)
          }
        }
      }
    }

    worker.postMessage('uci')

    return () => { worker.terminate() }
  }, [])

  const analyzePosition = useCallback((fen, callback) => {
    if (!workerRef.current) {
      // Worker not initialized - provide fallback
      if (callback) {
        callback({
          evaluation: { type: 'cp', value: 0, centipawns: 0 },
          bestMove: null,
          principalVariation: []
        })
      }
      return
    }
    
    // Allow analysis even if engine isn't fully ready (it will queue)
    currentFenRef.current = fen
    callbacksRef.current.set(fen, callback)
    workerRef.current.postMessage('stop')
    workerRef.current.postMessage(`position fen ${fen}`)
    workerRef.current.postMessage('go depth 15') 
  }, [])

  return { analyzePosition, isReady }
}
