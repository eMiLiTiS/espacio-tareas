interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      {icon && (
        <div className="text-brand-300 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-brand-700 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-brand-400 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
