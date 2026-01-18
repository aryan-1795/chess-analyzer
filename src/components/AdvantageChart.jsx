import { ComposedChart, Area, Line, XAxis, YAxis, ReferenceLine, ResponsiveContainer, Tooltip } from 'recharts'

function AdvantageChart({ moves }) {
  if (!moves || moves.length === 0) {
    return null
  }

  // Prepare data for the chart
  // Include starting position (move 0) and each move
  const chartData = [
    { move: 0, evaluation: 0, positive: 0, negative: 0 } // Starting position
  ]

  moves.forEach((move, index) => {
    // Cap evaluation between -10 and +10 for display
    const cappedEval = Math.max(-10, Math.min(10, move.evalAfter || 0))
    chartData.push({
      move: index + 1,
      evaluation: cappedEval,
      positive: cappedEval > 0 ? cappedEval : 0,
      negative: cappedEval < 0 ? cappedEval : 0
    })
  })

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      // Get the payload data - prefer evaluation from Line, otherwise use first available
      const data = payload.find(p => p.dataKey === 'evaluation')?.payload || 
                   payload.find(p => p.dataKey === 'positive' || p.dataKey === 'negative')?.payload || 
                   payload[0].payload
      const evalValue = data.evaluation
      const evalText = evalValue > 0 
        ? `+${evalValue.toFixed(2)}` 
        : evalValue.toFixed(2)
      
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-2 shadow-lg">
          <p className="text-white text-sm">
            <span className="text-gray-400">Move {data.move}:</span>{' '}
            <span className={evalValue > 0 ? 'text-white' : evalValue < 0 ? 'text-gray-300' : 'text-gray-400'}>
              {evalText}
            </span>
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="w-full mt-4">
      <h3 className="text-lg font-semibold mb-2">Advantage Chart</h3>
      <div className="bg-gray-800 rounded-lg p-4">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
          >
            <defs>
              {/* Gradient for positive values (white/light) */}
              <linearGradient id="colorPositive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ffffff" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#ffffff" stopOpacity={0.1}/>
              </linearGradient>
              {/* Gradient for negative values (gray/black) */}
              <linearGradient id="colorNegative" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4b5563" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#1f2937" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="move" 
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              label={{ value: 'Move', position: 'insideBottom', offset: -5, fill: '#9ca3af' }}
            />
            <YAxis 
              domain={[-10, 10]}
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              label={{ value: 'Evaluation', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="3 3" />
            
            {/* Positive area (white) - only shows above zero */}
            <Area
              type="monotone"
              dataKey="positive"
              stroke="none"
              fill="url(#colorPositive)"
              fillOpacity={0.6}
              isAnimationActive={true}
            />
            
            {/* Negative area (gray/black) - only shows below zero */}
            <Area
              type="monotone"
              dataKey="negative"
              stroke="none"
              fill="url(#colorNegative)"
              fillOpacity={0.6}
              isAnimationActive={true}
            />
            
            {/* Main line connecting all points - white for visibility */}
            <Line
              type="monotone"
              dataKey="evaluation"
              stroke="#e5e7eb"
              strokeWidth={2}
              dot={false}
              isAnimationActive={true}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default AdvantageChart
