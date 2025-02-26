import React, { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  title?: string | ReactNode
  titleClassName?: string
  action?: ReactNode
  footer?: ReactNode
  noPadding?: boolean
}

/**
 * A standard card component with consistent styling
 */
export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  titleClassName = '',
  action,
  footer,
  noPadding = false,
}) => {
  return (
    <div
      className={`bg-slate-800/50 rounded-xl border border-slate-700 ${
        noPadding ? '' : 'p-6'
      } ${className}`}
    >
      {(title || action) && (
        <div className="flex justify-between items-center mb-6">
          {title && (
            <h2 className={`text-xl font-bold text-white ${titleClassName}`}>
              {title}
            </h2>
          )}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
      {footer && <div className="mt-6">{footer}</div>}
    </div>
  )
}

/**
 * A card with hover effects
 */
export const HoverCard: React.FC<CardProps> = (props) => {
  return (
    <Card
      {...props}
      className={`hover:bg-slate-800/70 hover:border-slate-600 transition-all duration-200 ${props.className || ''}`}
    />
  )
}
