import React from 'react'

function FeedbackPanel({ currentMove, reviewData, isAnalyzing }) {
  if (!currentMove && !reviewData) return <div className="text-gray-500 text-sm mt-4">Make moves to start analysis.</div>

  const moveIndex = currentMove?.index
  const moveData = reviewData?.moves[moveIndex]

  if (!moveData) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg mt-4 border border-gray-700">
        <h3 className="text-lg font-bold text-gray-300">Analysis</h3>
        <p className="text-gray-400 text-sm">{isAnalyzing ? "Engine is thinking..." : "No analysis yet."}</p>
      </div>
    )
  }

  const getColors = (type) => {
    switch(type) {
      case 'Brilliant': return 'text-teal-400 border-teal-500/50 bg-teal-900/20'
      case 'Great': return 'text-blue-400 border-blue-500/50 bg-blue-900/20'
      case 'Best': return 'text-green-400 border-green-500/50 bg-green-900/20'
      case 'Mistake': return 'text-orange-400 border-orange-500/50 bg-orange-900/20'
      case 'Blunder': return 'text-red-400 border-red-500/50 bg-red-900/20'
      default: return 'text-gray-300 border-gray-500 bg-gray-800'
    }
  }

  return (
    <div className={`mt-4 p-4 rounded-lg border-l-4 ${getColors(moveData.classification)}`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className="text-xs uppercase font-bold opacity-75">{moveData.classification}</span>
          <h3 className="text-xl font-bold">{moveData.move}</h3>
        </div>
      </div>
      <p className="text-sm mb-3 font-medium opacity-90">{moveData.comment}</p>
      {moveData.bestMove && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="text-xs text-gray-400 mb-1">BEST MOVE</div>
          <span className="font-mono text-green-400 font-bold">{moveData.bestMove}</span>
        </div>
      )}
    </div>
  )
}

export default FeedbackPanel