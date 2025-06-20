import React, { useEffect, useRef, useState } from 'react';
import { webRTCService } from '../services/WebRTCService';

interface ScreenShareProps {
  isHost: boolean;
  roomId: string;
  onError?: (error: string) => void;
}

export const ScreenShare: React.FC<ScreenShareProps> = ({ isHost, roomId, onError }) => {
  const [isSharing, setIsSharing] = useState(false);
  const [isRemoteSharing, setIsRemoteSharing] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Set up remote stream handler
    const handleRemoteStream = (event: CustomEvent<MediaStream>) => {
      if (remoteVideoRef.current && event.detail) {
        console.log('[ScreenShare] Received remote stream');
        remoteVideoRef.current.srcObject = event.detail;
        setIsRemoteSharing(true);
      }
    };

    // Handle share stopped event
    const handleShareStopped = () => {
      console.log('[ScreenShare] Share stopped event received');
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      setIsRemoteSharing(false);
      setIsSharing(false);
    };

    // Listen for events
    window.addEventListener('remote-stream', handleRemoteStream as EventListener);
    window.addEventListener('share-stopped', handleShareStopped as EventListener);

    return () => {
      window.removeEventListener('remote-stream', handleRemoteStream as EventListener);
      window.removeEventListener('share-stopped', handleShareStopped as EventListener);
      stopScreenShare();
    };
  }, []);

  const startScreenShare = async () => {
    try {
      console.log('[ScreenShare] Starting screen share for room:', roomId);
      // Get local stream and display it
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });
      
      streamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setIsSharing(true);
      
      // Handle stream end
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        console.log('[ScreenShare] Local stream ended');
        stopScreenShare();
      });
      
      // Start WebRTC connection and send stream
      try {
        await webRTCService.startScreenShare(roomId);
      } catch (error) {
        console.error('[ScreenShare] WebRTC error:', error);
        onError?.('Failed to establish WebRTC connection');
        stopScreenShare();
      }
      
    } catch (error) {
      console.error('[ScreenShare] Error sharing screen:', error);
      onError?.('Failed to start screen sharing');
    }
  };

  const stopScreenShare = () => {
    console.log('[ScreenShare] Stopping screen share');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('[ScreenShare] Stopped track:', track.kind);
      });
      streamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    webRTCService.stopScreenShare();
    setIsSharing(false);
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 rounded-lg bg-gray-800">
      {/* Local Video (only visible to host) */}
      {isHost && isSharing && (
        <div className="w-full">
          <h3 className="text-white mb-2">Your Screen</h3>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full max-w-3xl rounded-lg bg-black"
          />
        </div>
      )}

      {/* Remote Video (visible to everyone) */}
      {(!isHost || isRemoteSharing) && (
        <div className="w-full">
          <h3 className="text-white mb-2">Shared Screen</h3>
          {isRemoteSharing ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full max-w-3xl rounded-lg bg-black"
            />
          ) : (
            <div className="w-full max-w-3xl h-48 rounded-lg bg-black flex items-center justify-center text-gray-400">
              No screen is being shared
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      {isHost && (
        <button
          onClick={isSharing ? stopScreenShare : startScreenShare}
          className={`px-4 py-2 rounded-md ${
            isSharing 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-blue-600 hover:bg-blue-700'
          } text-white transition-colors`}
        >
          {isSharing ? 'Stop Sharing' : 'Share Screen'}
        </button>
      )}
    </div>
  );
};