function ReviewSummary({ summary, isAnalyzing, analysisProgress }) {
  if (!summary && !isAnalyzing) {
    return null
  }

  if (isAnalyzing) {
    return (
      <div className="border-t border-gray-700 pt-4 mt-4">
        <h3 className="text-lg font-semibold mb-2">Game Review</h3>
        <div className="space-y-2">
          <div className="text-sm text-gray-400">Analyzing game...</div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${analysisProgress}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-500">{analysisProgress}%</div>
        </div>
      </div>
    )
  }

  return (
    <div className="border-t border-gray-700 pt-4 mt-4">
      <h3 className="text-lg font-semibold mb-3">Game Review Summary</h3>
      <div className="space-y-3 text-sm">
        {/* Accuracy */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-gray-400">White Accuracy</div>
            <div className="text-xl font-bold text-white">{summary.whiteAccuracy}%</div>
          </div>
          <div>
            <div className="text-gray-400">Black Accuracy</div>
            <div className="text-xl font-bold text-white">{summary.blackAccuracy}%</div>
          </div>
        </div>

        {/* Mistakes Count */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-700">
          <div>
            <div className="text-gray-400 text-xs">Blunders</div>
            <div className="text-lg font-semibold text-red-400">{summary.blunders}</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs">Mistakes</div>
            <div className="text-lg font-semibold text-orange-400">{summary.mistakes}</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs">Inaccuracies</div>
            <div className="text-lg font-semibold text-yellow-400">{summary.inaccuracies}</div>
          </div>
        </div>

        {/* Key Moments */}
        {summary.keyMoments && summary.keyMoments.length > 0 && (
          <div className="pt-2 border-t border-gray-700">
            <div className="text-gray-400 text-xs mb-2">Key Moments</div>
            <div className="space-y-1">
              {summary.keyMoments.slice(0, 3).map((moment, idx) => (
                <div key={idx} className="text-xs bg-gray-700/50 p-2 rounded">
                  <span className="font-semibold">Move {moment.moveIndex + 1}:</span>{' '}
                  <span className="text-red-400">{moment.move}</span> - {moment.classification}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ReviewSummary
