import { Store } from '@reduxjs/toolkit';
import { RootState } from '../../app/store'; 
import { selectDefaultLspUrl } from '../../slices/settings/settings.slice'; 

type Listener<T> = (data: T) => void;

interface Message<T> {
  action: string;
  data: T;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private listeners: { [action: string]: Listener<any>[] } = {};
  private reconnectInterval = 5000;
  private maxRetries = 10;
  private retryCount = 0;
  private messageQueue: Message<any>[] = [];
  private currentUrl: string = "";
  private fallbackUrl: string = "ws://localhost:8000/api/v1/market"; 

  constructor(private store?: Store<RootState>) {
    if (store) {
      this.initializeStoreSubscription();
    } else {
      console.warn('Store not provided to WebSocketService. Using fallback URL.');
      this.currentUrl = this.fallbackUrl;
    }
    this.connect();
  }

  private initializeStoreSubscription() {
    if (this.store && typeof this.store.subscribe === 'function') {
      this.store.subscribe(() => {
        const state = this.store.getState();
        const newUrl = selectDefaultLspUrl(state);
        if (newUrl !== this.currentUrl) {
          this.currentUrl = newUrl;
          this.connect();
        }
      });

      // Initialize with the current URL
      const initialState = this.store.getState();
      this.currentUrl = selectDefaultLspUrl(initialState) || this.fallbackUrl;
    } else {
      console.error('Invalid store provided to WebSocketService');
      this.currentUrl = this.fallbackUrl;
    }
  }

  connect() {
    if (!this.currentUrl) {
      console.warn('No WebSocket URL available. Using fallback URL.');
      this.currentUrl = this.fallbackUrl;
    }

    if (this.ws) {
      this.ws.close();
    }
    this.ws = new WebSocket(this.currentUrl);

    this.ws.onopen = this.handleOpen.bind(this);
    this.ws.onmessage = this.handleMessage.bind(this);
    this.ws.onclose = this.handleClose.bind(this);
    this.ws.onerror = this.handleError.bind(this);
  }

  private handleOpen() {
    console.log("WebSocket connected");
    this.retryCount = 0;
    // Send any queued messages
    this.messageQueue.forEach((message) => this.sendMessage(message.action, message.data));
    this.messageQueue = [];
  }

  private handleMessage(event: MessageEvent) {
    try {
      const message: Message<any> = JSON.parse(event.data);
      const listeners = this.listeners[message.action];
      if (listeners) {
        listeners.forEach((callback) => callback(message.data));
      }
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  }

  private handleClose(event: CloseEvent) {
    console.log("WebSocket disconnected. Attempting to reconnect...");
    if (this.retryCount < this.maxRetries) {
      setTimeout(() => this.connect(), this.reconnectInterval);
      this.retryCount++;
    } else {
      console.error("Max reconnect attempts reached");
    }
  }

  private handleError(event: Event) {
    console.error("WebSocket error:", event);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  sendMessage<T>(action: string, data: T): void {
    const message: Message<T> = { action, data };
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
    }
  }

  addListener<T>(action: string, callback: Listener<T>): void {
    if (!this.listeners[action]) {
      this.listeners[action] = [];
    }
    this.listeners[action].push(callback);
  }

  removeListener<T>(action: string, callback: Listener<T>): void {
    const listeners = this.listeners[action];
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }
}