import { EventEmitter } from './EventEmitter';
import { signalingService, SignalingMessageType } from './signalingService';
import { WEBRTC_CONFIG } from '../config/webrtc';

interface CallOptions {
  video?: boolean;
  audio?: boolean;
}

class CallService extends EventEmitter {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private currentCallId: string | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 3;
  private isReconnecting: boolean = false;

  constructor() {
    super();
    this.initializePeerConnection = this.initializePeerConnection.bind(this);
    this.handleIceCandidate = this.handleIceCandidate.bind(this);
    this.handleTrack = this.handleTrack.bind(this);
    this.setupSignalingHandlers();
  }

  private setupSignalingHandlers() {
    signalingService.on(SignalingMessageType.CALL_OFFER, async (message) => {
      this.emit('incomingCall', {
        userId: message.from,
        offer: message.data.offer,
        isVideo: message.data.isVideo,
      });
    });

    signalingService.on(SignalingMessageType.CALL_ANSWER, async (message) => {
      await this.handleAnswer(message.data.answer);
    });

    signalingService.on(SignalingMessageType.ICE_CANDIDATE, async (message) => {
      await this.addIceCandidate(message.data.candidate);
    });

    signalingService.on(SignalingMessageType.CALL_REJECT, (message) => {
      this.emit('callRejected', message.from);
      this.endCall();
    });

    signalingService.on(SignalingMessageType.CALL_HANGUP, (message) => {
      this.emit('callEnded', message.from);
      this.endCall();
    });
  }

  private async attemptReconnect() {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS || !this.currentCallId) {
      this.emit('callError', 'Failed to reconnect after multiple attempts');
      this.endCall();
      return;
    }

    this.reconnectAttempts++;
    this.isReconnecting = true;
    console.log(`[CallService] Reconnection attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}`);

    try {
      await this.initializePeerConnection();
      
      // Re-add existing tracks
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          if (this.peerConnection && this.localStream) {
            this.peerConnection.addTrack(track, this.localStream);
          }
        });
      }

      // Create new offer with ICE restart
      const offer = await this.peerConnection?.createOffer({ iceRestart: true });
      if (!offer || !this.peerConnection) throw new Error('Failed to create offer');
      
      await this.peerConnection.setLocalDescription(offer);
      signalingService.sendCallOffer(this.currentCallId, offer, this.localStream?.getVideoTracks().length > 0);
    } catch (error) {
      console.error('[CallService] Reconnection failed:', error);
      setTimeout(() => this.attemptReconnect(), 2000);
    }
  }

  private initializePeerConnection() {
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    this.peerConnection = new RTCPeerConnection(WEBRTC_CONFIG);
    
    // Set up event handlers
    this.peerConnection.onicecandidate = this.handleIceCandidate;
    this.peerConnection.ontrack = this.handleTrack;
    
    // Connection state monitoring
    this.peerConnection.onconnectionstatechange = () => {
      console.log('[CallService] Connection state:', this.peerConnection?.connectionState);
      
      if (this.peerConnection?.connectionState === 'connected') {
        console.log('[CallService] ✅ WebRTC connection established');
        this.isReconnecting = false;
        this.reconnectAttempts = 0;
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }
      } else if (this.peerConnection?.connectionState === 'failed' && !this.isReconnecting) {
        console.error('[CallService] Connection failed - attempting to reconnect');
        this.attemptReconnect();
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('[CallService] ICE connection state:', this.peerConnection?.iceConnectionState);
      
      if (this.peerConnection?.iceConnectionState === 'checking') {
        // Set a timeout for ICE connection establishment
        if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
        this.connectionTimeout = setTimeout(() => {
          if (this.peerConnection?.iceConnectionState === 'checking') {
            console.error('[CallService] ICE connection timeout');
            this.attemptReconnect();
          }
        }, 10000); // 10 second timeout
      } else if (this.peerConnection?.iceConnectionState === 'connected') {
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }
      } else if (this.peerConnection?.iceConnectionState === 'failed' && !this.isReconnecting) {
        console.error('[CallService] ICE connection failed');
        this.attemptReconnect();
      }
    };

    // Monitor ICE gathering state
    this.peerConnection.onicegatheringstatechange = () => {
      console.log('[CallService] ICE gathering state:', this.peerConnection?.iceGatheringState);
    };

    return Promise.resolve();
  }

  private handleIceCandidate(event: RTCPeerConnectionIceEvent) {
    if (event.candidate && this.currentCallId) {
      console.log('[CallService] New ICE candidate:', event.candidate.type);
      signalingService.sendIceCandidate(this.currentCallId, event.candidate);
    }
  }

  private handleTrack(event: RTCTrackEvent) {
    console.log('[CallService] Received remote track:', event.track.kind);
    this.remoteStream = event.streams[0];
    this.emit('remoteStream', this.remoteStream);
  }

  async startCall(userId: string, options: CallOptions = { audio: true, video: false }) {
    try {
      this.currentCallId = userId;
      this.reconnectAttempts = 0;
      this.isReconnecting = false;
      await this.initializePeerConnection();

      // Get user media with constraints
      const constraints = {
        audio: options.audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false,
        video: options.video ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Add tracks to peer connection
      this.localStream.getTracks().forEach(track => {
        if (this.peerConnection && this.localStream) {
          console.log('[CallService] Adding track to peer connection:', track.kind);
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      // Create and send offer
      const offer = await this.peerConnection!.createOffer();
      await this.peerConnection!.setLocalDescription(offer);
      console.log('[CallService] Sending call offer to:', userId);
      signalingService.sendCallOffer(userId, offer, options.video || false);

      // Emit local stream
      this.emit('localStream', this.localStream);
      return this.localStream;
    } catch (error) {
      console.error('[CallService] Error starting call:', error);
      this.endCall();
      throw error;
    }
  }

  async handleIncomingCall(offer: RTCSessionDescriptionInit, userId: string) {
    try {
      this.currentCallId = userId;
      this.reconnectAttempts = 0;
      this.isReconnecting = false;
      await this.initializePeerConnection();

      // Check if the offer includes video
      const hasVideo = offer.sdp?.includes('m=video');
      
      // Get user media
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: hasVideo ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Add tracks to peer connection
      this.localStream.getTracks().forEach(track => {
        if (this.peerConnection && this.localStream) {
          console.log('[CallService] Adding track to peer connection:', track.kind);
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      // Set remote description
      console.log('[CallService] Setting remote description for incoming call');
      await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offer));

      // Create and send answer
      const answer = await this.peerConnection!.createAnswer();
      await this.peerConnection!.setLocalDescription(answer);
      console.log('[CallService] Sending call answer to:', userId);
      signalingService.sendCallAnswer(userId, answer);

      // Emit local stream
      this.emit('localStream', this.localStream);
      return this.localStream;
    } catch (error) {
      console.error('[CallService] Error handling incoming call:', error);
      this.endCall();
      throw error;
    }
  }

  rejectCall(userId: string) {
    signalingService.sendCallReject(userId);
    this.endCall();
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (this.peerConnection) {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    if (this.peerConnection) {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  endCall() {
    if (this.currentCallId) {
      signalingService.sendCallHangup(this.currentCallId);
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.currentCallId = null;
    this.emit('callEnded');
  }

  isInCall() {
    return this.currentCallId !== null;
  }

  getLocalStream() {
    return this.localStream;
  }

  getRemoteStream() {
    return this.remoteStream;
  }
}

export const callService = new CallService(); 