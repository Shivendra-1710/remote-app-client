import { useState, useCallback, useRef, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import SignalingSocketManager from '../utils/signalingSocketManager';

interface DesktopCapturerSource {
  id: string;
  name: string;
  thumbnail: HTMLImageElement;
  display_id: string;
  appIcon: HTMLImageElement | null;
}

interface UseScreenShareProps {
  userId: string;
  onError?: (error: string) => void;
  onRemoteShareStarted?: (userId: string) => void;
  onRemoteShareStopped?: () => void;
}

interface UseScreenShareReturn {
  isSharing: boolean;
  isRemoteSharing: boolean;
  sharingWithUserId: string | null;
  viewingFromUserId: string | null;
  startSharing: (targetUserId?: string) => Promise<void>;
  stopSharing: () => void;
  acceptRemoteShare: (remoteUserId: string) => Promise<void>;
  rejectRemoteShare: () => void;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  error: string | null;
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

// Get singleton socket manager instance
const socketManager = SignalingSocketManager.getInstance();

// Debug logging to verify the singleton is working
console.log('[useScreenShare] SignalingSocketManager instance created:', !!socketManager);

export const useScreenShare = ({ 
  userId, 
  onError,
  onRemoteShareStarted,
  onRemoteShareStopped 
}: UseScreenShareProps): UseScreenShareReturn => {
  const [isSharing, setIsSharing] = useState(false);
  const [isRemoteSharing, setIsRemoteSharing] = useState(false);
  const [sharingWithUserId, setSharingWithUserId] = useState<string | null>(null);
  const [viewingFromUserId, setViewingFromUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const signalingSocket = useRef<Socket | null>(null);
  const roomId = useRef<string | null>(null);
  const isInitialized = useRef<boolean>(false);
  const onRemoteShareStartedRef = useRef(onRemoteShareStarted);
  const onRemoteShareStoppedRef = useRef(onRemoteShareStopped);

  // Update refs when props change
  useEffect(() => {
    onRemoteShareStartedRef.current = onRemoteShareStarted;
    onRemoteShareStoppedRef.current = onRemoteShareStopped;
  }, [onRemoteShareStarted, onRemoteShareStopped]);

  const handleError = useCallback((err: unknown) => {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error('[useScreenShare] Error:', errorMessage);
    setError(errorMessage);
    onError?.(errorMessage);
  }, [onError]);

  // Get socket using singleton manager
  const getSignalingSocket = useCallback(() => {
    return socketManager.connect(userId);
  }, [userId]);

  const getScreenStream = async (): Promise<MediaStream> => {
    try {
      if (window.electronAPI) {
        // Electron environment
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              minWidth: 1920,
              maxWidth: 3840,
              minHeight: 1080,
              maxHeight: 2160
            }
          } as any
        });
        return stream;
      } else {
        // Browser environment
        if (!navigator.mediaDevices?.getDisplayMedia) {
          throw new Error('Screen sharing is not supported in your browser');
        }

        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: 'monitor',
            logicalSurface: true,
            cursor: 'always',
            width: { ideal: 1920, max: 3840 },
            height: { ideal: 1080, max: 2160 },
            frameRate: { ideal: 30, max: 60 }
          } as MediaTrackConstraints,
          audio: false
        });

        return stream;
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'NotAllowedError') {
        throw new Error('Screen share was cancelled by user');
      }
      throw error;
    }
  };

  const createPeerConnection = useCallback(() => {
    try {
      const pc = new RTCPeerConnection(rtcConfig);
      
      pc.onicecandidate = (event) => {
        if (event.candidate && roomId.current) {
          if (socketManager.isConnected()) {
            console.log('[useScreenShare] Sending ICE candidate');
            socketManager.emit('ice-candidate', {
              roomId: roomId.current,
              candidate: event.candidate
            });
          }
        }
      };

      pc.ontrack = (event) => {
        console.log('[useScreenShare] Received remote track');
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
          setIsRemoteSharing(true);
          onRemoteShareStartedRef.current?.(userId);
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('[useScreenShare] Peer connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          console.log('✅ Screen share peer connection established');
          setError(null);
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          console.log('❌ Screen share peer connection failed');
          setIsRemoteSharing(false);
          setRemoteStream(null);
          onRemoteShareStoppedRef.current?.();
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('[useScreenShare] ICE connection state:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'failed') {
          handleError('Peer connection failed - check your network or firewall settings');
        }
      };

      return pc;
    } catch (err) {
      handleError(err);
      return null;
    }
  }, [userId, handleError, getSignalingSocket]);

  // Set up signaling event handlers using singleton manager
  useEffect(() => {
    console.log('[useScreenShare] 📡 Setting up event handlers for user:', userId);

    const handleOffer = async (data: { roomId: string; offer: RTCSessionDescriptionInit }) => {
      console.log('[useScreenShare] 📨 Received offer for room:', data.roomId);
      if (data.roomId !== roomId.current) {
        console.log('[useScreenShare] Ignoring offer for different room');
        return;
      }

      try {
        if (!peerConnection.current) {
          console.log('[useScreenShare] Creating peer connection for incoming offer');
          peerConnection.current = createPeerConnection();
        }

        if (!peerConnection.current) {
          throw new Error('Failed to create peer connection');
        }

        await peerConnection.current.setRemoteDescription(data.offer);
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        
        socketManager.emit('answer', {
          roomId: data.roomId,
          answer: peerConnection.current.localDescription
        });
        console.log('[useScreenShare] Sent answer for room:', data.roomId);
      } catch (error) {
        console.error('[useScreenShare] Error handling offer:', error);
      }
    };

    const handleAnswer = async (data: { roomId: string; answer: RTCSessionDescriptionInit }) => {
      console.log('[useScreenShare] 📨 Received answer for room:', data.roomId);
      if (data.roomId !== roomId.current) {
        console.log('[useScreenShare] Ignoring answer for different room');
        return;
      }

      try {
        if (peerConnection.current) {
          await peerConnection.current.setRemoteDescription(data.answer);
          console.log('[useScreenShare] Set remote description from answer');
        }
      } catch (error) {
        console.error('[useScreenShare] Error handling answer:', error);
      }
    };

    const handleIceCandidate = async (data: { roomId: string; candidate: RTCIceCandidateInit }) => {
      console.log('[useScreenShare] 📨 Received ICE candidate for room:', data.roomId);
      if (data.roomId !== roomId.current) {
        console.log('[useScreenShare] Ignoring ICE candidate for different room');
        return;
      }

      try {
        if (peerConnection.current && peerConnection.current.remoteDescription) {
          await peerConnection.current.addIceCandidate(data.candidate);
          console.log('[useScreenShare] Added ICE candidate');
        }
      } catch (error) {
        console.error('[useScreenShare] Error adding ICE candidate:', error);
      }
    };

    const handleShareStopped = () => {
      console.log('[useScreenShare] 📨 Remote share stopped');
      setIsRemoteSharing(false);
      setViewingFromUserId(null);
      setRemoteStream(null);
      onRemoteShareStoppedRef.current?.();
    };

    const handlePeerDisconnected = () => {
      console.log('[useScreenShare] 📨 Peer disconnected');
      setIsRemoteSharing(false);
      setViewingFromUserId(null);
      setRemoteStream(null);
      onRemoteShareStoppedRef.current?.();
    };

    const handleShareRequest = (data: { fromUserId: string; roomId: string; targetUserId: string }) => {
      console.log('[useScreenShare] 📨 🎉 RECEIVED SHARE-REQUEST EVENT:', data);
      
      // Set the room ID for later use
      roomId.current = data.roomId;
      
      // Trigger the callback to show the dialog
      console.log('[useScreenShare] Calling onRemoteShareStarted with:', data.fromUserId);
      onRemoteShareStartedRef.current?.(data.fromUserId);
    };

    const handleUserJoined = (data: { socketId: string; roomId: string }) => {
      console.log('[useScreenShare] 📨 User joined room:', data.roomId);
      console.log('[useScreenShare] Current state - isSharing:', isSharing, 'roomId:', roomId.current, 'peerConnection:', !!peerConnection.current);
      
      // If we're the sharer and someone joined our room, re-send the offer
      if (data.roomId === roomId.current && isSharing && peerConnection.current && peerConnection.current.localDescription) {
        console.log('[useScreenShare] 🔄 Re-sending offer to newly joined user');
        socketManager.emit('offer', {
          roomId: data.roomId,
          offer: peerConnection.current.localDescription
        });
      } else {
        console.log('[useScreenShare] Not re-sending offer. Conditions not met:', {
          roomMatch: data.roomId === roomId.current,
          isSharing,
          hasPeerConnection: !!peerConnection.current,
          hasLocalDescription: !!(peerConnection.current?.localDescription)
        });
      }
    };

    // Register event handlers with the singleton manager
    socketManager.addEventListener('offer', handleOffer);
    socketManager.addEventListener('answer', handleAnswer);
    socketManager.addEventListener('ice-candidate', handleIceCandidate);
    socketManager.addEventListener('share-stopped', handleShareStopped);
    socketManager.addEventListener('peer-disconnected', handlePeerDisconnected);
    socketManager.addEventListener('share-request', handleShareRequest);
    socketManager.addEventListener('user-joined', handleUserJoined);
    
    console.log('[useScreenShare] ✅ All event handlers registered with SignalingSocketManager');

    return () => {
      console.log('[useScreenShare] 🧹 Cleaning up event handlers for user:', userId);
      socketManager.removeEventListener('offer', handleOffer);
      socketManager.removeEventListener('answer', handleAnswer);
      socketManager.removeEventListener('ice-candidate', handleIceCandidate);
      socketManager.removeEventListener('share-stopped', handleShareStopped);
      socketManager.removeEventListener('peer-disconnected', handlePeerDisconnected);
      socketManager.removeEventListener('share-request', handleShareRequest);
      socketManager.removeEventListener('user-joined', handleUserJoined);
    };
  }, [isSharing]); // Add isSharing dependency so handleUserJoined has access to current state

  const startSharing = useCallback(async (targetUserId?: string) => {
    try {
      // Ensure socket is connected
      if (!socketManager.isConnected()) {
        throw new Error('Signaling server not connected. Please wait and try again.');
      }

      console.log('[useScreenShare] Starting screen share...', targetUserId ? `for target: ${targetUserId}` : '');
      
      // Generate unique room ID - include target user if specified
      roomId.current = targetUserId 
        ? `room-${userId}-to-${targetUserId}-${Date.now()}`
        : `room-${userId}-${Date.now()}`;
      
      // Join the room first
      socketManager.emit('join-room', roomId.current);

      // Get screen stream
      const stream = await getScreenStream();
      console.log('[useScreenShare] Got screen stream:', stream.id);

      if (stream && stream.getTracks().length > 0) {
        setLocalStream(stream);
        setIsSharing(true);
        setSharingWithUserId(targetUserId || null);
        setError(null);

        // Create peer connection and add tracks
        if (peerConnection.current) {
          peerConnection.current.close();
        }
        
        peerConnection.current = createPeerConnection();
        if (!peerConnection.current) {
          throw new Error('Failed to create peer connection');
        }

        // Add tracks to peer connection
        stream.getTracks().forEach(track => {
          if (peerConnection.current && stream) {
            peerConnection.current.addTrack(track, stream);
            console.log('[useScreenShare] Added track to peer connection:', track.kind);
          }
        });

        // Create offer but don't send it yet - wait for user to join
        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);
        
        console.log('[useScreenShare] Created offer, waiting for target user to join room:', roomId.current);
        
        // If we have a target user, notify them about the share request
        if (targetUserId) {
          socketManager.emit('share-request', {
            targetUserId: targetUserId,
            roomId: roomId.current,
            fromUserId: userId
          });
        } else {
          // If no target user, send offer immediately (broadcast mode)
          socketManager.emit('offer', {
            roomId: roomId.current,
            offer: peerConnection.current.localDescription
          });
        }

        // Handle stream end
        stream.getVideoTracks()[0].onended = () => {
          console.log('[useScreenShare] Screen share stream ended by user');
          stopSharing();
        };
      } else {
        console.warn('[useScreenShare] No tracks in stream');
        stopSharing();
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('cancelled')) {
        console.log('[useScreenShare] Screen share cancelled by user');
        stopSharing();
      } else {
        console.error('[useScreenShare] Error starting screen share:', err);
        handleError(err);
        stopSharing();
      }
    }
  }, [userId, handleError, createPeerConnection, getSignalingSocket]);

  const stopSharing = useCallback(() => {
    console.log('[useScreenShare] Stopping screen share...');
    
    // Stop local stream tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop();
        console.log('[useScreenShare] Stopped track:', track.kind);
      });
      setLocalStream(null);
    }
    
    // Close peer connection
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
      console.log('[useScreenShare] Closed peer connection');
    }
    
    // Reset states
    setIsSharing(false);
    setIsRemoteSharing(false);
    setSharingWithUserId(null);
    setViewingFromUserId(null);
    setRemoteStream(null);
    setError(null);

    // Notify signaling server and room members
    if (socketManager.isConnected() && roomId.current) {
      socketManager.emit('stop-sharing', { roomId: roomId.current });
      console.log('[useScreenShare] Sent stop-sharing signal for room:', roomId.current);
      roomId.current = null;
    }
  }, [localStream]);

  const acceptRemoteShare = async (remoteUserId: string) => {
    try {
      // Ensure socket is connected
      if (!socketManager.isConnected()) {
        throw new Error('Signaling server not connected. Please wait and try again.');
      }

      console.log('[useScreenShare] Accepting remote share from:', remoteUserId);
      
      // Use the room ID that was set by the share-request event
      if (!roomId.current) {
        console.warn('[useScreenShare] No room ID available, creating fallback');
        roomId.current = `room-${remoteUserId}-to-${userId}-fallback`;
      }
      
      console.log('[useScreenShare] Joining room:', roomId.current);
      socketManager.emit('join-room', roomId.current);

      // Close existing peer connection if any
      if (peerConnection.current) {
        peerConnection.current.close();
      }
      
      // Create new peer connection for receiving
      peerConnection.current = createPeerConnection();
      if (!peerConnection.current) {
        throw new Error('Failed to create peer connection for receiving');
      }
      
      setIsRemoteSharing(true);
      setViewingFromUserId(remoteUserId);
      setError(null);
      console.log('[useScreenShare] Ready to receive remote share');
    } catch (err) {
      handleError(err);
    }
  };

  const rejectRemoteShare = () => {
    console.log('[useScreenShare] Rejecting remote share');
    
    // Clean up any partial connections
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    
    // Reset states
    setIsRemoteSharing(false);
    setViewingFromUserId(null);
    setRemoteStream(null);
    roomId.current = null;
    
    console.log('[useScreenShare] Remote share rejected and cleaned up');
  };

  // Initialize socket immediately on mount
  useEffect(() => {
    console.log('[useScreenShare] Initializing hook for user:', userId);
    getSignalingSocket(); // This will get or create the socket
    
    // Only cleanup on final unmount
    return () => {
      console.log('[useScreenShare] Component unmounting, cleaning up...');
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (peerConnection.current) {
        peerConnection.current.close();
      }
      // Don't disconnect the global socket here - let it stay connected for other instances
    };
  }, []); // Remove userId dependency to prevent re-creating sockets

  return {
    isSharing,
    isRemoteSharing,
    sharingWithUserId,
    viewingFromUserId,
    startSharing,
    stopSharing,
    acceptRemoteShare,
    rejectRemoteShare,
    localStream,
    remoteStream,
    error
  };
}; 