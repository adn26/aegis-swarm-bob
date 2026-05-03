import { API_BASE_URL } from '@/utils/constants';
import type { SSEEvent, SSEEventType } from '@/types/api.types';

type EventCallback = (data: any) => void;

class SSEService {
  private eventSource: EventSource | null = null;
  private listeners: Map<SSEEventType | 'all', EventCallback[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;

  connect(auditId: string): void {
    if (this.eventSource) {
      this.disconnect();
    }

    const url = `${API_BASE_URL}/api/stream/${auditId}`;
    this.eventSource = new EventSource(url);

    this.eventSource.onopen = () => {
      console.log('SSE connection established');
      this.reconnectAttempts = 0;
    };

    this.eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      
      // If the connection was closed by the server or network, try to reconnect
      // Don't disconnect immediately, let it retry
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        console.log(`Reconnecting... Attempt ${this.reconnectAttempts} in ${delay}ms`);
        
        // Close current source before reconnecting
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }

        setTimeout(() => {
          this.connect(auditId);
        }, delay);
      } else {
        console.error('Max reconnection attempts reached');
        // Trigger an error event so the UI can show a proper error message instead of just stopping
        this.trigger('error', { 
          type: 'error', 
          timestamp: new Date().toISOString(),
          data: { message: 'Lost connection to command center. Please refresh the page.' } 
        });
        this.disconnect();
      }
    };

    // Listen to all event types
    const eventTypes: SSEEventType[] = [
      'connected',
      'audit_started',
      'repo_cloned',
      'files_scanned',
      'redteam_analyzing',
      'vulnerability_found',
      'blueteam_patching',
      'patch_generated',
      'sandbox_deploying',
      'tests_running',
      'test_results',
      'audit_completed',
      'error',
      'progress',
      'agent_thinking',
    ];

    eventTypes.forEach((eventType) => {
      this.eventSource!.addEventListener(eventType, (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          const sseEvent: SSEEvent = {
            id: event.lastEventId || Date.now().toString(),
            type: eventType,
            timestamp: new Date().toISOString(),
            data,
          };

          // Trigger specific event listeners
          this.trigger(eventType, sseEvent);
          
          // Trigger 'all' listeners
          this.trigger('all', sseEvent);
        } catch (error) {
          console.error(`Error parsing SSE event ${eventType}:`, error);
        }
      });
    });
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      console.log('SSE connection closed');
    }
    this.listeners.clear();
    this.reconnectAttempts = 0;
  }

  on(eventType: SSEEventType | 'all', callback: EventCallback): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);
  }

  off(eventType: SSEEventType | 'all', callback?: EventCallback): void {
    if (!callback) {
      this.listeners.delete(eventType);
      return;
    }

    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private trigger(eventType: SSEEventType | 'all', data: any): void {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  isConnected(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN;
  }

  getReadyState(): number {
    return this.eventSource?.readyState ?? EventSource.CLOSED;
  }
}

export const sseService = new SSEService();
export default sseService;

// Made with Bob
