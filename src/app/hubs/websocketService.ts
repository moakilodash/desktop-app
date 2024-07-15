import { Store } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { selectDefaultLspUrl } from '../../slices/settings/settings.slice';
import { pairsSliceActions } from '../../slices/makerApi/pairs.slice';
import { v4 as uuidv4 } from 'uuid';

type Listener<T> = (data: T) => void;

export class WebSocketService {
  private static instance: WebSocketService | null = null;
  private ws: WebSocket | null = null;
  private listeners: { [action: string]: Listener<any>[] } = {};
  private reconnectInterval = 5000;
  private maxRetries = 10;
  private retryCount = 0;
  private store: Store<RootState> | null = null;
  private clientId = uuidv4();
  private unsubscribe: (() => void) | null = null;
  private isManualClose = false;
  private wsUrl: string | null = null;

  private constructor() {}

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  public initializeStore(store: Store<RootState>) {
    if (!store || typeof store.getState !== 'function' || typeof store.subscribe !== 'function') {
      console.error('Invalid store object provided to WebSocketService');
      return;
    }
    this.store = store;
    this.initializeStoreSubscription();
  }

  private initializeStoreSubscription() {
    if (!this.store) {
      console.error('Store not initialized in WebSocketService');
      return;
    }

    if (this.unsubscribe) {
      this.unsubscribe();
    }

    try {
      this.unsubscribe = this.store.subscribe(() => {
        const state = this.store!.getState();
        const newUrl = selectDefaultLspUrl(state);
        if (newUrl && newUrl !== this.wsUrl) {
          this.wsUrl = newUrl;
          this.connect();
        }
      });

      const initialState = this.store.getState();
      const initialUrl = selectDefaultLspUrl(initialState);
      if (initialUrl) {
        this.wsUrl = initialUrl;
        this.connect();
      } else {
        console.warn('No initial URL available for WebSocket connection');
      }
    } catch (error) {
      console.error('Error in initializeStoreSubscription:', error);
    }
  }

  private getWebSocketUrl(baseUrl: string): string {
    if (!baseUrl) {
      return '';
    }
    const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    return `${normalizedBaseUrl}api/v1/market/ws/${this.clientId}`;
  }

  private connect() {
    if (!this.wsUrl) {
      console.error('WebSocket URL is not set');
      return;
    }

    this.isManualClose = false;
    if (this.ws) {
      this.ws.close();
    }

    const fullUrl = this.getWebSocketUrl(this.wsUrl);
    this.ws = new WebSocket(fullUrl);

    this.ws.onopen = this.handleOpen.bind(this);
    this.ws.onmessage = this.handleMessage.bind(this);
    this.ws.onclose = this.handleClose.bind(this);
    this.ws.onerror = this.handleError.bind(this);
    console.log(`Connecting to WebSocket at ${fullUrl}`);
  }

  private handleOpen() {
    console.log("WebSocket connected");
    this.retryCount = 0;
    if (this.store) {
      const state = this.store.getState();
      const activePairs = state.pairs.feed;
      // Object.entries(activePairs).forEach(([pair, feed]) => {
      //   this.sendMessage('SubscribePairPriceChannel', {
      //     action: 'subscribe',
      //     pair,
      //     size: feed?.size,
      //   });
      // });
    }
  }

  private handleMessage(event: MessageEvent) {
    try {
      const message = JSON.parse(event.data);
      if (message.action === 'priceUpdate' && this.store) {
        this.store.dispatch(pairsSliceActions.updatePrice(message.data));
      }
      const listeners = this.listeners[message.action];
      if (listeners) {
        listeners.forEach((callback) => callback(message.data));
      }
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  }

  private handleClose() {
    console.log("WebSocket disconnected.");
    if (!this.isManualClose && this.retryCount < this.maxRetries) {
      console.log("Attempting to reconnect...");
      setTimeout(() => {
        this.connect();
      }, this.reconnectInterval);
      this.retryCount++;
    } else if (this.retryCount >= this.maxRetries) {
      console.error("Max reconnect attempts reached");
    }
  }

  private handleError(event: Event) {
    console.error("WebSocket error:", event);
  }

  public close() {
    this.isManualClose = true;
    if (this.ws) {
      this.ws.close();
    }
  }

  public sendMessage(channel: string, data: { action: string; [key: string]: any }) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ channel, data }));
    } else {
      console.warn("WebSocket is not open. Message not sent.");
    }
  }

  public addListener<T>(action: string, callback: Listener<T>): void {
    if (!this.listeners[action]) {
      this.listeners[action] = [];
    }
    this.listeners[action].push(callback);
  }

  public removeListener<T>(action: string, callback: Listener<T>): void {
    const listeners = this.listeners[action];
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  public getClientId(): string {
    return this.clientId;
  }
}
