interface WorkloadBarProps {
  agentId: string
  agentName: string
  currentQueue: number
  maxCapacity: number
  status: 'idle' | 'working' | 'error'
}

export default function WorkloadBar({ 
  agentId, 
  agentName, 
  currentQueue, 
  maxCapacity, 
  status 
}: WorkloadBarProps) {
  const percentage = Math.min((currentQueue / maxCapacity) * 100, 100)
  const estimatedHours = ((currentQueue * 15) / 60).toFixed(1)
  
  // Color coding: Green (<50%), Yellow (50-80%), Red (>80%)
  const getColor = () => {
    if (percentage < 50) return '#10b981' // green
    if (percentage < 80) return '#f59e0b' // yellow
    return '#ef4444' // red
  }
  
  const getBgColor = () => {
    if (percentage < 50) return 'rgba(16, 185, 129, 0.1)'
    if (percentage < 80) return 'rgba(245, 158, 11, 0.1)'
    return 'rgba(239, 68, 68, 0.1)'
  }

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-xs mb-1">
        <span style={{ color: 'var(--text-secondary)' }}>Workload</span>
        <span style={{ color: 'var(--text-secondary)' }}>
          {currentQueue}/{maxCapacity} tasks
        </span>
      </div>
      
      {/* Progress bar */}
      <div 
        className="relative h-2 rounded-full overflow-hidden transition-all duration-300"
        style={{ background: getBgColor() }}
      >
        <div
          className="h-full transition-all duration-500 ease-out rounded-full"
          style={{
            width: `${percentage}%`,
            background: getColor(),
          }}
        />
      </div>
      
      {/* Tooltip info */}
      {currentQueue > 0 && (
        <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          Est. {estimatedHours}h to complete
        </div>
      )}
    </div>
  )
}
