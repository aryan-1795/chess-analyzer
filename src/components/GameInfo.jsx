function GameInfo({ game }) {
  if (!game) return null

  const whitePlayer = game.white?.username || 'Unknown'
  const blackPlayer = game.black?.username || 'Unknown'
  const result = game.white?.result || '-'
  const timeControl = game.time_control || 'N/A'
  const endTime = game.end_time ? new Date(game.end_time * 1000).toLocaleString() : 'N/A'

  return (
    <div className="border-b border-gray-700 pb-4">
      <h3 className="text-lg font-semibold mb-2">Game Information</h3>
      <div className="space-y-2 text-sm">
        <div>
          <span className="text-gray-400">White:</span>{' '}
          <span className="font-semibold">{whitePlayer}</span>
        </div>
        <div>
          <span className="text-gray-400">Black:</span>{' '}
          <span className="font-semibold">{blackPlayer}</span>
        </div>
        <div>
          <span className="text-gray-400">Result:</span>{' '}
          <span className="font-semibold">{result}</span>
        </div>
        <div>
          <span className="text-gray-400">Time Control:</span>{' '}
          <span>{timeControl}</span>
        </div>
        <div>
          <span className="text-gray-400">Date:</span>{' '}
          <span>{endTime}</span>
        </div>
      </div>
    </div>
  )
}

export default GameInfo
