function MoveList({ moves, currentMoveIndex, onMoveClick, getMoveClassification, getMoveColor }) {
  // Group moves into pairs (White, Black)
  const movePairs = []
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      moveNumber: Math.floor(i / 2) + 1,
      whiteMove: moves[i],
      blackMove: moves[i + 1] || null
    })
  }

  const getMoveClass = (moveIndex) => {
    if (moveIndex === currentMoveIndex) {
      return 'bg-blue-600 text-white font-semibold'
    }
    const classification = getMoveClassification(moveIndex)
    if (classification === 'Blunder') {
      return 'bg-red-900/50 hover:bg-red-800/50 border-l-2 border-red-500'
    } else if (classification === 'Mistake') {
      return 'bg-orange-900/50 hover:bg-orange-800/50 border-l-2 border-orange-500'
    }
    return 'bg-gray-700 hover:bg-gray-600'
  }

  const getMoveTitle = (moveIndex) => {
    const classification = getMoveClassification(moveIndex)
    if (classification === 'Blunder') return 'Blunder'
    if (classification === 'Mistake') return 'Mistake'
    return null
  }

  return (
    <div className="border-b border-gray-700 pb-4">
      <h3 className="text-lg font-semibold mb-2">Moves</h3>
      <div className="max-h-64 overflow-y-auto space-y-1">
        {movePairs.map((pair) => (
          <div key={pair.moveNumber} className="flex gap-1">
            <span className="text-gray-500 w-8 text-sm flex-shrink-0">{pair.moveNumber}.</span>
            <button
              onClick={() => onMoveClick(pair.whiteMove.index)}
              className={`flex-1 px-2 py-1 rounded text-sm text-left transition-colors ${getMoveClass(pair.whiteMove.index)}`}
              title={getMoveTitle(pair.whiteMove.index)}
            >
              {pair.whiteMove.move}
            </button>
            {pair.blackMove && (
              <button
                onClick={() => onMoveClick(pair.blackMove.index)}
                className={`flex-1 px-2 py-1 rounded text-sm text-left transition-colors ${getMoveClass(pair.blackMove.index)}`}
                title={getMoveTitle(pair.blackMove.index)}
              >
                {pair.blackMove.move}
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-red-900/50 border-l-2 border-red-500"></span>
          <span>Blunder</span>
          <span className="w-3 h-3 bg-orange-900/50 border-l-2 border-orange-500 ml-4"></span>
          <span>Mistake</span>
        </div>
      </div>
    </div>
  )
}

export default MoveList
