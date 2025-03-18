import { Dispatch } from '@reduxjs/toolkit'
import { toast } from 'react-toastify'

import {
  setWsConnected,
  subscribeToPair,
  unsubscribeFromPair,
  updatePrice,
} from '../../slices/makerApi/pairs.slice'
import { logger } from '../../utils/logger'

/**
 * Centralized WebSocket service that manages a single connection to the maker
 * and handles subscription management, heartbeat, reconnection, etc.
 */
class WebSocketService {
  private static instance: WebSocketService
  private socket: WebSocket | null = null
  private url: string = ''
  private clientId: string = ''
  private dispatch: Dispatch | null = null
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 5
  private reconnectInterval: number = 5000
  private subscribedPairs: Set<string> = new Set()
  private isReconnecting: boolean = false
  private heartbeatInterval: number | null = null
  private lastHeartbeatResponse: number = 0
  private heartbeatTimeout: number = 10000

  // Track if a connection has been initialized to prevent multiple connections
  public connectionInitialized: boolean = false

  // Connection diagnostics
  private connectionStartTime: number = 0
  private lastSuccessfulConnection: number = 0
  private connectionAttempts: number = 0

  private constructor() {
    logger.info('WebSocketService instance created')
  }

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService()
    }
    return WebSocketService.instance
  }

  /**
   * Initialize the WebSocket connection with a URL, client ID, and dispatch
   *
   * @param url Base URL of the maker service
   * @param clientId Unique client identifier
   * @param dispatch Redux dispatch function
   */
  public init(url: string, clientId: string, dispatch: Dispatch): boolean {
    // Skip if URL is not provided
    if (!url) {
      logger.error('WebSocketService init: No URL provided')
      return false
    }

    // Skip if already connected to the same URL
    const cleanUrl = url.replace(/\/+$/, '')
    if (
      this.connectionInitialized &&
      this.url === cleanUrl &&
      this.isConnected()
    ) {
      logger.info(
        'WebSocketService: Already connected to the same URL, skipping initialization'
      )
      return true
    }

    // Close any existing connection to a different URL
    if (this.url !== cleanUrl && this.socket) {
      logger.info(
        `WebSocketService: Switching URL from ${this.url} to ${cleanUrl}`
      )
      this.close()
    }

    // Set up connection parameters
    this.url = cleanUrl
    this.clientId = clientId
    this.dispatch = dispatch
    this.connectionInitialized = true
    this.connectionAttempts++

    // Start connection
    logger.info(`WebSocketService: Initializing connection to ${cleanUrl}`)
    return this.connect()
  }

  /**
   * Updates the WebSocket URL and reconnects if necessary
   *
   * @param url New URL to connect to
   */
  public updateUrl(url: string): boolean {
    if (!url) {
      logger.error('WebSocketService updateUrl: No URL provided')
      return false
    }

    const cleanUrl = url.replace(/\/+$/, '')
    if (this.url !== cleanUrl) {
      logger.info(
        `WebSocketService: Updating URL from ${this.url} to ${cleanUrl}`
      )
      this.url = cleanUrl
      this.reconnectAttempts = 0

      if (this.socket) {
        this.close()
        return this.connect()
      }
    }

    return this.isConnected()
  }

  /**
   * Internal method to establish WebSocket connection
   */
  private connect(): boolean {
    if (!this.url || !this.clientId) {
      logger.error('WebSocketService connect: URL or client ID not set')
      this.connectionInitialized = false
      return false
    }

    // Skip if connection is already in progress
    if (this.socket?.readyState === WebSocket.CONNECTING) {
      logger.info('WebSocketService: Connection already in progress')
      return true
    }

    try {
      // Format WebSocket URL
      const baseUrl = this.url.replace(/\/+$/, '')
      const wsUrl = baseUrl.replace(/^http/, 'ws')
      const fullWsUrl = `${wsUrl}/api/v1/market/ws/${this.clientId}`

      // Track connection start time
      this.connectionStartTime = Date.now()
      logger.info(`WebSocketService: Connecting to ${fullWsUrl}`)

      // Create new WebSocket
      this.socket = new WebSocket(fullWsUrl)

      // Set up event handlers
      this.socket.onopen = this.handleOpen.bind(this)
      this.socket.onmessage = this.handleMessage.bind(this)
      this.socket.onclose = this.handleClose.bind(this)
      this.socket.onerror = this.handleError.bind(this)

      return true
    } catch (error) {
      logger.error('WebSocketService connect: Error creating WebSocket', error)
      this.connectionInitialized = false
      return false
    }
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    const connectionTime = Date.now() - this.connectionStartTime
    this.lastSuccessfulConnection = Date.now()

    logger.info(`WebSocketService: Connected in ${connectionTime}ms`)

    if (this.dispatch) {
      this.dispatch(setWsConnected(true))
    }

    this.reconnectAttempts = 0
    this.resubscribeAll()
    this.startHeartbeat()

    // Only show toast if not reconnecting automatically
    if (!this.isReconnecting) {
      toast.success('Connected to maker')
    }
  }

  /**
   * Handle WebSocket message event
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data)

      if (data.action === 'price_update') {
        if (this.dispatch) {
          this.dispatch(updatePrice(data.data))
        }
        this.lastHeartbeatResponse = Date.now()
      } else if (data.action === 'heartbeat') {
        this.lastHeartbeatResponse = Date.now()
        // Send a heartbeat response with the same action name
        // The server expects 'heartbeat', not 'heartbeat_ack'
        if (this.socket?.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({ action: 'heartbeat' }))
        }
      } else if (data.action === 'subscribed') {
        logger.info(`WebSocketService: Successfully subscribed to ${data.pair}`)
      } else if (data.error) {
        logger.error(`WebSocketService: Server reported error: ${data.error}`)
      }
    } catch (error) {
      logger.error(
        'WebSocketService handleMessage: Error parsing message',
        error
      )
    }
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    logger.info(
      `WebSocketService: Disconnected with code ${event.code}, reason: ${event.reason}`
    )

    if (this.dispatch) {
      this.dispatch(setWsConnected(false))
    }

    this.stopHeartbeat()

    if (!event.wasClean) {
      this.handleReconnect()
    } else {
      // Only mark as not initialized on clean close
      this.connectionInitialized = false
    }
  }

  /**
   * Handle WebSocket error event
   */
  private handleError(event: Event): void {
    logger.error('WebSocketService: WebSocket error', event)

    // Don't close the connection on error, just log it
    // Instead, try to check the connection status
    this.checkConnection()

    // Notify the user about the connection issue
    toast.warning('Connection issue detected. Attempting to recover...', {
      autoClose: 5000,
      toastId: 'websocket-error',
    })
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.stopHeartbeat()

    this.lastHeartbeatResponse = Date.now()

    this.heartbeatInterval = window.setInterval(() => {
      // Check if we're still connected
      if (this.socket?.readyState !== WebSocket.OPEN) {
        logger.warn('WebSocketService: Socket not open during heartbeat check')
        return
      }

      // Send heartbeat
      try {
        this.socket.send(JSON.stringify({ action: 'heartbeat' }))
      } catch (err) {
        logger.error('WebSocketService: Failed to send heartbeat', err)
      }

      // Check for heartbeat timeout
      const now = Date.now()
      const elapsed = now - this.lastHeartbeatResponse

      if (elapsed > this.heartbeatTimeout) {
        logger.warn(
          `WebSocketService: Heartbeat timeout (${elapsed}ms) - attempting recovery`
        )

        // Instead of closing and forcing reconnect, try to send a heartbeat first
        try {
          this.socket.send(JSON.stringify({ action: 'heartbeat' }))

          // Give it one more chance before trying to reconnect
          setTimeout(() => {
            const newElapsed = Date.now() - this.lastHeartbeatResponse
            if (newElapsed > this.heartbeatTimeout) {
              logger.warn(
                'WebSocketService: Recovery heartbeat failed, reconnecting'
              )
              this.checkConnection()
            }
          }, 2000)
        } catch (err) {
          // If sending fails, then try to reconnect
          logger.error(
            'WebSocketService: Failed to send recovery heartbeat',
            err
          )
          this.checkConnection()
        }
      }
    }, 5000)
  }

  /**
   * Stop the heartbeat interval
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
      logger.debug('WebSocketService: Heartbeat stopped')
    }
  }

  /**
   * Check connection status and reconnect if needed
   */
  private checkConnection(): void {
    if (
      !this.socket ||
      this.socket.readyState === WebSocket.CLOSED ||
      this.socket.readyState === WebSocket.CLOSING
    ) {
      logger.info(
        'WebSocketService: Connection check - Socket is closed or closing'
      )
      this.handleReconnect()
    } else if (this.socket.readyState === WebSocket.CONNECTING) {
      logger.info('WebSocketService: Connection check - Socket is connecting')
      // Wait for the connection to finish
    } else {
      // Socket is OPEN, try sending a ping
      try {
        this.socket.send(JSON.stringify({ action: 'ping' }))
        logger.info(
          'WebSocketService: Connection check - Socket is open, ping sent'
        )
      } catch (err) {
        logger.error(
          'WebSocketService: Connection check - Failed to send ping',
          err
        )
        this.handleReconnect()
      }
    }
  }

  /**
   * Handle reconnection logic with exponential backoff
   */
  private handleReconnect(): void {
    if (this.isReconnecting) {
      logger.info('WebSocketService: Already attempting to reconnect')
      return
    }

    this.isReconnecting = true

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.warn(
        `WebSocketService: Maximum reconnect attempts (${this.maxReconnectAttempts}) reached`
      )

      // Set wsConnected to false but don't give up - keep the connectionInitialized flag
      // so users can manually retry
      if (this.dispatch) {
        this.dispatch(setWsConnected(false))
      }

      // Show a toast to the user
      toast.error(
        'Could not establish a stable connection. Please try refreshing the connection.',
        {
          autoClose: false,
          toastId: 'websocket-max-reconnects', // Keep it visible until user dismisses
        }
      )

      this.isReconnecting = false
      return
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts),
      30000 // Cap at 30 seconds
    )

    logger.info(
      `WebSocketService: Reconnecting in ${delay}ms (attempt ${
        this.reconnectAttempts + 1
      } of ${this.maxReconnectAttempts})`
    )

    setTimeout(() => {
      // Double check we still need to reconnect
      if (this.isConnected()) {
        logger.info('WebSocketService: Already reconnected, skipping')
        this.isReconnecting = false
        return
      }

      this.reconnectAttempts++
      this.socket = null // Clean up the old socket
      this.isReconnecting = false

      if (this.reconnectAttempts === 1) {
        // Only show the first reconnect toast
        toast.info('Attempting to reconnect...', {
          autoClose: 5000,
          toastId: 'websocket-reconnecting',
        })
      }

      this.connect()
    }, delay)
  }

  /**
   * Subscribe to a trading pair
   *
   * @param pair Trading pair to subscribe to (e.g. BTC/USD)
   */
  public subscribeToPair(pair: string): void {
    if (!pair) {
      logger.error('WebSocketService subscribeToPair: No pair provided')
      return
    }

    this.subscribedPairs.add(pair)

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ action: 'subscribe', pair }))

      if (this.dispatch) {
        this.dispatch(subscribeToPair(pair))
      }

      logger.info(`WebSocketService: Subscribed to ${pair}`)
    } else {
      logger.info(
        `WebSocketService: Socket not ready, ${pair} will be subscribed upon reconnection`
      )
    }
  }

  /**
   * Unsubscribe from a trading pair
   *
   * @param pair Trading pair to unsubscribe from
   */
  public unsubscribeFromPair(pair: string): void {
    if (!pair) return

    this.subscribedPairs.delete(pair)

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ action: 'unsubscribe', pair }))

      if (this.dispatch) {
        this.dispatch(unsubscribeFromPair(pair))
      }

      logger.info(`WebSocketService: Unsubscribed from ${pair}`)
    }
  }

  /**
   * Resubscribe to all previously subscribed pairs
   */
  private resubscribeAll(): void {
    if (this.subscribedPairs.size > 0) {
      this.subscribedPairs.forEach((pair) => {
        if (this.socket?.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({ action: 'subscribe', pair }))

          if (this.dispatch) {
            this.dispatch(subscribeToPair(pair))
          }
        }
      })

      logger.info(
        `WebSocketService: Resubscribed to ${this.subscribedPairs.size} pairs`
      )
    }
  }

  /**
   * Close the WebSocket connection
   */
  public close(): void {
    logger.info('WebSocketService: Closing connection')
    this.stopHeartbeat()

    if (this.socket) {
      // Only unsubscribe if the socket is open
      if (this.socket.readyState === WebSocket.OPEN) {
        // Unsubscribe from all pairs before closing
        this.subscribedPairs.forEach((pair) => {
          try {
            this.socket?.send(JSON.stringify({ action: 'unsubscribe', pair }))
            logger.debug(
              `WebSocketService: Unsubscribed from ${pair} before closing`
            )
          } catch (e) {
            // Ignore errors when unsubscribing during close
          }
        })

        // Try to send a disconnect message
        try {
          this.socket.send(JSON.stringify({ action: 'disconnect' }))
        } catch (e) {
          // Ignore errors when sending disconnect
        }
      }

      try {
        // Use clean close code
        this.socket.close(1000, 'Normal closure')
      } catch (e) {
        logger.error('WebSocketService close: Error closing WebSocket', e)
      }

      this.socket = null
      this.subscribedPairs.clear()
      this.connectionInitialized = false

      // Update connection status in Redux if dispatch is available
      if (this.dispatch) {
        this.dispatch(setWsConnected(false))
      }
    }
  }

  /**
   * Check if the WebSocket is currently connected
   */
  public isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN
  }

  /**
   * Get the current URL the WebSocket is connected to
   */
  public getCurrentUrl(): string {
    return this.url
  }

  /**
   * Force a reconnection to the WebSocket server
   */
  public reconnect(): boolean {
    logger.info('WebSocketService: Manual reconnection requested')

    if (this.url && this.clientId && this.dispatch) {
      this.reconnectAttempts = 0
      this.isReconnecting = false
      this.close()

      // Short delay before reconnecting
      setTimeout(() => {
        this.connectionInitialized = true
        this.connect()
      }, 100)

      return true
    }

    logger.error(
      'WebSocketService reconnect: Missing required connection parameters'
    )
    return false
  }

  /**
   * Get connection diagnostic information
   */
  public getDiagnostics(): any {
    return {
      connectionAttempts: this.connectionAttempts,
      connectionInitialized: this.connectionInitialized,
      isConnected: this.isConnected(),
      lastHeartbeat: this.lastHeartbeatResponse
        ? new Date(this.lastHeartbeatResponse).toISOString()
        : null,
      lastSuccessfulConnection: this.lastSuccessfulConnection
        ? new Date(this.lastSuccessfulConnection).toISOString()
        : null,
      reconnectAttempts: this.reconnectAttempts,
      subscribedPairs: Array.from(this.subscribedPairs),
      url: this.url,
    }
  }
}

// Export a singleton instance
export const webSocketService = WebSocketService.getInstance()
