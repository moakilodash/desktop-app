export const formatTimeAgo = (date: Date) => {
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return `${seconds} seconds ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minutes ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hours ago`
  const days = Math.floor(hours / 24)
  return `${days} days ago`
}

export const blocksToTime = (blocks: number): string => {
  const minutes = blocks * 10
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60

  let timeString = ''
  if (days > 0) timeString += `${days} day${days > 1 ? 's' : ''}`
  if (hours > 0)
    timeString += `${timeString ? ', ' : ''}${hours} hour${hours > 1 ? 's' : ''}`
  if (mins > 0)
    timeString += `${timeString ? ', ' : ''}${mins} minute${mins > 1 ? 's' : ''}`

  return timeString || 'less than a minute'
}
