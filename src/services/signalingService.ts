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
    this.socket = io('http://localhost:3000');

    this.socket.on('connect', () => {
      this.sendMessage({
        type: SignalingMessageType.REGISTER,
        from: userId,
        to: '',
        data: null,
      });
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
      console.error('Socket is not connected');
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.userId = null;
  }
}

export const signalingService = new SignalingService(); 
 