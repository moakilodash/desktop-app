import React from 'react'

interface SpinnerProps {
  size?: number | 'sm' | 'md' | 'lg' | 'xl' | 'full'
  color?: string
  thickness?: number
  speed?: 'slow' | 'normal' | 'fast'
  overlay?: boolean
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'xl',
  color = '#8FD5EA',
  thickness = 4,
  speed = 'normal',
  overlay = false,
}) => {
  const sizeMap = {
    full: Math.min(window.innerWidth, window.innerHeight) * 0.5,
    lg: 48,
    md: 32,
    sm: 24,
    xl: 64,
  }

  const speedMap = {
    fast: '0.5s',
    normal: '1s',
    slow: '1.5s',
  }

  const dimensions = typeof size === 'number' ? size : sizeMap[size]
  const animationDuration = speedMap[speed]

  const spinnerSvg = (
    <svg
      className="animate-spin"
      height={dimensions}
      viewBox="0 0 50 50"
      width={dimensions}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        className="opacity-25"
        cx="25"
        cy="25"
        fill="none"
        r="20"
        stroke={color}
        strokeWidth={thickness}
      />
      <circle
        className="opacity-75"
        cx="25"
        cy="25"
        fill="none"
        r="20"
        stroke={color}
        strokeDasharray="80"
        strokeDashoffset="60"
        strokeWidth={thickness}
      >
        <animateTransform
          attributeName="transform"
          dur={animationDuration}
          from="0 25 25"
          repeatCount="indefinite"
          to="360 25 25"
          type="rotate"
        />
      </circle>
    </svg>
  )

  if (overlay) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        {spinnerSvg}
      </div>
    )
  }

  return spinnerSvg
}
