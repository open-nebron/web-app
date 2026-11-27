import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { WsClient, resolveChatWsUrl } from './ws-client';
import { authApi } from '@/lib/api';

class MockWebSocket {
  public static instances: MockWebSocket[] = [];
  public static CONNECTING = 0;
  public static OPEN = 1;
  public static CLOSING = 2;
  public static CLOSED = 3;

  public url: string;
  public readyState: number = 0; // 0: CONNECTING, 1: OPEN, 2: CLOSING, 3: CLOSED
  public onopen: (() => void) | null = null;
  public onclose: ((event: any) => void) | null = null;
  public onmessage: ((event: any) => void) | null = null;
  public onerror: ((error: any) => void) | null = null;
  public sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    // Simulate async open
    setTimeout(() => {
      this.readyState = 1;
      if (this.onopen) this.onopen();
    }, 10);
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close(code = 1000, reason = 'Normal Closure') {
    this.readyState = 3;
    if (this.onclose) {
      this.onclose({ code, reason });
    }
  }

  // Helper to trigger message
  simulateMessage(data: Record<string, unknown>) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }
}

describe('WsClient', () => {
  let originalWebSocket: any;

  beforeAll(() => {
    originalWebSocket = global.WebSocket;
    (global as any).WebSocket = MockWebSocket;
  });

  afterAll(() => {
    (global as any).WebSocket = originalWebSocket;
  });

  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.instances = [];
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('1. Reconnects with exponential backoff on unexpected close', async () => {
    const client = new WsClient(() => 'ws://localhost:4003');
    client.connect('test-token-123');

    // Advance to open
    vi.advanceTimersByTime(20);
    expect(MockWebSocket.instances.length).toBe(1);
    expect(client.getStatus()).toBe('connected');

    const socket = MockWebSocket.instances[0];

    // Trigger unexpected close (code 1006)
    socket.close(1006, 'Abnormal Closure');
    expect(client.getStatus()).toBe('disconnected');

    // First reconnect delay is ~1000ms ± 20% (800-1200ms)
    vi.advanceTimersByTime(700);
    expect(MockWebSocket.instances.length).toBe(1); // not yet

    vi.advanceTimersByTime(600); // reaches ~1300ms
    expect(MockWebSocket.instances.length).toBe(2);

    client.disconnect();
  });

  it('2. Does not reconnect on close code 1000 or 4403', async () => {
    const client = new WsClient(() => 'ws://localhost:4003');
    client.connect('test-token-123');

    vi.advanceTimersByTime(20);
    expect(MockWebSocket.instances.length).toBe(1);

    // Simulate normal close (1000)
    MockWebSocket.instances[0].close(1000, 'Normal');
    expect(client.getStatus()).toBe('disconnected');

    // Advance 60 seconds - should NOT reconnect
    vi.advanceTimersByTime(60000);
    expect(MockWebSocket.instances.length).toBe(1);

    // Now test 4403 (session revoked)
    const client2 = new WsClient(() => 'ws://localhost:4003');
    client2.connect('test-token-456');
    vi.advanceTimersByTime(20);
    expect(MockWebSocket.instances.length).toBe(2);

    MockWebSocket.instances[1].close(4403, 'session_revoked');
    expect(client2.getStatus()).toBe('auth-failed');

    vi.advanceTimersByTime(60000);
    expect(MockWebSocket.instances.length).toBe(2);

    client.disconnect();
    client2.disconnect();
  });

  it('3. Heartbeat timeout triggers reconnect', async () => {
    const client = new WsClient(() => 'ws://localhost:4003');
    client.connect('test-token-123');

    vi.advanceTimersByTime(20);
    expect(MockWebSocket.instances.length).toBe(1);
    const socket = MockWebSocket.instances[0];

    // Heartbeat ping interval is 25s
    vi.advanceTimersByTime(25000);
    const sentPing = socket.sentMessages.find((m) => m.includes('"ping"'));
    expect(sentPing).toBeDefined();

    // Do NOT send pong - wait 10s for pong timeout
    vi.advanceTimersByTime(10000);
    expect(socket.readyState).toBe(3); // closed

    // Client should now schedule reconnect
    vi.advanceTimersByTime(2000);
    expect(MockWebSocket.instances.length).toBe(2);

    client.disconnect();
  });

  it('4. Does not loop refresh/reconnect when 4401 occurs repeatedly', async () => {
    const client = new WsClient(() => 'ws://localhost:4003');
    const refreshSpy = vi.spyOn(authApi, 'refresh').mockImplementation(async () => {
      // Simulate WsProvider's useEffect immediately calling client.connect(freshToken)
      client.connect('refreshed-token-2');
      return { accessToken: 'refreshed-token-2', expiresIn: 900 };
    });

    client.connect('initial-token-1');
    expect(MockWebSocket.instances.length).toBe(1);

    // First 4401 on handshake triggers exactly one refresh + reconnect
    MockWebSocket.instances[0].close(4401, 'invalid_token');
    await vi.advanceTimersByTimeAsync(0);

    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(MockWebSocket.instances.length).toBe(2);
    expect(MockWebSocket.instances[1].url).toContain('refreshed-token-2');

    // Second 4401 on refreshed token sets auth-failed without another refresh or socket
    MockWebSocket.instances[1].close(4401, 'invalid_token');
    await vi.advanceTimersByTimeAsync(0);

    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(client.getStatus()).toBe('auth-failed');
    expect(MockWebSocket.instances.length).toBe(2);

    refreshSpy.mockRestore();
    client.disconnect();
  });

  it('5. resolveChatWsUrl uses wss://<host> on HTTPS tunnels when env points to localhost', () => {
    expect(
      resolveChatWsUrl('ws://localhost:4003', {
        protocol: 'https:',
        hostname: 'demo.example.com',
        host: 'demo.example.com',
      })
    ).toBe('wss://demo.example.com');

    expect(
      resolveChatWsUrl('ws://localhost:4003', {
        protocol: 'http:',
        hostname: 'localhost',
        host: 'localhost:3000',
      })
    ).toBe('ws://localhost:4003');

    expect(
      resolveChatWsUrl('wss://chat.example.com', {
        protocol: 'https:',
        hostname: 'app.example.com',
        host: 'app.example.com',
      })
    ).toBe('wss://chat.example.com');
  });
});
