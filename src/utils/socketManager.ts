import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '../config/api';

class SocketManager {
  private static instance: SocketManager;
  private socket: Socket | null = null;
  private readonly serverUrl: string;

  private constructor() {
    this.serverUrl = API_CONFIG.socketURL;
    console.log('[SocketManager] Initialized with server URL:', this.serverUrl);
  }

  public static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  public connect(userId?: string): Socket {
    console.log('[SocketManager] Attempting to connect to server with userId:', userId);
    
    if (!this.socket) {
      console.log('[SocketManager] Creating new socket connection');
      this.socket = io(this.serverUrl, {
        transports: ['websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        withCredentials: true
      });

      this.setupEventHandlers();
    } else {
      console.log('[SocketManager] Reusing existing socket connection:', this.socket.id);
    }

    if (userId) {
      console.log('[SocketManager] Authenticating with userId:', userId);
      this.socket.emit('authenticate', userId);

      // Set up authentication error handler
      this.socket.on('auth_error', (error) => {
        console.error('[SocketManager] Authentication error:', error);
      });

      // Set up authentication success handler
      this.socket.on('auth_success', () => {
        console.log('[SocketManager] Authentication successful for userId:', userId);
      });
    }

    return this.socket;
  }

  public getSocket(): Socket | null {
    const socketState = {
      exists: !!this.socket,
      connected: this.socket?.connected,
      id: this.socket?.id
    };
    
    if (!this.socket?.connected) {
      console.warn('[SocketManager] Socket not connected. Current socket state:', socketState);
      return this.connect();
    } else {
      console.log('[SocketManager] Socket state:', socketState);
    }
    
    return this.socket;
  }

  public disconnect(): void {
    if (this.socket) {
      console.log('[SocketManager] Disconnecting socket:', this.socket.id);
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[SocketManager] Socket connected with ID:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.error('[SocketManager] Socket disconnected. Reason:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[SocketManager] Socket connection error:', error);
    });

    this.socket.on('error', (error) => {
      console.error('[SocketManager] Socket error:', error);
    });

    // Debug events for screen sharing
    this.socket.on('offer', (data) => {
      console.log('[SocketManager] Received offer:', data);
    });

    this.socket.on('answer', (data) => {
      console.log('[SocketManager] Received answer:', data);
    });

    this.socket.on('ice-candidate', (data) => {
      console.log('[SocketManager] Received ICE candidate:', data);
    });

    this.socket.on('join-room', (data) => {
      console.log('[SocketManager] Joined room:', data);
    });

    this.socket.on('share-started', (data) => {
      console.log('[SocketManager] Screen share started:', data);
    });

    this.socket.on('share-stopped', (data) => {
      console.log('[SocketManager] Screen share stopped:', data);
    });

    this.socket.on('peer-disconnected', (data) => {
      console.log('[SocketManager] Peer disconnected:', data);
    });
  }

  public on(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      console.log('[SocketManager] Registering event listener for:', event);
      this.socket.on(event, callback);
    } else {
      console.warn('[SocketManager] Attempted to register event listener but socket is null:', event);
    }
  }

  public off(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      console.log('[SocketManager] Removing event listener for:', event);
      this.socket.off(event, callback);
    }
  }

  public emit(event: string, data: any): void {
    if (this.socket?.connected) {
      console.log('[SocketManager] Emitting event:', event, 'with data:', data);
      this.socket.emit(event, data);
    } else {
      console.warn('[SocketManager] Attempted to emit event but socket is not connected:', event);
    }
  }
}

export default SocketManager; 