import { useState, useEffect, useRef, useCallback } from 'react';
import SocketManager from '../utils/socketManager';
import 'webrtc-adapter';
import '../types/electron.d.ts';

interface DesktopCapturerSource {
  id: string;
  name: string;
  thumbnail: HTMLImageElement;
  display_id: string;
  appIcon: HTMLImageElement | null;
}

interface UseScreenShareProps {
  userId: string;
  onError?: (error: Error | string) => void;
  onRemoteShareStarted?: (userId: string) => void;
  onRemoteShareStopped?: () => void;
}

interface UseScreenShareReturn {
  isSharing: boolean;
  isRemoteSharing: boolean;
  startSharing: () => Promise<void>;
  stopSharing: () => void;
  acceptRemoteShare: (userId: string) => Promise<void>;
  rejectRemoteShare: () => void;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  error: string | null;
}

// WebRTC configuration
const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302'] },
    { urls: ['stun:stun1.l.google.com:19302'] },
    { urls: ['stun:stun2.l.google.com:19302'] },
    { urls: ['stun:stun3.l.google.com:19302'] },
    { urls: ['stun:stun4.l.google.com:19302'] },
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
  ]
};

export const useScreenShare = ({ 
  userId, 
  onError,
  onRemoteShareStarted,
  onRemoteShareStopped 
}: UseScreenShareProps): UseScreenShareReturn => {
  const [isSharing, setIsSharing] = useState(false);
  const [isRemoteSharing, setIsRemoteSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const socketManager = useRef(SocketManager.getInstance());
  const roomId = useRef<string | null>(null);

  const handleError = useCallback((err: unknown) => {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error('Screen share error:', errorMessage);
    setError(errorMessage);
    onError?.(errorMessage);
  }, [onError]);

  const getScreenStream = async (): Promise<MediaStream> => {
    try {
      if (window.electronAPI) {
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
        if (!navigator.mediaDevices?.getDisplayMedia) {
          throw new Error('Screen sharing is not supported in your browser');
        }

        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: 'monitor',
            logicalSurface: true,
            cursor: 'always',
            width: { ideal: 3840 },
            height: { ideal: 2160 },
            frameRate: { ideal: 30, max: 60 },
            surfaceSwitching: 'include',
            selfBrowserSurface: 'include'
          } as MediaTrackConstraints,
          audio: false
        });

        stream.getTracks().forEach(track => {
          track.onended = () => {
            stopSharing();
          };
        });

        return stream;
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'NotAllowedError') {
        throw new Error('Screen share was cancelled');
      }
      throw error;
    }
  };

  const createPeerConnection = useCallback(() => {
    try {
      const pc = new RTCPeerConnection(rtcConfig);
      
      pc.onicecandidate = (event) => {
        if (event.candidate && roomId.current) {
          const socket = socketManager.current.getSocket();
          socket?.emit('ice-candidate', {
            roomId: roomId.current,
            candidate: event.candidate
          });
        }
      };

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
          onRemoteShareStarted?.(userId);
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          console.log('✅ Screen share connected successfully');
          setIsRemoteSharing(true);
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          console.log('❌ Screen share connection failed or disconnected');
          setIsRemoteSharing(false);
          setRemoteStream(null);
          onRemoteShareStopped?.();
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'failed') {
          console.error('Screen share connection failed - This might be due to firewall or NAT issues');
        }
      };

      return pc;
    } catch (err) {
      handleError(err);
      return null;
    }
  }, [userId, handleError, onRemoteShareStarted, onRemoteShareStopped]);

  const acceptRemoteShare = async (remoteUserId: string) => {
    try {
      const socket = socketManager.current.getSocket();
      if (!socket) {
        throw new Error('Not connected to server');
      }

      roomId.current = `room-${remoteUserId}-${userId}`;
      socket.emit('join-room', roomId.current);

      if (peerConnection.current) {
        peerConnection.current.close();
      }
      peerConnection.current = createPeerConnection();
      if (!peerConnection.current) return;

      setIsRemoteSharing(true);
    } catch (err) {
      handleError(err);
      setIsRemoteSharing(false);
    }
  };

  useEffect(() => {
    const socket = socketManager.current.getSocket();
    if (!socket) return;

    const handleOffer = async (data: { roomId: string; offer: RTCSessionDescriptionInit }) => {
      try {
        if (!peerConnection.current) {
          peerConnection.current = createPeerConnection();
        }
        if (!peerConnection.current) return;

        roomId.current = data.roomId;
        socket.emit('join-room', data.roomId);

        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.offer));
        
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);

        socket.emit('answer', {
          roomId: data.roomId,
          answer: peerConnection.current.localDescription
        });

        setIsRemoteSharing(true);
      } catch (err) {
        handleError(err);
      }
    };

    const handleAnswer = async (data: { roomId: string; answer: RTCSessionDescriptionInit }) => {
      try {
        if (peerConnection.current) {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
      } catch (err) {
        handleError(err);
      }
    };

    const handleIceCandidate = async (data: { roomId: string; candidate: RTCIceCandidateInit }) => {
      try {
        if (peerConnection.current) {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (err) {
        handleError(err);
      }
    };

    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);

    return () => {
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
    };
  }, [userId, handleError, createPeerConnection]);

  useEffect(() => {
    const socket = socketManager.current.getSocket();
    if (!socket) return;

    const handleRemoteShareStart = (data: { roomId: string }) => {
      roomId.current = data.roomId;
      setIsRemoteSharing(true);
      onRemoteShareStarted?.(userId);
    };

    const handleRemoteShareStop = () => {
      setIsRemoteSharing(false);
      setRemoteStream(null);
      onRemoteShareStopped?.();
      roomId.current = null;
    };

    socket.on('share-started', handleRemoteShareStart);
    socket.on('share-stopped', handleRemoteShareStop);
    socket.on('peer-disconnected', handleRemoteShareStop);

    return () => {
      socket.off('share-started', handleRemoteShareStart);
      socket.off('share-stopped', handleRemoteShareStop);
      socket.off('peer-disconnected', handleRemoteShareStop);
    };
  }, [onRemoteShareStarted, onRemoteShareStopped, userId]);

  const startSharing = useCallback(async () => {
    try {
      const socket = socketManager.current.getSocket();
      if (!socket) {
        console.error('[useScreenShare] Socket not connected, attempting to connect...');
        socketManager.current.connect();
        throw new Error('Not connected to server');
      }

      console.log('[useScreenShare] Starting screen share...');
      roomId.current = `room-${userId}`;
      socket.emit('join-room', roomId.current);

      const stream = await getScreenStream();
      console.log('[useScreenShare] Got screen stream:', stream.id);

      if (stream && stream.getTracks().length > 0) {
        setLocalStream(stream);
        setIsSharing(true);
        setError(null);

        if (peerConnection.current) {
          peerConnection.current.close();
        }

        peerConnection.current = createPeerConnection();
        if (!peerConnection.current) {
          throw new Error('Failed to create peer connection');
        }

        console.log('[useScreenShare] Created peer connection');
        const screenStream = new MediaStream();
        stream.getTracks().forEach(track => {
          if (peerConnection.current && stream) {
            screenStream.addTrack(track);
            peerConnection.current.addTrack(track, screenStream);
            console.log('[useScreenShare] Added track to peer connection:', track.kind);
          }
        });

        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);
        console.log('[useScreenShare] Created and set local description');

        socket.emit('offer', {
          roomId: roomId.current,
          offer: peerConnection.current.localDescription
        });
        console.log('[useScreenShare] Sent offer to room:', roomId.current);

        stream.getVideoTracks()[0].onended = () => {
          console.log('[useScreenShare] Screen share stream ended');
          stopSharing();
        };
      } else {
        console.warn('[useScreenShare] No tracks in stream');
        stopSharing();
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'Screen share was cancelled') {
        console.log('[useScreenShare] Screen share was cancelled by user');
        stopSharing();
      } else {
        console.error('[useScreenShare] Error in startSharing:', err);
        handleError(err);
        stopSharing();
      }
    }
  }, [userId, handleError, createPeerConnection]);

  const stopSharing = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop();
      });
      setLocalStream(null);
    }
    
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    
    setIsSharing(false);
    setRemoteStream(null);
    setError(null);

    const socket = socketManager.current.getSocket();
    if (socket && roomId.current) {
      socket.emit('stop-sharing', { roomId: roomId.current });
      roomId.current = null;
    }
  }, [localStream]);

  useEffect(() => {
    return () => {
      stopSharing();
    };
  }, [stopSharing]);

  const rejectRemoteShare = () => {
    const socket = socketManager.current.getSocket();
    if (socket) {
      socket.emit('screenShare:reject', { to: userId });
    }
    setIsRemoteSharing(false);
  };

  return {
    isSharing,
    isRemoteSharing,
    startSharing,
    stopSharing,
    acceptRemoteShare,
    rejectRemoteShare,
    localStream,
    remoteStream,
    error
  };
}; 