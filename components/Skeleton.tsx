// Reusable skeleton loading components for Agent Bay dashboard

interface SkeletonBlockProps {
  className?: string
  width?: string
  height?: string
}

export function SkeletonBlock({ className = '', width, height }: SkeletonBlockProps) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-[#1a2035] ${className}`}
      style={{ width, height }}
    />
  )
}

interface SkeletonTextProps {
  className?: string
  width?: string
}

export function SkeletonText({ className = '', width = '100%' }: SkeletonTextProps) {
  return (
    <div
      className={`animate-pulse rounded bg-[#1a2035] h-3 ${className}`}
      style={{ width }}
    />
  )
}

interface SkeletonCardProps {
  lines?: number
  className?: string
}

export function SkeletonCard({ lines = 3, className = '' }: SkeletonCardProps) {
  const widths = ['75%', '100%', '60%', '85%', '50%']
  return (
    <div
      className={`p-4 rounded-xl border border-[#21262d] bg-[#161b22] flex flex-col gap-3 ${className}`}
    >
      {/* Title line — shorter */}
      <SkeletonBlock className="h-4 rounded" width="45%" />
      {/* Value line — taller, looks like a number */}
      <SkeletonBlock className="h-8 rounded" width="55%" />
      {/* Body text lines */}
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonText key={i} width={widths[i % widths.length]} />
      ))}
    </div>
  )
}
