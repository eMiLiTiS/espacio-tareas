import { cn } from '@/utils/cn'

interface BadgeProps {
  variant?: 'default' | 'success' | 'warn' | 'danger' | 'neutral'
  className?: string
  children: React.ReactNode
}

const variants = {
  default: 'bg-brand-100 text-brand-700',
  success: 'bg-accent-100 text-accent-700',
  warn: 'bg-warn-50 text-warn-600',
  danger: 'bg-danger-50 text-danger-600',
  neutral: 'bg-brand-100 text-brand-500',
}

export function Badge({ variant = 'default', className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
