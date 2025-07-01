import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Socket } from 'socket.io-client';
import SignalingSocketManager from '../utils/signalingSocketManager';

interface UseRemoteAccessProps {
  userId: string;
  onError?: (error: string) => void;
  onRemoteAccessStarted?: (targetUserId: string) => void;
  onRemoteAccessStopped?: () => void;
  onBeingControlled?: (controllerUserId: string) => void;
  onControlStopped?: () => void;
}

interface UseRemoteAccessReturn {
  isControlling: boolean;
  isBeingControlled: boolean;
  controllingUserId: string | null;
  controlledByUserId: string | null;
  startRemoteAccess: (targetUserId: string) => Promise<void>;
  stopRemoteAccess: () => void;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  hasRemoteStream: boolean; // Direct boolean for easier checking
  remoteStreamId: string | undefined; // Direct stream ID
  error: string | null;
  _forceUpdateCounter: number; // Internal counter to force re-renders
}

// 🔥 GLOBAL STATE MANAGER: Ensures single instance and shared state
class RemoteAccessStateManager {
  private static instance: RemoteAccessStateManager | null = null;
  private isInitialized = false;
  private subscribers = new Set<() => void>();
  private socketManager = SignalingSocketManager.getInstance();
  
  // Shared state
  public state = {
    isControlling: false,
    isBeingControlled: false,
    controllingUserId: null as string | null,
    controlledByUserId: null as string | null,
    error: null as string | null,
    localStream: null as MediaStream | null,
    remoteStream: null as MediaStream | null,
    forceUpdateCounter: 0
  };

  // Connection-specific state
  private peerConnection: RTCPeerConnection | null = null;
  private roomId: string | null = null;
  private queuedIceCandidates: RTCIceCandidateInit[] = [];
  private processedOffers = new Set<string>();
  private currentUserId: string | null = null;

  static getInstance(): RemoteAccessStateManager {
    if (!this.instance) {
      this.instance = new RemoteAccessStateManager();
    }
    return this.instance;
  }

  private constructor() {
    // Private constructor for singleton
  }

  subscribe(callback: () => void) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notify() {
    this.state.forceUpdateCounter++;
    this.subscribers.forEach(callback => callback());
  }

  setState(updates: Partial<typeof this.state>) {
    Object.assign(this.state, updates);
    this.notify();
  }

  // Initialize for a specific user (only once)
  async initialize(userId: string, callbacks: {
    onError?: (error: string) => void;
    onRemoteAccessStarted?: (targetUserId: string) => void;
    onRemoteAccessStopped?: () => void;
    onBeingControlled?: (controllerUserId: string) => void;
    onControlStopped?: () => void;
  }) {
    if (this.isInitialized && this.currentUserId === userId) {
      console.log('[RemoteAccessStateManager] Already initialized for user:', userId);
      return;
    }

    if (this.isInitialized && this.currentUserId !== userId) {
      console.log('[RemoteAccessStateManager] Switching user from', this.currentUserId, 'to', userId);
      this.cleanup();
    }

    console.log('[RemoteAccessStateManager] 🚀 Initializing for user:', userId);
    this.currentUserId = userId;
    this.isInitialized = true;

    // Store callbacks
    this.callbacks = callbacks;

    // Register event handlers
    this.registerEventHandlers();

    // Connect socket if needed
    if (!this.socketManager.isConnected()) {
      this.socketManager.connect(userId);
      
      setTimeout(() => {
        if (this.socketManager.isConnected()) {
          console.log('[RemoteAccessStateManager] 📝 Sending registration for user:', userId);
          this.socketManager.emit('message', JSON.stringify({
            type: 'REGISTER',
            from: userId
          }));
        }
      }, 100);
    }
  }

  private callbacks: any = {};

