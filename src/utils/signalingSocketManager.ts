import { io, Socket } from 'socket.io-client';

// Singleton Socket Manager - completely independent of React
class SignalingSocketManager {
  private static instance: SignalingSocketManager | null = null;
  private socket: Socket | null = null;
  private currentUserId: string | null = null;
  private eventHandlers: Map<string, Set<Function>> = new Map();
  private isConnecting: boolean = false;

  private constructor() {}

  static getInstance(): SignalingSocketManager {
    if (!SignalingSocketManager.instance) {
      console.log('[SignalingSocketManager] 🏗️ Creating singleton instance');
      SignalingSocketManager.instance = new SignalingSocketManager();
    } else {
      console.log('[SignalingSocketManager] ♻️ Reusing existing singleton instance');
    }
    return SignalingSocketManager.instance;
  }

  connect(userId: string): Socket {
    // If already connected to the same user, return existing socket
    if (this.socket && this.socket.connected && this.currentUserId === userId) {
      console.log('[SignalingSocketManager] ✅ Using existing socket for user:', userId, 'socket:', this.socket.id);
      return this.socket;
    }

    // If connecting for a different user, disconnect current socket
    if (this.socket && this.currentUserId !== userId) {
      console.log('[SignalingSocketManager] 🔄 Switching user from', this.currentUserId, 'to', userId);
      this.disconnect();
    }

    // CRITICAL: If already connected to same user, force disconnect and reconnect to prevent multiple sockets
    if (this.socket && this.currentUserId === userId && this.socket.connected) {
      console.log('[SignalingSocketManager] ⚠️  Forcing disconnect to prevent multiple sockets for same user:', userId);
      this.disconnect();
    }

    // If already connecting, wait
    if (this.isConnecting) {
      console.log('[SignalingSocketManager] ⏳ Already connecting, please wait...');
      return this.socket!; // Return existing socket while connecting
    }

    this.isConnecting = true;
    this.currentUserId = userId;

    console.log('[SignalingSocketManager] 🔌 Creating NEW socket connection for user:', userId);

    this.socket = io('https://signaling-new-4.onrender.com', {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      autoConnect: true
    });

    this.socket.on('connect', () => {
      console.log('[SignalingSocketManager] ✅ Connected to signaling server:', this.socket!.id, 'for user:', userId);
      this.isConnecting = false;
      
      // Auto-register user
      this.socket!.emit('message', JSON.stringify({
        type: 'REGISTER',
        from: userId,
        to: '',
        data: null
      }));
      console.log('[SignalingSocketManager] 📝 Registration message sent for user:', userId);
    });

    this.socket.on('registration-confirmed', (data) => {
      console.log('[SignalingSocketManager] ✅ Registration confirmed:', data);
      console.log('[SignalingSocketManager] 👤 User ID:', data.userId);
      console.log('[SignalingSocketManager] 🔌 Socket ID:', data.socketId);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[SignalingSocketManager] ❌ Connection error:', error);
      this.isConnecting = false;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[SignalingSocketManager] ❌ Disconnected:', reason);
      this.isConnecting = false;
      // Don't auto-clear socket here, let reconnection handle it
    });

    this.socket.on('reconnect', () => {
      console.log('[SignalingSocketManager] 🔄 Reconnected for user:', userId);
      // Re-register on reconnect
      this.socket!.emit('message', JSON.stringify({
        type: 'REGISTER',
        from: userId,
        to: '',
        data: null
      }));
      console.log('[SignalingSocketManager] 🔄 Re-registration message sent for user:', userId);
    });

    // Set up universal event forwarding
    this.setupEventForwarding();

    return this.socket;
  }

