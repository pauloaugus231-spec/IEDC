import { useEffect, useRef, useCallback } from 'react';

interface UseWebSocketOptions {
  onMessage?: (data: any) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

type SocketEventHandlers = Record<string, (data?: any) => void>;

function normalizeOptions(
  optionsOrNamespace: UseWebSocketOptions | string = {},
  eventHandlers?: SocketEventHandlers,
): UseWebSocketOptions {
  if (typeof optionsOrNamespace !== 'string') {
    return optionsOrNamespace;
  }

  return {
    onMessage: (data: any) => {
      const eventName = data?.event ?? data?.type ?? data?.name;
      if (eventName && eventHandlers?.[eventName]) {
        eventHandlers[eventName](data?.payload ?? data);
      }
    },
  };
}

export function useWebSocket(
  url: string,
  optionsOrNamespace: UseWebSocketOptions | string = {},
  eventHandlers?: SocketEventHandlers,
) {
  const options = normalizeOptions(optionsOrNamespace, eventHandlers);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        options.onOpen?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          options.onMessage?.(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        options.onError?.(error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        options.onClose?.();
        
        // Reconectar após 5 segundos
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connect();
        }, 5000);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Error creating WebSocket:', error);
    }
  }, [url, options]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  return {
    sendMessage,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  };
}
