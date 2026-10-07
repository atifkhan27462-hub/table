/**
 * Real-time Order Engine WebSocket Client for Restaurant Admin Dashboard.
 * Receives live updates for all tables, kitchen ticket loads, table online/offline telemetry.
 */

export type RealtimeEventType =
  | 'ORDER_CREATED'
  | 'ORDER_ACCEPTED'
  | 'ORDER_PREPARING'
  | 'ORDER_READY'
  | 'ORDER_SERVED'
  | 'ORDER_COMPLETED'
  | 'ORDER_CANCELLED'
  | 'STAFF_ASSISTANCE_REQUESTED'
  | 'STAFF_ASSISTANCE_RESOLVED'
  | 'TABLE_ONLINE'
  | 'TABLE_OFFLINE'
  | 'AI_GENERATION_COMPLETED'
  | 'PING'
  | 'PONG'
  | 'ERROR'
  | 'ACK';

export interface RealtimeEvent<T = any> {
  event_id: string;
  type: RealtimeEventType;
  timestamp: string;
  restaurant_id?: string;
  table_id?: string;
  data: T;
}

type EventCallback = (event: RealtimeEvent) => void;

class AdminSocketClient {
  private ws: WebSocket | null = null;
  private token: string = '';
  private reconnectAttempts = 0;
  private maxReconnectDelay = 10000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private seenEventIds: Set<string> = new Set();
  private isExplicitlyClosed = false;

  public isConnected = false;

  public init(token?: string) {
    if (typeof window === 'undefined') return;
    this.token = token || '';
    this.isExplicitlyClosed = false;
    this.connect();
  }

  private getSocketUrl(): string {
    let url = '';
    if (process.env.NEXT_PUBLIC_WS_URL) {
      url = process.env.NEXT_PUBLIC_WS_URL;
    } else if (process.env.NEXT_PUBLIC_API_URL) {
      url = process.env.NEXT_PUBLIC_API_URL.replace(/^http/, 'ws').replace(/\/api\/v1\/?$/, '/ws');
    } else if (typeof window !== 'undefined') {
      const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;
      if (['3000', '3001', '3002'].includes(window.location.port)) {
        url = `${wsProto}//${host}:8080/ws`;
      } else {
        url = `${wsProto}//${host}:8080/ws`;
      }
    } else {
      url = 'ws://127.0.0.1:8080/ws';
    }
    const tokenQuery = this.token ? `&token=${encodeURIComponent(this.token)}` : '';
    return `${url}?client_type=admin${tokenQuery}`;
  }

  private connect() {
    if (this.isExplicitlyClosed) return;

    try {
      const url = this.getSocketUrl();
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.dispatch({
          event_id: 'local_open',
          type: 'ACK',
          timestamp: new Date().toISOString(),
          data: { status: 'CONNECTED' },
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed: RealtimeEvent = JSON.parse(event.data);

          // Deduplication Protection
          if (parsed.event_id) {
            if (this.seenEventIds.has(parsed.event_id)) {
              return;
            }
            this.seenEventIds.add(parsed.event_id);
            if (this.seenEventIds.size > 200) {
              const [first] = this.seenEventIds;
              this.seenEventIds.delete(first);
            }
          }

          if (parsed.type === 'PONG') {
            return;
          }

          this.dispatch(parsed);
        } catch (err) {
          console.warn('Error parsing incoming Admin WebSocket frame:', err);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.stopHeartbeat();
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('Admin WebSocket error:', err);
        this.ws?.close();
      };
    } catch (e) {
      console.warn('Failed to initialize Admin WebSocket:', e);
      this.scheduleReconnect();
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'PING' }));
      }
    }, 25000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private scheduleReconnect() {
    if (this.isExplicitlyClosed) return;
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), this.maxReconnectDelay);
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  public subscribe(eventType: RealtimeEventType | '*', callback: EventCallback): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  private dispatch(event: RealtimeEvent) {
    const specificListeners = this.listeners.get(event.type);
    if (specificListeners) {
      specificListeners.forEach((cb) => cb(event));
    }
    const wildcardListeners = this.listeners.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach((cb) => cb(event));
    }
  }

  public close() {
    this.isExplicitlyClosed = true;
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}

export const adminSocket = new AdminSocketClient();
