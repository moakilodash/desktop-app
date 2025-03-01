import { useState, useEffect } from 'react'

import defaultRgbIcon from '../assets/rgb-symbol-color.svg'
import { COIN_ICON_URL } from '../constants'

export const parseRpcUrl = (url: string) => {
  try {
    const [credentials, hostPort] = url.split('@')
    const [username, password] = credentials.split(':')
    const [host, port] = hostPort.split(':')
    return { host, password, port: parseInt(port, 10), username }
  } catch {
    console.error('Error parsing RPC URL:', url)
    return {
      host: 'localhost',
      password: 'password',
      port: 18443,
      username: 'user',
    }
  }
}

export const loadAssetIcon = async (
  assetTicker: string,
  defaultIcon = defaultRgbIcon
): Promise<string> => {
  try {
    if (!assetTicker || assetTicker === 'None') {
      return defaultIcon
    }

    const iconUrl = `${COIN_ICON_URL}${assetTicker.toLowerCase()}.png`
    const response = await fetch(iconUrl)
    if (response.ok) {
      return iconUrl
    }
    throw new Error('Icon not found')
  } catch (error) {
    console.warn(`Failed to load icon for ${assetTicker}, using default.`)
    return defaultIcon
  }
}

export const useAssetIcon = (ticker: string, defaultIcon = defaultRgbIcon) => {
  const [imgSrc, setImgSrc] = useState<string>(defaultIcon)

  useEffect(() => {
    if (!ticker || ticker === 'None') {
      setImgSrc(defaultIcon)
      return
    }

    loadAssetIcon(ticker, defaultIcon)
      .then(setImgSrc)
      .catch(() => setImgSrc(defaultIcon))
  }, [ticker, defaultIcon])

  return [imgSrc, setImgSrc] as const
}