  private setupEventForwarding() {
    if (!this.socket) return;

    // Forward all relevant events to registered handlers
    const events = [
      'share-request', 'offer', 'answer', 'ice-candidate', 'share-stopped', 'peer-disconnected', 'user-joined',
      'remote-access-request', 'remote-access-offer', 'remote-access-answer', 'remote-access-ice-candidate', 'remote-access-stopped', 'remote-access-debug',
      'registration-confirmed'
    ];
    
    console.log('[SignalingSocketManager] 🎯 Setting up event forwarding for:', events);
    
    events.forEach(eventName => {
      this.socket!.on(eventName, (data: any) => {
        console.log(`[SignalingSocketManager] 📨 Received ${eventName}:`, data);
        
        // Forward to all registered handlers for this event
        const handlers = this.eventHandlers.get(eventName);
        if (handlers) {
          console.log(`[SignalingSocketManager] ✅ Forwarding ${eventName} to ${handlers.size} handlers`);
          handlers.forEach(handler => {
            try {
              handler(data);
            } catch (error) {
              console.error(`[SignalingSocketManager] Error in ${eventName} handler:`, error);
            }
          });
        } else {
          console.warn(`[SignalingSocketManager] ⚠️ No handlers registered for ${eventName}`);
        }
      });
    });

    // Universal event listener for debugging
    this.socket.onAny((eventName, ...args) => {
      if (!['connect', 'disconnect', 'ping', 'pong'].includes(eventName)) {
        console.log('[SignalingSocketManager] 📡 Any event:', eventName, args);
        
        // Special debugging for remote access events
        if (eventName.startsWith('remote-access')) {
          console.log('[SignalingSocketManager] 🔍 Remote access event details:');
          console.log('[SignalingSocketManager] 🔍 Event name:', eventName);
          console.log('[SignalingSocketManager] 🔍 Event data:', args[0]);
          console.log('[SignalingSocketManager] 🔍 Registered handlers for this event:', this.eventHandlers.get(eventName)?.size || 0);
          
          // Extra debugging for remote-access-offer specifically
          if (eventName === 'remote-access-offer') {
            console.log('[SignalingSocketManager] 🎯 CRITICAL: REMOTE-ACCESS-OFFER RECEIVED!');
            console.log('[SignalingSocketManager] 🎯 Current user ID from socket manager:', this.currentUserId);
            console.log('[SignalingSocketManager] 🎯 Target user ID in offer:', args[0]?.targetUserId);
            console.log('[SignalingSocketManager] 🎯 Room ID in offer:', args[0]?.roomId);
            console.log('[SignalingSocketManager] 🎯 Has offer data:', !!args[0]?.offer);
            console.log('[SignalingSocketManager] 🎯 Handlers registered:', this.eventHandlers.get(eventName)?.size || 0);
            
            if (this.eventHandlers.get(eventName)?.size === 0) {
              console.error('[SignalingSocketManager] ❌ NO HANDLERS REGISTERED FOR REMOTE-ACCESS-OFFER!');
            }
          }
        }
      }
    });
  }

  // Register event handler
  addEventListener(eventName: string, handler: Function): void {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, new Set());
    }
    this.eventHandlers.get(eventName)!.add(handler);
    console.log(`[SignalingSocketManager] ➕ Added ${eventName} handler, total:`, this.eventHandlers.get(eventName)!.size);
  }

  // Remove event handler
  removeEventListener(eventName: string, handler: Function): void {
    const handlers = this.eventHandlers.get(eventName);
    if (handlers) {
      handlers.delete(handler);
      console.log(`[SignalingSocketManager] ➖ Removed ${eventName} handler, remaining:`, handlers.size);
      if (handlers.size === 0) {
        this.eventHandlers.delete(eventName);
      }
    }
  }

  // Get current socket
  getSocket(): Socket | null {
    return this.socket;
  }

  // Check if connected
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Get current user
  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  // Emit event
  emit(eventName: string, data: any): void {
    if (this.socket && this.socket.connected) {
      console.log(`[SignalingSocketManager] 📤 Emitting ${eventName}:`, data);
      this.socket.emit(eventName, data);
    } else {
      console.warn('[SignalingSocketManager] ⚠️ Cannot emit, socket not connected:', eventName);
    }
  }

  // Disconnect
  disconnect(): void {
    if (this.socket) {
      console.log('[SignalingSocketManager] 🔌 Disconnecting socket for user:', this.currentUserId);
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentUserId = null;
    this.isConnecting = false;
    this.eventHandlers.clear();
  }
}

export default SignalingSocketManager; 