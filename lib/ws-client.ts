import { toast } from '@/components/ui/use-toast';
import { authApi } from '@/lib/api';

export type WsStatus = 'connecting' | 'connected' | 'disconnected' | 'auth-failed';

export type EventHandler = (data: any) => void;

interface PendingAck {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timer: NodeJS.Timeout;
}

interface QueuedFrame {
  type: string;
  payload: Record<string, unknown>;
  id: string;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}

class ClientRateLimiter {
  private sendTimestamps: number[] = [];
  private typingTimestamps: number[] = [];
  private readTimestamps: number[] = [];

  allow(type: string): boolean {
    const now = Date.now();
    const windowMs = 1000;

    if (type === 'message.send') {
      this.sendTimestamps = this.sendTimestamps.filter((t) => now - t < windowMs);
      if (this.sendTimestamps.length >= 10) return false;
      this.sendTimestamps.push(now);
      return true;
    }

    if (type === 'typing.start' || type === 'typing.stop') {
      this.typingTimestamps = this.typingTimestamps.filter((t) => now - t < windowMs);
      if (this.typingTimestamps.length >= 10) return false;
      this.typingTimestamps.push(now);
      return true;
    }

    if (type === 'message.read') {
      this.readTimestamps = this.readTimestamps.filter((t) => now - t < windowMs);
      if (this.readTimestamps.length >= 20) return false;
      this.readTimestamps.push(now);
      return true;
    }

    return true;
  }
}

export class WsClient {
  private socket: WebSocket | null = null;
  private token: string | null = null;
  private status: WsStatus = 'disconnected';
  private reconnectAttempt = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private pongTimeout: NodeJS.Timeout | null = null;
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private pendingAcks: Map<string, PendingAck> = new Map();
  private messageQueue: QueuedFrame[] = [];
  private rateLimiter = new ClientRateLimiter();
  private isExplicitlyClosed = false;
  private hasTriedTokenRefreshOn4401 = false;

  private readonly PING_INTERVAL_MS = 25000;
  private readonly PONG_TIMEOUT_MS = 10000;
  private readonly ACK_TIMEOUT_MS = 10000;

  constructor(private urlProvider?: () => string) {}

  public getStatus(): WsStatus {
    return this.status;
  }

