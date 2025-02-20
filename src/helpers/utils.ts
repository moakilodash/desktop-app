import { useState, useEffect } from 'react'

import { DEFAULT_RGB_ICON, COIN_ICON_URL } from '../constants'

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

export const loadAssetIcon = async (assetTicker: string): Promise<string> => {
  try {
    const iconUrl = `${COIN_ICON_URL}${assetTicker.toLowerCase()}.png`
    const response = await fetch(iconUrl)
    if (response.ok) {
      return iconUrl
    }
    throw new Error('Icon not found')
  } catch (error) {
    console.warn(`Failed to load icon for ${assetTicker}, using default.`)
    return DEFAULT_RGB_ICON
  }
}

export const useAssetIcon = (
  ticker: string,
  defaultIcon = DEFAULT_RGB_ICON
) => {
  const [imgSrc, setImgSrc] = useState<string>('')

  useEffect(() => {
    loadAssetIcon(ticker)
      .then(setImgSrc)
      .catch(() => setImgSrc(defaultIcon))
  }, [ticker, defaultIcon])

  return [imgSrc, setImgSrc] as const
}