  private registerEventHandlers() {
    // Remove any existing listeners first
    this.socketManager.removeEventListener('remote-access-request', this.handleRemoteAccessRequest);
    this.socketManager.removeEventListener('remote-access-offer', this.handleRemoteAccessOffer);
    this.socketManager.removeEventListener('remote-access-answer', this.handleRemoteAccessAnswer);
    this.socketManager.removeEventListener('remote-access-ice-candidate', this.handleRemoteAccessIceCandidate);
    this.socketManager.removeEventListener('remote-access-stopped', this.handleRemoteAccessStopped);
    this.socketManager.removeEventListener('remote-access-debug', this.handleRemoteAccessDebug);

    // Add new listeners
    this.socketManager.addEventListener('remote-access-request', this.handleRemoteAccessRequest);
    this.socketManager.addEventListener('remote-access-offer', this.handleRemoteAccessOffer);
    this.socketManager.addEventListener('remote-access-answer', this.handleRemoteAccessAnswer);
    this.socketManager.addEventListener('remote-access-ice-candidate', this.handleRemoteAccessIceCandidate);
    this.socketManager.addEventListener('remote-access-stopped', this.handleRemoteAccessStopped);
    this.socketManager.addEventListener('remote-access-debug', this.handleRemoteAccessDebug);

    console.log('[RemoteAccessStateManager] ✅ Event handlers registered');
  }

  cleanup() {
    console.log('[RemoteAccessStateManager] 🧹 Cleaning up...');
    
    // Reset state
    this.setState({
      isControlling: false,
      isBeingControlled: false,
      controllingUserId: null,
      controlledByUserId: null,
      error: null,
      localStream: null,
      remoteStream: null
    });

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Reset connection state
    this.roomId = null;
    this.queuedIceCandidates = [];
    this.processedOffers.clear();

    // Remove event listeners
    this.socketManager.removeEventListener('remote-access-request', this.handleRemoteAccessRequest);
    this.socketManager.removeEventListener('remote-access-offer', this.handleRemoteAccessOffer);
    this.socketManager.removeEventListener('remote-access-answer', this.handleRemoteAccessAnswer);
    this.socketManager.removeEventListener('remote-access-ice-candidate', this.handleRemoteAccessIceCandidate);
    this.socketManager.removeEventListener('remote-access-stopped', this.handleRemoteAccessStopped);
    this.socketManager.removeEventListener('remote-access-debug', this.handleRemoteAccessDebug);

    this.isInitialized = false;
    this.currentUserId = null;
  }

  // Event handlers (bound methods to maintain context)
  private handleRemoteAccessRequest = async (data: { fromUserId: string; roomId: string; targetUserId: string }) => {
    console.log('[RemoteAccessStateManager] 📨 Remote access request:', data);
    // This user is being asked to share their screen
    if (data.targetUserId !== this.currentUserId) return;

    try {
      // Auto-accept the request and start screen sharing
      this.roomId = data.roomId;
      this.setState({ controlledByUserId: data.fromUserId, isBeingControlled: true });
      
      // Start screen capture and create offer
      await this.startScreenSharing(data.roomId, data.fromUserId);
      
      this.callbacks.onBeingControlled?.(data.fromUserId);
    } catch (error) {
      console.error('[RemoteAccessStateManager] Error handling remote access request:', error);
      this.setState({ error: error instanceof Error ? error.message : String(error) });
    }
  };

