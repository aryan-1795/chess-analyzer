function EvaluationBar({ evaluation, isAnalyzing }) {
  // Convert evaluation to percentage for bar height
  // Clamp evaluation between -10 and +10 for visualization
  const clampedEval = Math.max(-10, Math.min(10, evaluation))
  const percentage = ((clampedEval + 10) / 20) * 100

  // Determine color based on evaluation
  let barColor = 'bg-gray-500'
  if (evaluation > 1) {
    barColor = 'bg-green-500'
  } else if (evaluation < -1) {
    barColor = 'bg-red-500'
  } else {
    barColor = 'bg-blue-500'
  }

  return (
    <div className="flex flex-col items-center">
      <div className="text-sm font-semibold mb-2">Evaluation</div>
      <div className="relative w-12 h-96 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-700">
        {/* Center line */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-600 transform -translate-y-1/2 z-10"></div>
        
        {/* Evaluation bar */}
        <div
          className={`absolute bottom-0 left-0 right-0 ${barColor} transition-all duration-300 ${
            isAnalyzing ? 'opacity-70' : 'opacity-100'
          }`}
          style={{
            height: `${percentage}%`,
            transform: 'translateY(0)',
          }}
        >
          {/* White advantage indicator */}
          {evaluation > 0 && (
            <div className="absolute top-0 left-0 right-0 text-center text-xs font-bold text-white py-1">
              +{evaluation.toFixed(2)}
            </div>
          )}
          {/* Black advantage indicator */}
          {evaluation < 0 && (
            <div className="absolute bottom-0 left-0 right-0 text-center text-xs font-bold text-white py-1">
              {evaluation.toFixed(2)}
            </div>
          )}
        </div>
      </div>
      {isAnalyzing && (
        <div className="text-xs text-gray-400 mt-2">Analyzing...</div>
      )}
      <div className="text-xs text-gray-500 mt-1">
        {evaluation > 0 ? 'White' : evaluation < 0 ? 'Black' : 'Equal'}
      </div>
    </div>
  )
}

export default EvaluationBar
