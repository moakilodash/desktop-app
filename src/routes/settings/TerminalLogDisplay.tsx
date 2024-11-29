import { CSSProperties, useEffect, useRef } from 'react'

const parseAnsi = (log: string) => {
  const segments = []
  const ansiRegex = /\x1b\[([\d;]*?)m/g
  let lastIndex = 0

  // Color and style mapping
  const colorMap: any = {
    '30': '#666666', // Bright Black
    '31': '#FF6B6B', // Bright Red
    '32': '#69FF94', // Bright Green
    '33': '#FFFF6B', // Bright Yellow
    '34': '#6B6BFF', // Bright Blue
    '35': '#FF6BFF', // Bright Magenta
    '36': '#6BFFFF', // Bright Cyan
    '37': '#FFFFFF', // Bright White
    '90': '#666666', // Dark Gray
    '91': '#FF4136', // Red
    '92': '#2ECC40', // Green
    '93': '#FFDC00', // Yellow
    '94': '#0074D9', // Blue
    '95': '#B10DC9', // Magenta
    '96': '#7FDBFF', // Cyan
    '97': '#F1F3F5', // Light Gray
  }

  // Reset styles between ANSI code matches
  let currentStyle: CSSProperties = {}

  // Iterate through ANSI codes
  let match
  while ((match = ansiRegex.exec(log)) !== null) {
    const codes = match[1].split(';')

    // Add text before this match
    if (match.index > lastIndex) {
      segments.push({
        ...currentStyle,
        text: log.slice(lastIndex, match.index),
      })
    }

    // Process style codes
    codes.forEach((code) => {
      switch (code) {
        case '0': // Reset
          currentStyle = {}
          break
        case '1': // Bold
          currentStyle.fontWeight = 'bold'
          break
        case '3': // Italic
          currentStyle.fontStyle = 'italic'
          break
        case '4': // Underline
          currentStyle.textDecoration = 'underline'
          break
        default:
          // Check if it's a color code
          if (colorMap[code]) {
            currentStyle.color = colorMap[code]
          }
      }
    })

    lastIndex = ansiRegex.lastIndex
  }

  // Add remaining text
  if (lastIndex < log.length) {
    segments.push({
      ...currentStyle,
      text: log.slice(lastIndex),
    })
  }

  return segments
}

const TerminalLogDisplay = ({ logs }: { logs: string[] }) => {
  const logsContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight
    }
  }, [logs]) // Scroll whenever logs update

  return (
    <div className="space-y-1 h-full overflow-y-auto" ref={logsContainerRef}>
      {logs.map((log, index) => (
        <div
          className="bg-gray-900 text-gray-300 font-mono text-sm whitespace-pre-wrap py-1 px-2 rounded hover:bg-gray-800/50 transition-colors"
          key={index}
        >
          {parseAnsi(log).map((segment, segIndex) => (
            <span
              key={segIndex}
              style={{
                color: segment.color || 'inherit',
                fontStyle: segment.fontStyle || 'normal',
                fontWeight: segment.fontWeight || 'normal',
                textDecoration: segment.textDecoration || 'none',
              }}
            >
              {segment.text}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

export { TerminalLogDisplay }