  private handleRemoteAccessOffer = async (data: { roomId: string; offer: RTCSessionDescriptionInit; targetUserId: string }) => {
    console.log('[RemoteAccessStateManager] 📨 🎯 RECEIVED REMOTE-ACCESS-OFFER:', data);
    console.log('[RemoteAccessStateManager] 🔍 Current user ID:', this.currentUserId);
    console.log('[RemoteAccessStateManager] 🔍 Target user ID in offer:', data.targetUserId);
    console.log('[RemoteAccessStateManager] 🔍 Current room ID:', this.roomId);
    console.log('[RemoteAccessStateManager] 🔍 Offer room ID:', data.roomId);

    // Validate this offer is for us
    if (data.targetUserId !== this.currentUserId) {
      console.log('[RemoteAccessStateManager] ❌ Offer not for this user');
      return;
    }

    if (this.roomId && this.roomId !== data.roomId) {
      console.log('[RemoteAccessStateManager] ❌ Offer for different room');
      return;
    }

    // Check for duplicate offers
    const offerId = `${data.roomId}-${data.targetUserId}`;
    if (this.processedOffers.has(offerId)) {
      console.log('[RemoteAccessStateManager] 🔄 Duplicate offer detected, ignoring:', offerId);
      return;
    }

    this.processedOffers.add(offerId);
    this.roomId = data.roomId;

    try {
      // Create or get peer connection
      if (!this.peerConnection) {
        this.createPeerConnection();
      }

      // Set remote description
      await this.peerConnection!.setRemoteDescription(data.offer);
      console.log('[RemoteAccessStateManager] ✅ Set remote description from offer');

      // Process queued ICE candidates
      if (this.queuedIceCandidates.length > 0) {
        console.log('[RemoteAccessStateManager] 🧊 Processing', this.queuedIceCandidates.length, 'queued ICE candidates');
        for (const candidate of this.queuedIceCandidates) {
          await this.peerConnection!.addIceCandidate(candidate);
          console.log('[RemoteAccessStateManager] ✅ Added queued ICE candidate');
        }
        this.queuedIceCandidates = [];
      }

      // Create and send answer
      const answer = await this.peerConnection!.createAnswer();
      await this.peerConnection!.setLocalDescription(answer);
      
      this.socketManager.emit('remote-access-answer', {
        roomId: data.roomId,
        answer
      });

      console.log('[RemoteAccessStateManager] 📤 Sent answer for remote access');
    } catch (error) {
      console.error('[RemoteAccessStateManager] Error processing offer:', error);
      this.setState({ error: error instanceof Error ? error.message : String(error) });
    }
  };

  private handleRemoteAccessAnswer = async (data: { roomId: string; answer: RTCSessionDescriptionInit }) => {
    console.log('[RemoteAccessStateManager] 📨 Remote access answer:', data);
    
    if (data.roomId !== this.roomId) return;
    if (!this.peerConnection) return;

    try {
      await this.peerConnection.setRemoteDescription(data.answer);
      console.log('[RemoteAccessStateManager] ✅ Set remote description from answer');
    } catch (error) {
      console.error('[RemoteAccessStateManager] Error setting remote description:', error);
      this.setState({ error: error instanceof Error ? error.message : String(error) });
    }
  };

  private handleRemoteAccessIceCandidate = async (data: { roomId: string; candidate: RTCIceCandidateInit }) => {
    if (data.roomId !== this.roomId) return;
    
    if (!this.peerConnection || !this.peerConnection.remoteDescription) {
      console.log('[RemoteAccessStateManager] 🧊 Remote description not set yet, queuing ICE candidate');
      this.queuedIceCandidates.push(data.candidate);
      return;
    }

    try {
      await this.peerConnection.addIceCandidate(data.candidate);
      console.log('[RemoteAccessStateManager] ✅ Added ICE candidate immediately');
    } catch (error) {
      console.error('[RemoteAccessStateManager] Error adding ICE candidate:', error);
    }
  };

  private handleRemoteAccessStopped = () => {
    console.log('[RemoteAccessStateManager] 📨 Remote access stopped');
    this.stopRemoteAccess();
  };

  private handleRemoteAccessDebug = (data: { type: string; fromUserId: string; toUserId: string; message: string; roomId: string }) => {
    console.log('[RemoteAccessStateManager] 🐛 DEBUG MESSAGE:', data);
    
    if (data.toUserId !== this.currentUserId) return;

    switch (data.type) {
      case 'REQUEST_RECEIVED':
        console.log('[RemoteAccessStateManager] ✅ Target user confirmed they received the request!');
        break;
      case 'STARTING_CAPTURE':
        console.log('[RemoteAccessStateManager] 🎥 Target user is starting screen capture...');
        break;
      case 'OFFER_SENT':
        console.log('[RemoteAccessStateManager] 📤 Target user sent the offer successfully!');
        console.log('[RemoteAccessStateManager] 🎯 You should see the remote screen soon...');
        break;
    }
  };

