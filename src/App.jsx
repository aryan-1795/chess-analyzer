import { useState, useEffect } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { useStockfish } from './hooks/useStockfish'
import GameInfo from './components/GameInfo'
import MoveList from './components/MoveList'
import EvaluationBar from './components/EvaluationBar'

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
  const { analyzePosition, isReady } = useStockfish()

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
    } catch (error) {
      console.error('Error loading game:', error)
      alert('Error loading game PGN')
    }
  }

  const goToMove = (index) => {
    if (index < -1 || index >= moveHistory.length) return
    
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
  }

  const prevMove = () => {
    goToMove(currentMoveIndex - 1)
  }

  const nextMove = () => {
    goToMove(currentMoveIndex + 1)
  }

  const resetGame = () => {
    goToMove(-1)
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
      analyzePosition(fen, (evaluation) => {
        setEvaluation(evaluation)
        setEvaluations(prev => ({ ...prev, [fen]: evaluation }))
        setIsAnalyzing(false)
      })
    }
  }, [game, currentMoveIndex, isReady, analyzePosition])

  const getMoveClassification = (moveIndex) => {
    if (moveIndex < 0 || moveIndex >= moveHistory.length) return null
    
    // Get evaluation before and after the move
    const beforeIndex = moveIndex - 1
    const afterIndex = moveIndex
    
    // Get FEN positions
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
    
    // Adjust for color - if it's black's move, flip the evaluation
    const move = moveHistory[moveIndex]
    const beforeEval = move.color === 'w' ? evalBefore : -evalBefore
    const afterEval = move.color === 'w' ? evalAfter : -evalAfter
    
    const evalDrop = beforeEval - afterEval
    
    if (evalDrop > 2.0) {
      return 'Blunder'
    } else if (evalDrop > 1.0) {
      return 'Mistake'
    } else {
      return 'Good'
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
            <div className="flex-1 flex justify-center">
              <div className="w-full max-w-2xl">
                <div className="bg-gray-800 rounded-lg p-4">
                  <Chessboard
                    position={game.fen()}
                    boardWidth={600}
                    customBoardStyle={{
                      borderRadius: '4px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Right: Game Info and Controls */}
            <div className="flex-shrink-0 w-full lg:w-80">
              <div className="bg-gray-800 rounded-lg p-4 space-y-4">
                {/* Game Metadata */}
                <GameInfo game={selectedGame} />

                {/* Move List */}
                <MoveList
                  moves={moveHistory}
                  currentMoveIndex={currentMoveIndex}
                  onMoveClick={goToMove}
                  getMoveClassification={getMoveClassification}
                  getMoveColor={getMoveColor}
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
