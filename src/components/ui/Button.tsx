import { Loader } from 'lucide-react'
import React, { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'success'
  | 'outline'
  | 'ghost'
  | 'link'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  isLoading?: boolean
  fullWidth?: boolean
  className?: string
}

/**
 * Standard button component with consistent styling across the application
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  isLoading = false,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50'

  const variantStyles = {
    danger:
      'bg-red/10 hover:bg-red/20 text-red hover:text-red-light border border-red/20 hover:border-red/30',
    ghost: 'bg-transparent hover:bg-slate-700/50 text-white',
    link: 'bg-transparent text-blue-500 hover:text-blue-400 underline p-0 h-auto',
    outline:
      'bg-transparent hover:bg-slate-700/50 text-white border border-slate-600',
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-white',
    success:
      'bg-green-600/10 hover:bg-green-600/20 text-green-500 border border-green-500/20 hover:border-green-500/30',
  }

  const sizeStyles = {
    lg: 'text-base px-6 py-3 gap-2',
    md: 'text-sm px-4 py-2 gap-2',
    sm: 'text-xs px-3 py-1.5 gap-1.5',
  }

  const isDisabled = disabled || isLoading

  return (
    <button
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}
        ${className}
      `}
      disabled={isDisabled}
      {...props}
    >
      {isLoading && <Loader className="w-4 h-4 animate-spin" />}

      {!isLoading && icon && iconPosition === 'left' && (
        <span className="flex-shrink-0">{icon}</span>
      )}

      <span>{children}</span>

      {!isLoading && icon && iconPosition === 'right' && (
        <span className="flex-shrink-0">{icon}</span>
      )}
    </button>
  )
}

/**
 * Action button specifically for actions like deposit, withdraw, etc.
 */
export const ActionButton: React.FC<
  Omit<ButtonProps, 'variant'> & { color?: 'cyan' | 'red' | 'purple' | 'blue' }
> = ({ children, color = 'blue', ...props }) => {
  const colorMap = {
    blue: {
      bg: 'bg-blue-500/10',
      bgHover: 'bg-blue-500/20',
      border: 'border-blue-500/10',
      borderHover: 'border-blue-500/30',
      text: 'text-blue-500',
    },
    cyan: {
      bg: 'bg-cyan/10',
      bgHover: 'bg-cyan/20',
      border: 'border-cyan/10',
      borderHover: 'border-cyan/30',
      text: 'text-cyan',
    },
    purple: {
      bg: 'bg-purple/10',
      bgHover: 'bg-purple/20',
      border: 'border-purple/10',
      borderHover: 'border-purple/30',
      text: 'text-purple',
    },
    red: {
      bg: 'bg-red/10',
      bgHover: 'bg-red/20',
      border: 'border-red/10',
      borderHover: 'border-red/30',
      text: 'text-red',
    },
  }

  const colorStyle = colorMap[color]

  return (
    <button
      className={`
        flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-medium
        bg-blue-darker hover:bg-blue-dark transition-all duration-200
        ${colorStyle.border} hover:${colorStyle.borderHover} border
        ${props.className || ''}
      `}
      {...props}
    >
      {children}
    </button>
  )
}

/**
 * Icon button for actions with just an icon
 */
export const IconButton: React.FC<
  Omit<ButtonProps, 'children'> & { icon: ReactNode }
> = ({ icon, size = 'md', variant = 'ghost', className = '', ...props }) => {
  const sizeStyles = {
    lg: 'p-2',
    md: 'p-1.5',
    sm: 'p-1',
  }

  const variantStyles = {
    danger: 'bg-red/10 hover:bg-red/20 text-red',
    ghost: 'hover:bg-slate-700/50 text-slate-400 hover:text-white',
    link: 'text-blue-500 hover:text-blue-400',
    outline:
      'bg-transparent hover:bg-slate-700/50 text-white border border-slate-600',
    primary: 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-500',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-white',
    success: 'bg-green-600/10 hover:bg-green-600/20 text-green-500',
  }

  return (
    <button
      className={`rounded-lg transition-colors ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {icon}
    </button>
  )
}
