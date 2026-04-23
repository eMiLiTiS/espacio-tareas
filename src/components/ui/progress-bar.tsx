import { cn } from '@/utils/cn'

interface ProgressBarProps {
  value: number  // 0-100
  className?: string
  color?: 'brand' | 'accent' | 'warn'
}

const colors = {
  brand: 'bg-brand-600',
  accent: 'bg-accent-500',
  warn: 'bg-warn-500',
}

export function ProgressBar({ value, className, color = 'accent' }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div className={cn('h-1.5 bg-brand-100 rounded-full overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-300', colors[color])}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