  // Helper methods
  private createPeerConnection(): void {
    console.log('[RemoteAccessStateManager] 🔧 ===== CREATING PEER CONNECTION =====');
    
    this.peerConnection = new RTCPeerConnection(rtcConfig);
    console.log('[RemoteAccessStateManager] ✅ RTCPeerConnection created successfully');

    // Set up event handlers
    this.peerConnection.ontrack = (event) => {
      console.log('[RemoteAccessStateManager] 🎯 ===== REMOTE TRACK EVENT RECEIVED =====');
      console.log('[RemoteAccessStateManager] 📊 Track event details:', {
        streams: event.streams.length,
        track: event.track.kind,
        trackId: event.track.id,
        trackState: event.track.readyState
      });
      
      const stream = event.streams[0];
      
      if (stream) {
        console.log('[RemoteAccessStateManager] 🎥 ===== SETTING REMOTE STREAM =====');
        console.log('[RemoteAccessStateManager] 📊 Remote stream details:', {
          id: stream.id,
          tracks: stream.getTracks().length,
          videoTracks: stream.getVideoTracks().length,
          active: stream.active
        });
        
        this.setState({ 
          remoteStream: stream,
          isControlling: true,
          controllingUserId: this.roomId?.split('-to-')[1]?.split('-')[0] || null
        });
        
        // Extract target user ID from room ID and trigger callback
        if (this.roomId) {
          const targetUserId = this.roomId.split('-to-')[1]?.split('-').slice(0, 5).join('-');
          if (targetUserId) {
            console.log('[RemoteAccessStateManager] 🔔 Triggering onRemoteAccessStarted for:', targetUserId);
            this.callbacks.onRemoteAccessStarted?.(targetUserId);
          }
        }
      } else {
        console.log('[RemoteAccessStateManager] ⚠️ No stream in track event');
      }
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.roomId) {
        console.log('[RemoteAccessStateManager] Sending ICE candidate');
        this.socketManager.emit('remote-access-ice-candidate', {
          roomId: this.roomId,
          candidate: event.candidate
        });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log('[RemoteAccessStateManager] 🔄 Peer connection state changed:', this.peerConnection?.connectionState);
      if (this.peerConnection?.connectionState === 'connected') {
        console.log('[RemoteAccessStateManager] ✅ Remote access peer connection established');
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('[RemoteAccessStateManager] 🧊 ICE connection state changed:', this.peerConnection?.iceConnectionState);
    };

    console.log('[RemoteAccessStateManager] ✅ Peer connection ready and configured');
  }

  private async startScreenSharing(roomId: string, requestingUserId: string): Promise<void> {
    try {
      // Create peer connection for screen sharing
      if (!this.peerConnection) {
        this.createPeerConnection();
      }

      console.log('[RemoteAccessStateManager] 🎥 Starting screen capture...');
      
      let screenStream: MediaStream;

      // Use Electron's native screen capture if available
      if (window.electronAPI && window.electronAPI.getDesktopSources) {
        console.log('[RemoteAccessStateManager] 🔌 Using Electron desktop capturer');
        
        // Get available desktop sources
        const sources = await window.electronAPI.getDesktopSources({
          types: ['screen'],
          thumbnailSize: { width: 320, height: 240 }
        });

        if (sources.length === 0) {
          throw new Error('No screen sources available');
        }

        // Use the first screen (primary display)
        const primarySource = sources[0];
        console.log('[RemoteAccessStateManager] 📺 Using screen source:', primarySource.name);

        // Create media stream using Electron's chromeMediaSource
        screenStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: primarySource.id,
              minWidth: 1280,
              maxWidth: 3840,
              minHeight: 720,
              maxHeight: 2160,
              minFrameRate: 30,
              maxFrameRate: 60
            }
          } as any
        });

