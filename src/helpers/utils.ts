import { DEFAULT_RGB_ICON } from '../constants'

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
    const iconUrl = `https://raw.githubusercontent.com/alexandrebouttier/coinmarketcap-icons-cryptos/refs/heads/main/icons/${assetTicker.toLowerCase()}.png`
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
