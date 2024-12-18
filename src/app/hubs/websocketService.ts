import { Dispatch } from '@reduxjs/toolkit'
import { toast } from 'react-toastify'

import {
  setWsConnected,
  subscribeToPair,
  unsubscribeFromPair,
  updatePrice,
} from '../../slices/makerApi/pairs.slice'

class WebSocketService {
  private static instance: WebSocketService
  private socket: WebSocket | null = null
  private url: string = ''
  private clientId: string = ''
  private dispatch: Dispatch | null = null
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 1
  private reconnectInterval: number = 3000
  private subscribedPairs: Set<string> = new Set()
  private currentUrl: string = ''
  private isReconnecting: boolean = false

  private constructor() {}

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService()
    }
    return WebSocketService.instance
  }

  public init(url: string, clientId: string, dispatch: Dispatch) {
    const cleanUrl = url.replace(/\/+$/, '')
    if (this.url !== cleanUrl && this.socket) {
      this.close()
    }

    this.url = cleanUrl
    this.currentUrl = cleanUrl
    this.clientId = clientId
    this.dispatch = dispatch
    this.connect()
  }

  public updateUrl(url: string) {
    const cleanUrl = url.replace(/\/+$/, '')
    if (this.url !== cleanUrl) {
      console.log('Updating WebSocket URL:', cleanUrl)
      this.url = cleanUrl
      this.reconnectAttempts = 0
      if (this.socket) {
        this.close()
        this.connect()
      }
    }
  }

  private connect() {
    if (!this.url) {
      console.error('WebSocket URL not set')
      return
    }

    if (this.socket?.readyState === WebSocket.CONNECTING) {
      console.log('Connection already in progress')
      return
    }

    const baseUrl = this.url.replace(/\/+$/, '')
    const wsUrl = baseUrl.replace(/^http/, 'ws')
    this.socket = new WebSocket(`${wsUrl}/api/v1/market/ws/${this.clientId}`)

    this.socket.onopen = () => {
      console.log('WebSocket connected to:', wsUrl)
      this.dispatch && this.dispatch(setWsConnected(true))
      toast.success('Connected to maker websocket')
      this.reconnectAttempts = 0
      this.resubscribeAll()
    }

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.action === 'price_update') {
        this.dispatch && this.dispatch(updatePrice(data.data))
      }
    }

    this.socket.onclose = (event) => {
      console.log('WebSocket disconnected')
      this.dispatch && this.dispatch(setWsConnected(false))
      if (!event.wasClean) {
        this.handleReconnect()
      }
      // else {
      //   toast.warning('Disconnected from market data')
      // }
    }

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  }

  private handleReconnect() {
    if (this.isReconnecting) {
      console.log('Reconnection already in progress')
      return
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.isReconnecting = true
      this.reconnectAttempts++
      setTimeout(() => {
        this.connect()
        this.isReconnecting = false
      }, this.reconnectInterval)
    } else {
      toast.error(
        'Failed to connect to maker websocket. Please check your connection and refresh the page.'
      )
    }
  }

  public subscribeToPair(pair: string) {
    this.subscribedPairs.add(pair)
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ action: 'subscribe', pair }))
      this.dispatch && this.dispatch(subscribeToPair(pair))
      console.log('Subscribed to', pair)
    } else {
      console.log('Socket not ready, pair will be subscribed upon reconnection')
    }
  }

  public unsubscribeFromPair(pair: string) {
    this.subscribedPairs.delete(pair)
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ action: 'unsubscribe', pair }))
      this.dispatch && this.dispatch(unsubscribeFromPair(pair))
      console.log('Unsubscribed from', pair)
    }
  }

  private resubscribeAll() {
    this.subscribedPairs.forEach((pair) => {
      this.socket?.send(JSON.stringify({ action: 'subscribe', pair }))
      this.dispatch && this.dispatch(subscribeToPair(pair))
    })
    console.log('Resubscribed to all pairs')
  }

  public close() {
    if (this.socket) {
      this.socket.close()
      this.socket = null
      this.subscribedPairs.clear()
      this.currentUrl = ''
    }
  }

  public isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN
  }

  public getCurrentUrl(): string {
    return this.currentUrl
  }

  public reconnect() {
    if (this.url && this.clientId && this.dispatch) {
      this.reconnectAttempts = 0
      this.isReconnecting = false
      this.close()
      this.connect()
    }
  }
}

export const webSocketService = WebSocketService.getInstance()
