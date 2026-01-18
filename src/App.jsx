import { useState, useEffect } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { useStockfish } from './hooks/useStockfish'
import { useGameReview } from './hooks/useGameReview'
import GameInfo from './components/GameInfo'
import MoveList from './components/MoveList'
import EvaluationBar from './components/EvaluationBar'
import ReviewSummary from './components/ReviewSummary'
import AdvantageChart from './components/AdvantageChart'
import FeedbackPanel from './components/FeedbackPanel'

function App() {
  const [username, setUsername] = useState('')
  const [games, setGames] = useState([])
  const [selectedGame, setSelectedGame] = useState(null)
  const [game, setGame] = useState(null)
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1)
  const [moveHistory, setMoveHistory] = useState([])
  const [evaluation, setEvaluation] = useState(0)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [evaluations, setEvaluations] = useState({}) // Store evaluations for each position
  const [retryMode, setRetryMode] = useState(false)
  const [retryMoveIndex, setRetryMoveIndex] = useState(null)
  const [retryMessage, setRetryMessage] = useState(null)
  const [retryGame, setRetryGame] = useState(null)
  const { analyzePosition, isReady } = useStockfish()
  const { reviewData, isAnalyzing: isReviewAnalyzing, analysisProgress, generateReview, clearReview } = useGameReview(moveHistory)

  // Fetch games from Chess.com API
  const fetchGames = async (username) => {
    try {
      const response = await fetch(`https://api.chess.com/pub/player/${username}/games/archives`)
      if (!response.ok) throw new Error('Failed to fetch archives')
      
      const data = await response.json()
      const archives = data.archives || []
      
      if (archives.length === 0) {
        alert('No games found for this username')
        return
      }

      // Get the latest month
      const latestArchive = archives[archives.length - 1]
      const gamesResponse = await fetch(latestArchive)
      if (!gamesResponse.ok) throw new Error('Failed to fetch games')
      
      const gamesData = await gamesResponse.json()
      const gameList = gamesData.games || []
      
      // Get last 5 games
      const recentGames = gameList.slice(-5).reverse()
      setGames(recentGames)
    } catch (error) {
      console.error('Error fetching games:', error)
      alert('Error fetching games. Please check the username and try again.')
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (username.trim()) {
      fetchGames(username.trim())
    }
  }

  const loadGame = (gameData) => {
    try {
      const pgn = gameData.pgn || ''
      const chess = new Chess()
      chess.loadPgn(pgn)
      
      // Extract moves
      const moves = chess.history({ verbose: true })
      const history = []
      const tempChess = new Chess()
      
      moves.forEach((move, index) => {
        tempChess.move(move)
        history.push({
          move: move.san,
          from: move.from,
          to: move.to,
          color: move.color,
          index: index,
          fen: tempChess.fen()
        })
      })

      setGame(chess)
      setMoveHistory(history)
      setCurrentMoveIndex(history.length - 1)
      setSelectedGame(gameData)
      setEvaluation(0)
      setEvaluations({})
      clearReview() // Clear previous review when loading new game
    } catch (error) {
      console.error('Error loading game:', error)
      alert('Error loading game PGN')
    }
  }

  const goToMove = (index, enableRetry = true) => {
    if (index < -1 || index >= moveHistory.length) return
    
    // Check if this is a mistake/blunder and we have review data (only if enableRetry is true)
    if (enableRetry && reviewData && reviewData.moves && reviewData.moves[index]) {
      const classification = reviewData.moves[index].classification
      const isRetryable = classification === 'Mistake' || classification === 'Blunder'
      
      if (isRetryable) {
        // Enter retry mode
        const chess = new Chess()
        // Go to position before the mistake
        if (index > 0) {
          for (let i = 0; i < index; i++) {
            chess.move(moveHistory[i].move)
          }
        }
        setRetryGame(new Chess(chess.fen()))
        setRetryMoveIndex(index)
        setRetryMode(true)
        setRetryMessage(null)
        setGame(chess)
        setCurrentMoveIndex(index - 1)
        setEvaluation(0)
        return
      }
    }
    
    // Normal navigation
    const chess = new Chess()
    if (index === -1) {
      chess.reset()
    } else {
      for (let i = 0; i <= index; i++) {
        chess.move(moveHistory[i].move)
      }
    }
    
    setGame(chess)
    setCurrentMoveIndex(index)
    setEvaluation(0)
    setRetryMode(false)
    setRetryMoveIndex(null)
    setRetryMessage(null)
  }

  const prevMove = () => {
    if (retryMode) {
      exitRetryMode()
    }
    goToMove(currentMoveIndex - 1)
  }

  const nextMove = () => {
    if (retryMode) {
      exitRetryMode()
    }
    goToMove(currentMoveIndex + 1)
  }

  const resetGame = () => {
    goToMove(-1)
    setRetryMode(false)
    setRetryMoveIndex(null)
    setRetryMessage(null)
    setRetryGame(null)
  }

  // Handle piece drop/move in retry mode
  const onPieceDrop = (sourceSquare, targetSquare) => {
    if (!retryMode || !retryGame) return false

    try {
      const move = retryGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q' // Always promote to queen for simplicity
      })

      if (move) {
        // Check if this move matches the best move
        const reviewMove = reviewData.moves[retryMoveIndex]
        const bestMove = reviewMove?.bestMove

        if (bestMove) {
          // Convert bestMove (e.g., "e2e4" or "e2-e4") to compare with our move
          // Handle both formats: "e2e4" and "e2-e4"
          const normalizedBestMove = bestMove.replace('-', '').replace(' ', '')
          const bestMoveFrom = normalizedBestMove.substring(0, 2)
          const bestMoveTo = normalizedBestMove.substring(2, 4)
          
          // Also check if promotion is specified
          const hasPromotion = normalizedBestMove.length > 4
          const promotion = hasPromotion ? normalizedBestMove[4] : null
          
          if (sourceSquare === bestMoveFrom && targetSquare === bestMoveTo) {
            // Check promotion if specified
            if (hasPromotion && move.promotion) {
              const promotionMap = { q: 'q', r: 'r', b: 'b', n: 'n' }
              if (promotionMap[promotion.toLowerCase()] === move.promotion) {
                setRetryMessage({ type: 'success', text: "Good job! You found the best move." })
              } else {
                setRetryMessage({ type: 'error', text: "Try again." })
              }
            } else {
              setRetryMessage({ type: 'success', text: "Good job! You found the best move." })
            }
          } else {
            setRetryMessage({ type: 'error', text: "Try again." })
          }
        } else {
          // If no best move stored, just check if it's a valid move
          setRetryMessage({ type: 'info', text: "Move made. Checking..." })
        }

        // Update the game state
        const newGame = new Chess(retryGame.fen())
        setRetryGame(newGame)
        setGame(newGame)
        return true
      }
    } catch (error) {
      // Invalid move
      setRetryMessage({ type: 'error', text: "Invalid move. Try again." })
      return false
    }

    return false
  }

  // Reset retry attempt (go back to position before mistake)
  const resetRetryAttempt = () => {
    if (retryMoveIndex === null) return
    
    const chess = new Chess()
    // Go to position before the mistake
    if (retryMoveIndex > 0) {
      for (let i = 0; i < retryMoveIndex; i++) {
        chess.move(moveHistory[i].move)
      }
    }
    setRetryGame(new Chess(chess.fen()))
    setGame(chess)
    setRetryMessage(null)
  }

  // Exit retry mode
  const exitRetryMode = () => {
    const savedIndex = retryMoveIndex
    setRetryMode(false)
    setRetryMoveIndex(null)
    setRetryMessage(null)
    setRetryGame(null)
    // Return to the original mistake position
    if (savedIndex !== null) {
      goToMove(savedIndex, false) // Disable retry to avoid infinite loop
    }
  }

  // Analyze current position
  useEffect(() => {
    if (game && isReady && currentMoveIndex >= -1) {
      const fen = game.fen()
      
      // Check if we already have evaluation for this position
      if (evaluations[fen] !== undefined) {
        setEvaluation(evaluations[fen])
        setIsAnalyzing(false)
        return
      }

      setIsAnalyzing(true)
      analyzePosition(fen, (result) => {
        // Handle new format with evaluation object
        const evalValue = result.evaluation?.centipawns ? result.evaluation.centipawns / 100 : (typeof result === 'number' ? result : 0)
        setEvaluation(evalValue)
        setEvaluations(prev => ({ ...prev, [fen]: evalValue }))
        setIsAnalyzing(false)
      })
    }
  }, [game, currentMoveIndex, isReady, analyzePosition])

  const getMoveClassification = (moveIndex) => {
    if (moveIndex < 0 || moveIndex >= moveHistory.length) return null
    
    // Use review data if available (more accurate)
    if (reviewData && reviewData.moves && reviewData.moves[moveIndex]) {
      return reviewData.moves[moveIndex].classification
    }
    
    // Fallback to old method if review not available
    const beforeIndex = moveIndex - 1
    const afterIndex = moveIndex
    
    const chessBefore = new Chess()
    if (beforeIndex >= 0) {
      for (let i = 0; i <= beforeIndex; i++) {
        chessBefore.move(moveHistory[i].move)
      }
    }
    
    const chessAfter = new Chess()
    for (let i = 0; i <= afterIndex; i++) {
      chessAfter.move(moveHistory[i].move)
    }
    
    const fenBefore = chessBefore.fen()
    const fenAfter = chessAfter.fen()
    
    const evalBefore = evaluations[fenBefore]
    const evalAfter = evaluations[fenAfter]
    
    if (evalBefore === undefined || evalAfter === undefined) {
      return 'Good' // Default if not analyzed yet
    }
    
    const move = moveHistory[moveIndex]
    const beforeEval = move.color === 'w' ? evalBefore : -evalBefore
    const afterEval = move.color === 'w' ? evalAfter : -evalAfter
    
    const evalDrop = beforeEval - afterEval
    
    if (evalDrop > 3.0) {
      return 'Blunder'
    } else if (evalDrop > 1.5) {
      return 'Mistake'
    } else if (evalDrop > 0.7) {
      return 'Inaccuracy'
    } else if (evalDrop > 0.2) {
      return 'Good'
    } else {
      return 'Best'
    }
  }

  const getMoveColor = (moveIndex) => {
    if (moveIndex < 0 || moveIndex >= moveHistory.length) return null
    const move = moveHistory[moveIndex]
    return move.color === 'w' ? 'White' : 'Black'
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">Chess.com Game Analyzer</h1>
        
        {/* Username Input */}
        <form onSubmit={handleSubmit} className="mb-8 flex justify-center gap-4">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter Chess.com username"
            className="px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-blue-500 w-64"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
          >
            Fetch Games
          </button>
        </form>

        {/* Games List */}
        {games.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Recent Games (Last 5)</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {games.map((gameData, index) => (
                <button
                  key={index}
                  onClick={() => loadGame(gameData)}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    selectedGame === gameData
                      ? 'border-blue-500 bg-blue-900/30'
                      : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                  }`}
                >
                  <div className="text-sm">
                    <div className="font-semibold">
                      {gameData.white?.username || 'White'} vs {gameData.black?.username || 'Black'}
                    </div>
                    <div className="text-gray-400 mt-1">
                      {new Date(gameData.end_time * 1000).toLocaleDateString()}
                    </div>
                    <div className="text-xs mt-1">
                      Result: {gameData.white?.result || '-'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Game View */}
        {game && (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left: Evaluation Bar */}
            <div className="flex-shrink-0">
              <EvaluationBar evaluation={evaluation} isAnalyzing={isAnalyzing} />
            </div>

            {/* Center: Chessboard */}
            <div className="flex-1 flex flex-col items-center gap-4">
              <div className="w-full max-w-2xl relative">
                <div className="bg-gray-800 rounded-lg p-4">
                  <Chessboard
                    position={game.fen()}
                    boardWidth={600}
                    customBoardStyle={{
                      borderRadius: '4px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
                    }}
                    onPieceDrop={retryMode ? onPieceDrop : undefined}
                    arePiecesDraggable={retryMode}
                  />
                </div>
                
                {/* Retry Mode Overlay */}
                {retryMode && (
                  <div className="absolute top-4 right-4 bg-gray-900/95 border border-gray-700 rounded-lg p-4 shadow-lg z-10 max-w-xs">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-white">Retry Mode</h3>
                      <button
                        onClick={exitRetryMode}
                        className="text-gray-400 hover:text-white transition-colors"
                        title="Exit Retry Mode"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-sm text-gray-300 mb-3">
                      Try to find the best move for this position.
                    </p>
                    {reviewData?.moves[retryMoveIndex]?.bestMove && (
                      <p className="text-xs text-gray-400 mb-3">
                        Best move: <span className="text-white font-mono">{reviewData.moves[retryMoveIndex].bestMove}</span>
                      </p>
                    )}
                    
                    {/* Retry Message */}
                    {retryMessage && (
                      <div className={`p-2 rounded mb-3 ${
                        retryMessage.type === 'success' 
                          ? 'bg-green-900/50 text-green-300 border border-green-700'
                          : retryMessage.type === 'error'
                          ? 'bg-red-900/50 text-red-300 border border-red-700'
                          : 'bg-blue-900/50 text-blue-300 border border-blue-700'
                      }`}>
                        <p className="text-sm font-semibold">{retryMessage.text}</p>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <button
                        onClick={resetRetryAttempt}
                        className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm"
                      >
                        Reset
                      </button>
                      <button
                        onClick={exitRetryMode}
                        className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm"
                      >
                        Exit
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Advantage Chart */}
              {reviewData && reviewData.moves && reviewData.moves.length > 0 && (
                <div className="w-full max-w-2xl">
                  <AdvantageChart moves={reviewData.moves} />
                </div>
              )}
            </div>

            {/* Right: Game Info and Controls */}
            <div className="flex-shrink-0 w-full lg:w-80">
              <div className="bg-gray-800 rounded-lg p-4 space-y-4">
                {/* Game Metadata */}
                <GameInfo game={selectedGame} />

                {/* Feedback Panel */}
                <FeedbackPanel 
                  currentMove={moveHistory[currentMoveIndex]} 
                  reviewData={reviewData} 
                  isAnalyzing={isReviewAnalyzing} 
                />

                {/* Review Button */}
                <div className="border-b border-gray-700 pb-4">
                  <button
                    onClick={generateReview}
                    disabled={isReviewAnalyzing || moveHistory.length === 0}
                    className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
                  >
                    {isReviewAnalyzing ? `Analyzing... ${analysisProgress}%` : 'Analyze Game'}
                  </button>
                </div>

                {/* Review Summary */}
                <ReviewSummary 
                  summary={reviewData?.summary} 
                  isAnalyzing={isReviewAnalyzing}
                  analysisProgress={analysisProgress}
                />

                {/* Move List */}
                <MoveList
                  moves={moveHistory}
                  currentMoveIndex={currentMoveIndex}
                  onMoveClick={goToMove}
                  getMoveClassification={getMoveClassification}
                  getMoveColor={getMoveColor}
                  reviewData={reviewData}
                />

                {/* Navigation */}
                <div className="flex gap-2">
                  <button
                    onClick={prevMove}
                    disabled={currentMoveIndex < 0}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    Prev
                  </button>
                  <button
                    onClick={resetGame}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    Reset
                  </button>
                  <button
                    onClick={nextMove}
                    disabled={currentMoveIndex >= moveHistory.length - 1}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
