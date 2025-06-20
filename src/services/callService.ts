import { EventEmitter } from './EventEmitter';
import { signalingService, SignalingMessageType } from './signalingService';

interface CallOptions {
  video?: boolean;
  audio?: boolean;
}

class CallService extends EventEmitter {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private currentCallId: string | null = null;

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

  private initializePeerConnection() {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    this.peerConnection = new RTCPeerConnection(configuration);
    this.peerConnection.onicecandidate = this.handleIceCandidate;
    this.peerConnection.ontrack = this.handleTrack;
  }

  private handleIceCandidate(event: RTCPeerConnectionIceEvent) {
    if (event.candidate && this.currentCallId) {
      signalingService.sendIceCandidate(this.currentCallId, event.candidate);
    }
  }

  private handleTrack(event: RTCTrackEvent) {
    this.remoteStream = event.streams[0];
    this.emit('remoteStream', this.remoteStream);
  }

  async startCall(userId: string, options: CallOptions = { audio: true, video: false }) {
    try {
      this.currentCallId = userId;
      this.initializePeerConnection();

      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: options.audio,
        video: options.video,
      });

      // Add tracks to peer connection
      this.localStream.getTracks().forEach(track => {
        if (this.peerConnection && this.localStream) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      // Create and send offer
      const offer = await this.peerConnection!.createOffer();
      await this.peerConnection!.setLocalDescription(offer);

      // Send offer through signaling service
      signalingService.sendCallOffer(userId, offer, !!options.video);

      // Emit local stream
      this.emit('localStream', this.localStream);

      return this.localStream;
    } catch (error) {
      console.error('Error starting call:', error);
      this.endCall();
      throw error;
    }
  }

  async handleIncomingCall(offer: RTCSessionDescriptionInit, userId: string) {
    try {
      this.currentCallId = userId;
      this.initializePeerConnection();

      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      // Add tracks to peer connection
      this.localStream.getTracks().forEach(track => {
        if (this.peerConnection && this.localStream) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      // Set remote description
      await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offer));

      // Create and send answer
      const answer = await this.peerConnection!.createAnswer();
      await this.peerConnection!.setLocalDescription(answer);

      // Send answer through signaling service
      signalingService.sendCallAnswer(userId, answer);

      // Emit local stream
      this.emit('localStream', this.localStream);

      return this.localStream;
    } catch (error) {
      console.error('Error handling incoming call:', error);
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