  public on(event: string, handler: EventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  public off(event: string, handler: EventHandler): void {
    this.listeners.get(event)?.delete(handler);
  }

  private emit(event: string, data?: any): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((h) => {
        try {
          h(data);
        } catch (err) {
          console.error(`[WS] Error in event listener for ${event}:`, err);
        }
      });
    }
  }

  public connect(token: string): void {
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) &&
      this.token === token
    ) {
      return;
    }
    this.token = token;
    this.isExplicitlyClosed = false;
    this.hasTriedTokenRefreshOn4401 = false;
    this.initiateConnection();
  }

  private getWsUrl(): string {
    if (this.urlProvider) return this.urlProvider();
    const envUrl = process.env.NEXT_PUBLIC_CHAT_WS;
    if (envUrl) return envUrl;
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.hostname}:4003`;
    }
    return 'ws://localhost:4003';
  }

  private initiateConnection(): void {
    if (!this.token || this.isExplicitlyClosed) return;

    this.cleanupSocket();
    this.setStatus('connecting');

    const baseUrl = this.getWsUrl().replace(/\/+$/, '');
    const wsUrl = `${baseUrl}/ws?token=${encodeURIComponent(this.token)}`;

    try {
      this.socket = new WebSocket(wsUrl);
    } catch (err) {
      this.setStatus('disconnected');
      this.scheduleReconnect();
      return;
    }

    this.socket.onopen = () => {
      this.setStatus('connected');
      this.reconnectAttempt = 0;
      this.hasTriedTokenRefreshOn4401 = false;
      this.startHeartbeat();
      this.flushQueue();
      this.emit('open');
    };

    this.socket.onmessage = (event: MessageEvent) => {
      this.handleIncomingMessage(event.data);
    };

    this.socket.onclose = (event: CloseEvent) => {
      this.handleSocketClose(event.code, event.reason);
    };

    this.socket.onerror = (error: Event) => {
      this.emit('error', error);
    };
  }

  private setStatus(newStatus: WsStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.emit('status', newStatus);
    }
  }

  private handleIncomingMessage(raw: any): void {
    let parsed: any;
    try {
      parsed = JSON.parse(raw.toString());
    } catch {
      return;
    }

    this.emit('message', parsed);

    const { type, ackId, payload } = parsed || {};

    if (type === 'pong') {
      if (this.pongTimeout) {
        clearTimeout(this.pongTimeout);
        this.pongTimeout = null;
      }
    }

    if (ackId && this.pendingAcks.has(ackId)) {
      const ack = this.pendingAcks.get(ackId)!;
      clearTimeout(ack.timer);
      this.pendingAcks.delete(ackId);

      if (type === 'error') {
        ack.reject(new Error(payload?.message || payload?.code || 'Operation rejected by server'));
      } else {
        ack.resolve(parsed);
      }
    }

    if (type) {
      this.emit(type, payload ?? parsed);
    }
  }

  private async handleSocketClose(code: number, reason: string): Promise<void> {
    this.cleanupHeartbeat();
    this.rejectAllPendingAcks(new Error(`WebSocket closed with code ${code}`));

    if (this.isExplicitlyClosed || code === 1000) {
      this.setStatus('disconnected');
      this.emit('close', { code, reason });
      return;
    }

    // 4401: Invalid token -> attempt silent refresh once
    if (code === 4401) {
      if (!this.hasTriedTokenRefreshOn4401) {
        this.hasTriedTokenRefreshOn4401 = true;
        try {
          const fresh = await authApi.refresh();
          if (fresh?.accessToken) {
            this.token = fresh.accessToken;
            this.initiateConnection();
            return;
          }
        } catch {
          // Token refresh failed
        }
      }
      this.setStatus('auth-failed');
      this.emit('auth-failed', { code, reason });
      return;
    }

    // 4403: Session revoked
    if (code === 4403) {
      this.setStatus('auth-failed');
      this.emit('session-revoked', { code, reason });
      return;
    }

    // 4408: Too many connections
    if (code === 4408) {
      this.setStatus('disconnected');
      this.emit('too-many', { code, reason });
      toast({
        variant: 'destructive',
        title: 'Too many tabs',
        description: "You're signed in on too many browser tabs. This connection was closed.",
      });
      return;
    }

    // 4409: Frame too large
    if (code === 4409) {
      console.warn('[WS] Frame too large closed socket');
    }

    // Other unexpected close -> reconnect with exponential backoff
    this.setStatus('disconnected');
    this.emit('close', { code, reason });
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.isExplicitlyClosed || this.reconnectTimer) return;

    const baseDelays = [1000, 2000, 4000, 8000, 16000, 30000];
    const index = Math.min(this.reconnectAttempt, baseDelays.length - 1);
    const baseDelay = baseDelays[index];

    // ±20% jitter
    const jitter = baseDelay * (0.8 + Math.random() * 0.4);
    const delay = Math.round(Math.min(jitter, 30000));

    this.reconnectAttempt++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.initiateConnection();
    }, delay);
  }

  private startHeartbeat(): void {
    this.cleanupHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        const pingId = 'ping-' + Math.random().toString(36).substring(2, 9);
        try {
          this.socket.send(JSON.stringify({ type: 'ping', id: pingId }));

          this.pongTimeout = setTimeout(() => {
            console.warn('[WS] Heartbeat timeout: no pong received within 10s. Forcing reconnect.');
            if (this.socket) {
              this.socket.close(4000, 'Heartbeat timeout');
            }
          }, this.PONG_TIMEOUT_MS);
        } catch {
          // Socket write failed
        }
      }
    }, this.PING_INTERVAL_MS);
  }

  private cleanupHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
  }

  private cleanupSocket(): void {
    this.cleanupHeartbeat();
    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onclose = null;
      this.socket.onerror = null;
      try {
        if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
          this.socket.close();
        }
      } catch {
        // Ignore
      }
      this.socket = null;
    }
  }

  private rejectAllPendingAcks(error: Error): void {
    this.pendingAcks.forEach((ack) => {
      clearTimeout(ack.timer);
      ack.reject(error);
    });
    this.pendingAcks.clear();
  }

  public disconnect(): void {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.cleanupSocket();
    this.setStatus('disconnected');
    this.rejectAllPendingAcks(new Error('WebSocket disconnected by client'));
  }

  public send(type: string, payload: Record<string, unknown> = {}, customId?: string): Promise<any> {
    const id = customId || 'msg-' + Math.random().toString(36).substring(2, 10);

    // Rate limiting check
    if (!this.rateLimiter.allow(type)) {
      toast({
        title: 'Slow down',
        description: 'You are sending actions too quickly.',
      });
      return Promise.reject(new Error('Client rate limit exceeded'));
    }

    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      // If disconnected and is a message.send, queue it to flush upon reconnect
      if (type === 'message.send') {
        return new Promise((resolve, reject) => {
          this.messageQueue.push({ type, payload, id, resolve, reject });
        });
      }
      return Promise.reject(new Error('WebSocket is not connected'));
    }

    const frame = JSON.stringify({ type, payload, id });

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingAcks.delete(id);
        reject(new Error(`Timeout waiting for acknowledgement of '${type}'`));
      }, this.ACK_TIMEOUT_MS);

      this.pendingAcks.set(id, { resolve, reject, timer });

      try {
        this.socket!.send(frame);
      } catch (err) {
        clearTimeout(timer);
        this.pendingAcks.delete(id);
        reject(err);
      }
    });
  }

  private flushQueue(): void {
    if (this.messageQueue.length === 0) return;
    const queued = [...this.messageQueue];
    this.messageQueue = [];

    queued.forEach((item) => {
      this.send(item.type, item.payload, item.id)
        .then(item.resolve)
        .catch(item.reject);
    });
  }

  public sendMessage(conversationId: string, body: string, clientId?: string): Promise<any> {
    const cid = clientId || 'c-' + Math.random().toString(36).substring(2, 12);
    return this.send('message.send', { conversationId, body, clientId: cid });
  }

  public sendRead(conversationId: string, messageId: string): Promise<any> {
    return this.send('message.read', { conversationId, messageId });
  }

  public sendTyping(conversationId: string, isTyping: boolean): Promise<any> {
    const type = isTyping ? 'typing.start' : 'typing.stop';
    return this.send(type, { conversationId });
  }
}