        console.log('[RemoteAccessStateManager] ✅ Electron screen capture started successfully');
      } else {
        console.log('[RemoteAccessStateManager] 🌐 Falling back to browser getDisplayMedia');
        
        // Fallback to browser getDisplayMedia (this will still fail without user gesture)
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: 'always',
            displaySurface: 'monitor',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30, max: 60 }
          },
          audio: false
        });

        console.log('[RemoteAccessStateManager] ✅ Browser screen capture started successfully');
      }

      console.log('[RemoteAccessStateManager] 📊 Screen stream details:', {
        id: screenStream.id,
        tracks: screenStream.getTracks().length,
        videoTracks: screenStream.getVideoTracks().length,
        active: screenStream.active
      });

      // Store the local stream
      this.setState({ 
        localStream: screenStream,
        isBeingControlled: true,
        controlledByUserId: requestingUserId
      });

      // Add screen stream tracks to peer connection
      screenStream.getTracks().forEach(track => {
        console.log('[RemoteAccessStateManager] 🎬 Adding track to peer connection:', {
          kind: track.kind,
          id: track.id,
          enabled: track.enabled,
          readyState: track.readyState
        });
        this.peerConnection!.addTrack(track, screenStream);
      });

      // Handle stream end (when user stops sharing)
      screenStream.getVideoTracks().forEach(track => {
        track.addEventListener('ended', () => {
          console.log('[RemoteAccessStateManager] 🛑 Screen capture track ended');
          this.stopRemoteAccess();
        });
      });

      // Create offer with proper video receiving capability
      const offer = await this.peerConnection!.createOffer({
        offerToReceiveVideo: true,  // ✅ Now we can receive video from the viewer
        offerToReceiveAudio: false
      });
      
      await this.peerConnection!.setLocalDescription(offer);
      
      // Send offer to requesting user
      this.socketManager.emit('remote-access-offer', {
        roomId,
        offer,
        targetUserId: requestingUserId
      });

      console.log('[RemoteAccessStateManager] 📤 Screen sharing offer sent with video tracks');
      
      // Send debug message to viewer
      this.socketManager.emit('remote-access-debug', {
        targetUserId: requestingUserId,
        message: 'Screen capture started and offer sent successfully!'
      });

    } catch (error) {
      console.error('[RemoteAccessStateManager] Error starting screen sharing:', error);
      
      // Send debug message about the error
      this.socketManager.emit('remote-access-debug', {
        targetUserId: requestingUserId,
        message: `Screen capture failed: ${error instanceof Error ? error.message : String(error)}`
      });
      
      throw error;
    }
  }

  // Public methods for hook to use
  async startRemoteAccess(targetUserId: string): Promise<void> {
    console.log('[RemoteAccessStateManager] 🎮 Starting remote access for target:', targetUserId);
    
    if (!this.currentUserId) {
      throw new Error('User ID not set');
    }

    try {
      // Create peer connection for receiving
      if (!this.peerConnection) {
        this.createPeerConnection();
      }

      // Generate room ID
      const roomId = `remote-access-${this.currentUserId}-to-${targetUserId}-${Date.now()}`;
      this.roomId = roomId;

      // Join room
      this.socketManager.emit('join-room', roomId);

      // Send remote access request
      this.socketManager.emit('remote-access-request', {
        targetUserId,
        roomId,
        fromUserId: this.currentUserId
      });

      console.log('[RemoteAccessStateManager] ✅ Remote access request sent successfully');
    } catch (error) {
      console.error('[RemoteAccessStateManager] Error starting remote access:', error);
      this.setState({ error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  stopRemoteAccess(): void {
    console.log('[RemoteAccessStateManager] 🛑 Stopping remote access');
    
    // Stop local stream tracks if we have them (screen capture)
    if (this.state.localStream) {
      console.log('[RemoteAccessStateManager] 🛑 Stopping local stream tracks');
      this.state.localStream.getTracks().forEach(track => {
        track.stop();
        console.log('[RemoteAccessStateManager] 🛑 Stopped track:', track.kind);
      });
    }
    
    if (this.roomId) {
      this.socketManager.emit('remote-access-stopped', { roomId: this.roomId });
    }

    // Reset state
    this.setState({
      isControlling: false,
      isBeingControlled: false,
      controllingUserId: null,
      controlledByUserId: null,
      remoteStream: null,
      localStream: null
    });

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Reset connection state
    this.roomId = null;
    this.queuedIceCandidates = [];
    this.processedOffers.clear();

    // Trigger callbacks
    this.callbacks.onRemoteAccessStopped?.();
    this.callbacks.onControlStopped?.();
  }
}

// WebRTC configuration with STUN/TURN servers
const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302'] },
    { urls: ['stun:stun1.l.google.com:19302'] },
    { urls: ['stun:stun2.l.google.com:19302'] },
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
  iceCandidatePoolSize: 10,
};

export const useRemoteAccess = ({ 
  userId, 
  onError,
  onRemoteAccessStarted,
  onRemoteAccessStopped,
  onBeingControlled,
  onControlStopped
}: UseRemoteAccessProps): UseRemoteAccessReturn => {
  // 🔥 CRITICAL: Early validation to prevent unnecessary processing
  const isValidUserId = useMemo(() => userId && userId.trim() && userId !== '', [userId]);

  // 🔥 SINGLETON: Get the single state manager instance
  const stateManager = useMemo(() => RemoteAccessStateManager.getInstance(), []);

  // 🔥 LOCAL STATE: Force re-renders when global state changes
  const [, forceUpdate] = useState(0);

  // 🔥 SUBSCRIPTION: Subscribe to state changes
  useEffect(() => {
    const unsubscribe = stateManager.subscribe(() => {
      forceUpdate(prev => prev + 1);
    });
    return () => {
      unsubscribe();
    };
  }, [stateManager]);

  // 🔥 INITIALIZATION: Initialize state manager for this user
  useEffect(() => {
    if (!isValidUserId) {
      console.log('[useRemoteAccess] 🛑 Skipping initialization - invalid userId:', userId);
        return;
      }

    stateManager.initialize(userId, {
      onError,
      onRemoteAccessStarted,
      onRemoteAccessStopped,
      onBeingControlled,
      onControlStopped
    });

    // No cleanup needed - state manager handles multiple subscribers
  }, [isValidUserId, userId, stateManager, onError, onRemoteAccessStarted, onRemoteAccessStopped, onBeingControlled, onControlStopped]);

  // 🔥 STABLE METHODS: Bound to state manager
  const startRemoteAccess = useCallback(async (targetUserId: string) => {
    return stateManager.startRemoteAccess(targetUserId);
  }, [stateManager]);

  const stopRemoteAccess = useCallback(() => {
    return stateManager.stopRemoteAccess();
  }, [stateManager]);

  // 🔥 COMPUTED VALUES: Derived from global state
  const hasRemoteStream = Boolean(stateManager.state.remoteStream);
  const remoteStreamId = stateManager.state.remoteStream?.id;

  // Return state from singleton manager
  return {
    isControlling: stateManager.state.isControlling,
    isBeingControlled: stateManager.state.isBeingControlled,
    controllingUserId: stateManager.state.controllingUserId,
    controlledByUserId: stateManager.state.controlledByUserId,
    startRemoteAccess,
    stopRemoteAccess,
    localStream: stateManager.state.localStream,
    remoteStream: stateManager.state.remoteStream,
    hasRemoteStream,
    remoteStreamId,
    error: stateManager.state.error,
    _forceUpdateCounter: stateManager.state.forceUpdateCounter
  };
}; 