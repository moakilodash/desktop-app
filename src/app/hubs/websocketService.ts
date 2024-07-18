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

  private constructor() {}

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService()
    }
    return WebSocketService.instance
  }

  public init(url: string, clientId: string, dispatch: Dispatch) {
    this.url = url
    this.clientId = clientId
    this.dispatch = dispatch
    this.connect()
  }

  private connect() {
    this.socket = new WebSocket(`${this.url}api/v1/market/ws/${this.clientId}`)

    this.socket.onopen = () => {
      console.log('WebSocket connected')
      this.dispatch && this.dispatch(setWsConnected(true))
      this.resubscribeAll()
    }

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.action === 'priceUpdate') {
        this.dispatch && this.dispatch(updatePrice(data.data))
      }
    }

    this.socket.onclose = () => {
      console.log('WebSocket disconnected')
      this.dispatch && this.dispatch(setWsConnected(false))
      setTimeout(() => this.connect(), 5000)
    }

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error)
      toast.error('WebSocket connection error')
    }
  }

  public subscribeToPair(pair: string) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ action: 'subscribe', pair }))
      this.dispatch && this.dispatch(subscribeToPair(pair))
      console.log('Subscribed to', pair)
    } else {
      console.log('Socket not ready')
    }
  }

  public unsubscribeFromPair(pair: string) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ action: 'unsubscribe', pair }))
      this.dispatch && this.dispatch(unsubscribeFromPair(pair))
      console.log('Unsubscribed from', pair)
    }
  }

  private resubscribeAll() {
    // You'll need to implement a way to get the current state here
    // This is just a placeholder
    const subscribedPairs: string[] = []
    subscribedPairs.forEach((pair) => this.subscribeToPair(pair))
  }

  public close() {
    if (this.socket) {
      this.socket.close()
    }
  }
}

export const webSocketService = WebSocketService.getInstance()
