import { EventEmitter } from './EventEmitter';
import { io, Socket } from 'socket.io-client';

export enum SignalingMessageType {
  REGISTER = 'REGISTER',
  CALL_OFFER = 'CALL_OFFER',
  CALL_ANSWER = 'CALL_ANSWER',
  ICE_CANDIDATE = 'ICE_CANDIDATE',
  CALL_REJECT = 'CALL_REJECT',
  CALL_HANGUP = 'CALL_HANGUP',
}

interface SignalingMessage {
  type: SignalingMessageType;
  from: string;
  to: string;
  data: any;
}

class SignalingService extends EventEmitter {
  private socket: Socket | null = null;
  private userId: string | null = null;

  constructor() {
    super();
    this.handleMessage = this.handleMessage.bind(this);
  }

  connect(userId: string) {
    this.userId = userId;
    
    console.log('Attempting to connect to signaling server at http://localhost:3001');
    
    this.socket = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      autoConnect: true
    });

    this.socket.on('connect', () => {
      console.log('Successfully connected to signaling server');
      this.sendMessage({
        type: SignalingMessageType.REGISTER,
        from: userId,
        to: '',
        data: null,
      });
    });

    this.socket.on('connect_error', (error) => {
      console.error('Signaling server connection error:', error.message);
      console.error('Make sure the signaling server is running on port 3001');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from signaling server:', reason);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Reconnected to signaling server after', attemptNumber, 'attempts');
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('Signaling server reconnection error:', error.message);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Failed to reconnect to signaling server after maximum attempts');
    });

    this.socket.on('message', this.handleMessage);
    this.socket.on('error', (error) => {
      console.error('Socket.IO error:', error);
    });
  }

  private handleMessage(data: string) {
    try {
      const message: SignalingMessage = JSON.parse(data);
      this.emit(message.type, message);
    } catch (error) {
      console.error('Error parsing signaling message:', error);
    }
  }

  sendCallOffer(to: string, offer: RTCSessionDescriptionInit, isVideo: boolean) {
    this.sendMessage({
      type: SignalingMessageType.CALL_OFFER,
      from: this.userId!,
      to,
      data: { offer, isVideo },
    });
  }

  sendCallAnswer(to: string, answer: RTCSessionDescriptionInit) {
    this.sendMessage({
      type: SignalingMessageType.CALL_ANSWER,
      from: this.userId!,
      to,
      data: { answer },
    });
  }

  sendIceCandidate(to: string, candidate: RTCIceCandidate) {
    this.sendMessage({
      type: SignalingMessageType.ICE_CANDIDATE,
      from: this.userId!,
      to,
      data: { candidate },
    });
  }

  sendCallReject(to: string) {
    this.sendMessage({
      type: SignalingMessageType.CALL_REJECT,
      from: this.userId!,
      to,
      data: null,
    });
  }

  sendCallHangup(to: string) {
    this.sendMessage({
      type: SignalingMessageType.CALL_HANGUP,
      from: this.userId!,
      to,
      data: null,
    });
  }

  private sendMessage(message: SignalingMessage) {
    if (this.socket?.connected) {
      this.socket.emit('message', JSON.stringify(message));
    } else {
      console.error('Socket is not connected - cannot send message');
      console.error('Current socket state:', this.socket?.connected ? 'connected' : 'disconnected');
    }
  }

  disconnect() {
    if (this.socket) {
      console.log('Disconnecting from signaling server');
      this.socket.disconnect();
      this.socket = null;
    }
    this.userId = null;
  }

  // Helper method to check connection status
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const signalingService = new SignalingService(); 
 