import { useState, useEffect, useRef, useCallback } from 'react'

export function useStockfish() {
  const [isReady, setIsReady] = useState(false)
  const workerRef = useRef(null)
  const callbacksRef = useRef(new Map())
  const currentFenRef = useRef(null)
  const latestScoreRef = useRef({ type: 'cp', value: 0 })

  useEffect(() => {
    let worker;
    try {
      worker = new Worker('/stockfish.js')
      workerRef.current = worker
    } catch (error) {
      console.error("Worker init failed:", error)
      return
    }

    worker.onerror = (e) => { console.error("Stockfish Worker Error:", e) }

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
           
           let score = 0
           let type = 'cp'
           
           if (message.includes('mate')) {
             const mateMatch = message.match(/score mate (-?\d+)/)
             if (mateMatch) {
               score = parseInt(mateMatch[1])
               type = 'mate'
             }
           } else if (message.includes('cp')) {
             const cpMatch = message.match(/score cp (-?\d+)/)
             if (cpMatch) {
               score = parseInt(cpMatch[1])
               type = 'cp'
             }
           }

           // --- CRITICAL FIX: NORMALIZE TO WHITE PERSPECTIVE ---
           // If turn is 'b', flip the score so + always means White advantage
           const turn = fen.split(' ')[1]
           if (turn === 'b') {
             score = -score
           }

           latestScoreRef.current = { type, value: score, centipawns: type === 'cp' ? score : null }
        }

        // Parse Best Move
        if (message.startsWith('bestmove')) {
          const fen = currentFenRef.current
          const bestMoveMatch = message.match(/bestmove (\S+)/)
          const bestMove = bestMoveMatch ? bestMoveMatch[1] : null
          
          if (fen && callbacksRef.current.has(fen)) {
            const callback = callbacksRef.current.get(fen)
            if (callback) {
              callback({
                evaluation: latestScoreRef.current,
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

  const analyzePosition = useCallback((fen, callback, depth = 15) => {
    if (!workerRef.current) {
      if (callback) callback({ evaluation: { type: 'cp', value: 0 }, bestMove: null })
      return
    }
    
    // Reset score for new position
    latestScoreRef.current = { type: 'cp', value: 0, centipawns: 0 }
    currentFenRef.current = fen
    callbacksRef.current.set(fen, callback)
    
    workerRef.current.postMessage('stop')
    workerRef.current.postMessage(`position fen ${fen}`)
    workerRef.current.postMessage(`go depth ${depth}`) 
  }, [])

  return { analyzePosition, isReady }
}
