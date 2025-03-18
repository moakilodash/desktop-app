import { Dispatch } from '@reduxjs/toolkit'

import { webSocketService } from '../../../app/hubs/websocketService'
import { logger } from '../../../utils/logger'

/**
 * Initialize WebSocket connection using the WebSocketService
 * @param makerUrl The URL of the market maker
 * @param clientId Client ID, usually the node pubkey
 * @param dispatch Redux dispatch function
 * @returns Promise that resolves to a boolean indicating success
 */
export const initializeWebSocket = (
  makerUrl: string,
  clientId: string,
  dispatch: Dispatch
): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      logger.info(
        `Initializing WebSocket connection to ${makerUrl} with client ID ${clientId}`
      )

      // Use the WebSocketService to initialize the connection
      const success = webSocketService.init(makerUrl, clientId, dispatch)

      if (success) {
        logger.info('WebSocket initialization successful')
        resolve(true)
      } else {
        logger.error('WebSocket initialization failed')
        resolve(false)
      }
    } catch (error) {
      logger.error('Error initializing WebSocket:', error)
      resolve(false)
    }
  })
}

/**
 * Close the WebSocket connection
 */
export const closeWebSocket = (): void => {
  webSocketService.close()
}

/**
 * Subscribe to a trading pair's price feed
 * @param pair The trading pair to subscribe to (e.g. "BTC/USD")
 */
export const subscribeToPairFeed = (pair: string): void => {
  if (!pair) {
    logger.error('Cannot subscribe to empty pair')
    return
  }

  webSocketService.subscribeToPair(pair)
}

/**
 * Setup heartbeat for the WebSocket connection
 * This is handled automatically by the WebSocketService
 */
export const setupHeartbeat = (): void => {
  // No-op - handled by the WebSocketService
  logger.info('Heartbeat is handled automatically by the WebSocketService')
}

/**
 * Ping the server to measure latency
 * @returns Promise that resolves to the latency in milliseconds
 */
export const pingServer = async (): Promise<number> => {
  return new Promise((resolve, reject) => {
    if (!webSocketService.isConnected()) {
      reject(new Error('WebSocket not connected'))
      return
    }

    // Get connection diagnostics
    const diagnostics = webSocketService.getDiagnostics()

    // If we have a last heartbeat time, use it to estimate latency
    if (diagnostics.lastHeartbeat) {
      const lastHeartbeatTime = new Date(diagnostics.lastHeartbeat).getTime()
      const latency = Date.now() - lastHeartbeatTime
      resolve(latency)
    } else {
      reject(new Error('No recent heartbeat to measure latency'))
    }
  })
}

/**
 * Retry WebSocket connection
 * @returns Promise that resolves to a boolean indicating success
 */
export const retryConnection = async (): Promise<boolean> => {
  logger.info('Attempting to manually reconnect WebSocket')

  try {
    const reconnectResult = webSocketService.reconnect()
    return Boolean(reconnectResult)
  } catch (error) {
    logger.error('Error during manual WebSocket reconnection:', error)
    return false
  }
}
