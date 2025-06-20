import { io, Socket } from 'socket.io-client';
import SocketManager from '../utils/socketManager';

export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private socket: Socket | null = null;
  private stream: MediaStream | null = null;
  private roomId: string | null = null;
  private isReconnecting: boolean = false;
  private reconnectionAttempts: number = 0;
  private readonly MAX_RECONNECTION_ATTEMPTS: number = 5;

  constructor() {
    this.socket = SocketManager.getInstance().getSocket();
    if (!this.socket || !this.socket.connected) {
      console.log('[WebRTCService] Socket not connected, initializing connection...');
      this.socket = SocketManager.getInstance().connect();
    }
    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    if (!this.socket) {
      console.error('[WebRTCService] Cannot setup listeners: Socket is null');
      return;
    }

    this.socket.on('connect', () => {
      console.log('[WebRTCService] Socket connected with ID:', this.socket?.id);
      if (this.isReconnecting && this.roomId) {
        this.handleReconnection();
      }
    });

    this.socket.on('disconnect', () => {
      console.log('[WebRTCService] Socket disconnected');
      if (this.stream) {
        this.isReconnecting = true;
        this.attemptReconnection();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('[WebRTCService] Socket connection error:', error);
      this.handleConnectionError();
    });

    this.socket.on('share-stopped', () => {
      console.log('[WebRTCService] Remote user stopped sharing');
      this.handleShareStopped();
    });

    this.socket.on('offer', async (data: { offer: RTCSessionDescriptionInit; roomId: string }) => {
      console.log('[WebRTCService] Received offer:', data);
      try {
        if (!this.peerConnection || this.peerConnection.connectionState === 'failed') {
          this.initializePeerConnection();
        }
        await this.peerConnection?.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await this.peerConnection?.createAnswer();
        await this.peerConnection?.setLocalDescription(answer);
        this.socket?.emit('answer', {
          roomId: data.roomId,
          answer
        });
      } catch (error) {
        console.error('[WebRTCService] Error handling offer:', error);
        this.handleConnectionError();
      }
    });

    this.socket.on('answer', async (data: { answer: RTCSessionDescriptionInit; roomId: string }) => {
      console.log('[WebRTCService] Received answer:', data);
      try {
        await this.peerConnection?.setRemoteDescription(new RTCSessionDescription(data.answer));
      } catch (error) {
        console.error('[WebRTCService] Error handling answer:', error);
        this.handleConnectionError();
      }
    });

    this.socket.on('ice-candidate', async (data: { candidate: RTCIceCandidateInit; roomId: string }) => {
      console.log('[WebRTCService] Received ICE candidate:', data);
      try {
        if (this.peerConnection?.remoteDescription) {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } else {
          console.log('[WebRTCService] Queuing ICE candidate until remote description is set');
        }
      } catch (error) {
        console.error('[WebRTCService] Error handling ICE candidate:', error);
      }
    });

    this.socket.on('peer-disconnected', (data: { peerId: string }) => {
      console.log('[WebRTCService] Peer disconnected:', data.peerId);
      this.handleShareStopped();
    });
  }

  private handleConnectionError() {
    console.error('[WebRTCService] Connection error occurred');
    if (this.reconnectionAttempts < this.MAX_RECONNECTION_ATTEMPTS) {
      this.isReconnecting = true;
      this.attemptReconnection();
    } else {
      this.handleReconnectionFailure();
    }
  }

  private async handleReconnection() {
    console.log('[WebRTCService] Attempting to restore connection');
    this.reconnectionAttempts = 0;
    if (this.stream && this.roomId) {
      try {
        await this.restartConnection();
      } catch (error) {
        console.error('[WebRTCService] Failed to restore connection:', error);
        this.handleReconnectionFailure();
      }
    }
  }

  private async restartConnection() {
    if (!this.stream || !this.roomId) return;

    this.initializePeerConnection();
    this.stream.getTracks().forEach(track => {
      if (this.stream) {
        this.peerConnection?.addTrack(track, this.stream);
      }
    });

    const offer = await this.peerConnection?.createOffer({ iceRestart: true });
    if (!offer) throw new Error('Failed to create offer');
    
    await this.peerConnection?.setLocalDescription(offer);
    this.socket?.emit('offer', { roomId: this.roomId, offer });
  }

  private async attemptReconnection() {
    if (this.reconnectionAttempts >= this.MAX_RECONNECTION_ATTEMPTS) {
      this.handleReconnectionFailure();
      return;
    }

    this.reconnectionAttempts++;
    console.log(`[WebRTCService] Reconnection attempt ${this.reconnectionAttempts}/${this.MAX_RECONNECTION_ATTEMPTS}`);
    
    try {
      await this.restartConnection();
    } catch (error) {
      console.error('[WebRTCService] Reconnection attempt failed:', error);
      setTimeout(() => this.attemptReconnection(), 2000);
    }
  }

  private handleReconnectionFailure() {
    console.log('[WebRTCService] Max reconnection attempts reached');
    this.isReconnecting = false;
    this.reconnectionAttempts = 0;
    this.handleShareStopped();
  }

  private initializePeerConnection() {
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ],
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      iceCandidatePoolSize: 1
    });

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.roomId) {
        console.log('[WebRTCService] Sending ICE candidate for room:', this.roomId);
        this.socket?.emit('ice-candidate', {
          roomId: this.roomId,
          candidate: event.candidate
        });
      }
    };

    this.peerConnection.ontrack = (event) => {
      console.log('[WebRTCService] Received remote track:', event.streams[0]);
      this.handleRemoteStream(event.streams[0]);
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('[WebRTCService] ICE connection state:', this.peerConnection?.iceConnectionState);
      switch (this.peerConnection?.iceConnectionState) {
        case 'disconnected':
          console.log('[WebRTCService] ICE disconnected, attempting to recover');
          this.handleConnectionError();
          break;
        case 'failed':
          console.log('[WebRTCService] ICE connection failed');
          this.handleConnectionError();
          break;
        case 'connected':
          console.log('[WebRTCService] ICE connected');
          this.isReconnecting = false;
          this.reconnectionAttempts = 0;
          break;
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log('[WebRTCService] Connection state:', this.peerConnection?.connectionState);
      if (this.peerConnection?.connectionState === 'connected') {
        console.log('✅ WebRTC connection established successfully');
      }
    };
  }

  private handleRemoteStream(stream: MediaStream) {
    console.log('[WebRTCService] Handling remote stream:', stream);
    const event = new CustomEvent('remote-stream', { detail: stream });
    window.dispatchEvent(event);
  }

  private handleShareStopped() {
    console.log('[WebRTCService] Handling share stopped');
    const event = new CustomEvent('share-stopped');
    window.dispatchEvent(event);
    this.cleanup();
  }

  private cleanup() {
    console.log('[WebRTCService] Cleaning up resources');
    this.isReconnecting = false;
    this.reconnectionAttempts = 0;
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
        console.log('[WebRTCService] Stopped track:', track.kind);
      });
      this.stream = null;
    }
    
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }

  public async startScreenShare(roomId: string): Promise<MediaStream> {
    if (!this.socket?.connected) {
      console.log('[WebRTCService] Socket not connected, attempting to reconnect...');
      this.socket = SocketManager.getInstance().connect();
      
      // Wait for socket connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Socket connection timeout'));
        }, 5000);

        const handleConnect = () => {
          clearTimeout(timeout);
          this.socket?.off('connect', handleConnect);
          resolve();
        };

        this.socket?.once('connect', handleConnect);
      });
    }

    this.roomId = roomId;
    this.cleanup();
    
    try {
      console.log('[WebRTCService] Starting screen share for room:', roomId);
      
      // Join the room first
      this.socket?.emit('join-room', roomId);
      
      // Get screen share stream
      this.stream = await this.getDisplayMedia();

      this.initializePeerConnection();

      this.stream.getTracks().forEach(track => {
        if (this.stream) {
          console.log('[WebRTCService] Adding track to peer connection:', track.kind);
          this.peerConnection?.addTrack(track, this.stream);
        }
      });

      const offer = await this.peerConnection?.createOffer();
      if (!offer) throw new Error('Failed to create offer');
      
      await this.peerConnection?.setLocalDescription(offer);
      console.log('[WebRTCService] Sending offer for room:', roomId);
      this.socket?.emit('offer', { roomId, offer });

      return this.stream;
    } catch (error) {
      console.error('[WebRTCService] Error in startScreenShare:', error);
      this.cleanup();
      throw error;
    }
  }

  public stopScreenShare() {
    if (!this.roomId) {
      console.warn('[WebRTCService] No room ID available for stopping screen share');
      return;
    }
    
    console.log('[WebRTCService] Stopping screen share for room:', this.roomId);
    this.socket?.emit('screenShare:stop', { to: this.roomId });
    this.cleanup();
  }

  public disconnect() {
    console.log('[WebRTCService] Disconnecting service');
    this.cleanup();
    this.roomId = null;
  }

  private async getDisplayMedia(): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
          cursor: 'always',
          displaySurface: 'monitor'
        },
        audio: false
      });
      return stream;
    } catch (error) {
      console.error('Failed to get display media:', error);
      throw error;
    }
  }
}

export const webRTCService = new WebRTCService(); 