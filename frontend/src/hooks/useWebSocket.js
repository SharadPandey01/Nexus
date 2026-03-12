import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for WebSocket connections with auto-reconnect.
 * @param {string} path - WebSocket path (e.g., '/ws/activity')
 * @param {object} options - { onMessage, autoReconnect, reconnectInterval }
 * @returns {{ lastMessage, sendMessage, isConnected }}
 */
export function useWebSocket(path, options = {}) {
  const {
    onMessage = null,
    autoReconnect = true,
    reconnectInterval = 3000,
  } = options;

  const [lastMessage, setLastMessage] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  // Store onMessage in a ref so it doesn't trigger reconnects on re-render
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    // Clear any pending reconnect
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    // Close existing connection
    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
      wsRef.current = null;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const ws = new WebSocket(`${protocol}//${host}${path}`);

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'pong') return;
          setLastMessage(data);
          if (onMessageRef.current) onMessageRef.current(data);
        } catch {
          setLastMessage(event.data);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (autoReconnect) {
          reconnectTimer.current = setTimeout(connect, reconnectInterval);
        }
      };

      ws.onerror = (err) => {
        // Handle websocket error event
        console.error('[WS] Connection event error', err);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('[WS] Initial connect error:', err);
      if (autoReconnect) {
        reconnectTimer.current = setTimeout(connect, reconnectInterval);
      }
    }
  }, [path, autoReconnect, reconnectInterval]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        // Prevent reconnect on intentional unmount
        const ws = wsRef.current;
        wsRef.current = null;
        ws.onclose = null;
        ws.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof data === 'string' ? data : JSON.stringify(data));
    }
  }, []);

  return { lastMessage, sendMessage, isConnected };
}
