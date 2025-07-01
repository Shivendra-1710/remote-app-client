import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '../types/user';
import '../types/electron.d.ts';

interface RemoteAccessViewerProps {
  targetUser: User;
  remoteStream: MediaStream | null;
  isConnected: boolean;
  onClose: () => void;
  onError?: (error: string) => void;
}

export const RemoteAccessViewer: React.FC<RemoteAccessViewerProps> = ({ 
  targetUser, 
  remoteStream, 
  isConnected, 
  onClose,
  onError
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [screenSize, setScreenSize] = useState<{ width: number; height: number; scaleFactor: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  // Get screen size for proper input scaling
  useEffect(() => {
    const initScreenSize = async () => {
      try {
        if (window.electronAPI && typeof window.electronAPI.getScreenSize === 'function') {
          const size = await window.electronAPI.getScreenSize();
          setScreenSize(size);
          console.log('✅ [RemoteAccessViewer] Got Electron screen size:', size);
        } else {
          // Fallback for browser environment
          const browserSize = { 
            width: window.screen.width, 
            height: window.screen.height, 
            scaleFactor: window.devicePixelRatio || 1 
          };
          setScreenSize(browserSize);
          console.log('🌐 [RemoteAccessViewer] Using browser screen size:', browserSize);
        }
      } catch (error) {
        console.error('Failed to get screen size:', error);
        // Final fallback
        setScreenSize({ 
          width: 1920, 
          height: 1080, 
          scaleFactor: 1 
        });
      }
    };
    initScreenSize();
  }, []);

  // Set up video stream
  useEffect(() => {
    console.log('🎥 [RemoteAccessViewer] Stream effect triggered:', {
      hasVideoRef: !!videoRef.current,
      hasRemoteStream: !!remoteStream,
      remoteStreamId: remoteStream?.id,
      remoteStreamTracks: remoteStream?.getTracks().length,
      isConnected,
      connectionStatus
    });
    
    // Always update connection status first based on stream availability
    if (remoteStream && isConnected) {
      setConnectionStatus('connected');
    } else if (isConnected) {
      setConnectionStatus('connecting');
    } else {
      setConnectionStatus('disconnected');
    }
    
    // Set video stream when both ref and stream are available
    if (videoRef.current && remoteStream) {
      console.log('🎯 [RemoteAccessViewer] Setting video srcObject:', {
        streamId: remoteStream.id,
        tracks: remoteStream.getTracks().length,
        videoTracks: remoteStream.getVideoTracks().length
      });
      videoRef.current.srcObject = remoteStream;
    } else if (remoteStream) {
      console.log('⏳ [RemoteAccessViewer] Stream ready, waiting for video ref...');
    } else {
      console.log('⚠️ [RemoteAccessViewer] No remote stream available');
    }
  }, [remoteStream, isConnected]);
  
  // Separate effect to handle video ref changes
  useEffect(() => {
    if (videoRef.current && remoteStream) {
      console.log('🎯 [RemoteAccessViewer] Video ref ready, setting stream:', {
        streamId: remoteStream.id,
        tracks: remoteStream.getTracks().length
      });
      videoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]); // This will run when remoteStream changes OR when component re-renders

  // Auto-hide controls after inactivity
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    const resetTimer = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowControls(false), 3000);
    };

    const handleMouseMove = () => resetTimer();
    const handleKeyPress = () => resetTimer();

    resetTimer();
    
    if (containerRef.current) {
      containerRef.current.addEventListener('mousemove', handleMouseMove);
      containerRef.current.addEventListener('keydown', handleKeyPress);
    }

    return () => {
      clearTimeout(timeout);
      if (containerRef.current) {
        containerRef.current.removeEventListener('mousemove', handleMouseMove);
        containerRef.current.removeEventListener('keydown', handleKeyPress);
      }
    };
  }, []);

  // Mouse event handlers
  const handleMouseMove = useCallback(async (e: React.MouseEvent<HTMLVideoElement>) => {
    if (!isConnected || !videoRef.current || !screenSize) return;
    
    const rect = videoRef.current.getBoundingClientRect();
    const scaleX = screenSize.width / rect.width;
    const scaleY = screenSize.height / rect.height;
    
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    try {
      if (window.electronAPI && typeof window.electronAPI.simulateMouseMove === 'function') {
        await window.electronAPI.simulateMouseMove(x, y);
      } else {
        console.log('🌐 [RemoteAccessViewer] Mouse move (browser mode):', { x, y });
        // In browser mode, we can't actually control the remote mouse
        // This would need to be handled via WebRTC data channels in a real implementation
      }
    } catch (error) {
      console.error('Failed to simulate mouse move:', error);
      onError?.('Failed to control remote mouse');
    }
  }, [isConnected, screenSize, onError]);

  const handleMouseDown = useCallback(async (e: React.MouseEvent<HTMLVideoElement>) => {
    if (!isConnected || !videoRef.current || !screenSize) return;
    
    e.preventDefault();
    const rect = videoRef.current.getBoundingClientRect();
    const scaleX = screenSize.width / rect.width;
    const scaleY = screenSize.height / rect.height;
    
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    try {
      if (window.electronAPI && typeof window.electronAPI.simulateMouseClick === 'function') {
        await window.electronAPI.simulateMouseClick(x, y, true);
      } else {
        console.log('🌐 [RemoteAccessViewer] Mouse down (browser mode):', { x, y });
      }
    } catch (error) {
      console.error('Failed to simulate mouse down:', error);
      onError?.('Failed to control remote mouse');
    }
  }, [isConnected, screenSize, onError]);

  const handleMouseUp = useCallback(async (e: React.MouseEvent<HTMLVideoElement>) => {
    if (!isConnected || !videoRef.current || !screenSize) return;
    
    e.preventDefault();
    const rect = videoRef.current.getBoundingClientRect();
    const scaleX = screenSize.width / rect.width;
    const scaleY = screenSize.height / rect.height;
    
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    try {
      if (window.electronAPI && typeof window.electronAPI.simulateMouseClick === 'function') {
        await window.electronAPI.simulateMouseClick(x, y, false);
      } else {
        console.log('🌐 [RemoteAccessViewer] Mouse up (browser mode):', { x, y });
      }
    } catch (error) {
      console.error('Failed to simulate mouse up:', error);
      onError?.('Failed to control remote mouse');
    }
  }, [isConnected, screenSize, onError]);

  // Keyboard event handlers
  const handleKeyDown = useCallback(async (e: React.KeyboardEvent) => {
    if (!isConnected) return;
    
    e.preventDefault();
    try {
      if (window.electronAPI && typeof window.electronAPI.simulateKeyEvent === 'function') {
        await window.electronAPI.simulateKeyEvent(e.key, true);
      } else {
        console.log('🌐 [RemoteAccessViewer] Key down (browser mode):', e.key);
      }
    } catch (error) {
      console.error('Failed to simulate key down:', error);
      onError?.('Failed to control remote keyboard');
    }
  }, [isConnected, onError]);

  const handleKeyUp = useCallback(async (e: React.KeyboardEvent) => {
    if (!isConnected) return;
    
    e.preventDefault();
    try {
      if (window.electronAPI && typeof window.electronAPI.simulateKeyEvent === 'function') {
        await window.electronAPI.simulateKeyEvent(e.key, false);
      } else {
        console.log('🌐 [RemoteAccessViewer] Key up (browser mode):', e.key);
      }
    } catch (error) {
      console.error('Failed to simulate key up:', error);
      onError?.('Failed to control remote keyboard');
    }
  }, [isConnected, onError]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'disconnected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'disconnected': return 'Disconnected';
      default: return 'Unknown';
    }
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex flex-col"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    >
      {/* Top Control Bar */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent p-4"
          >
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <img
                  src={targetUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${targetUser.name}`}
                  alt={targetUser.name}
                  className="w-8 h-8 rounded-full"
                />
                <div>
                  <h3 className="text-white font-medium">{targetUser.name}</h3>
                  <p className="text-white/70 text-sm">Remote Access Session</p>
                </div>
              </div>
              
              {/* Connection Status */}
              <div className="flex items-center space-x-2 px-3 py-1 bg-black/40 rounded-lg">
                <span className={`w-2 h-2 rounded-full ${getStatusColor()} ${connectionStatus === 'connecting' ? 'animate-pulse' : ''}`} />
                <span className="text-white text-sm">{getStatusText()}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Fullscreen Toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleFullscreen}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              >
                <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`} />
              </motion.button>

              {/* Close Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 transition-colors"
                title="Close Remote Access"
              >
                <i className="fas fa-times" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Remote Screen Display */}
      <div className="flex-1 flex items-center justify-center">
        {/* Always render video element to ensure ref is available */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-contain cursor-none ${
            connectionStatus === 'connected' && remoteStream ? 'block' : 'hidden'
          }`}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onContextMenu={(e) => e.preventDefault()}
        />
        
        {/* Loading/Error overlay */}
        {(connectionStatus !== 'connected' || !remoteStream) && (
          <div className="absolute inset-0 flex items-center justify-center text-center text-white/70">
            <div>
              <div className="w-32 h-32 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-6">
                <i className={`fas fa-desktop text-4xl ${connectionStatus === 'connecting' ? 'animate-pulse' : ''}`} />
              </div>
              <h2 className="text-2xl font-semibold mb-2">
                {connectionStatus === 'connecting' ? 'Connecting to Remote Desktop' : 'Remote Desktop Unavailable'}
              </h2>
              <p className="text-white/50">
                {connectionStatus === 'connecting' 
                  ? `Establishing connection to ${targetUser.name}'s computer...`
                  : 'Unable to connect to the remote desktop'
                }
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Status Bar */}
      <AnimatePresence>
        {showControls && connectionStatus === 'connected' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-4"
          >
            <div className="flex items-center justify-center space-x-6 text-white/70 text-sm">
              <div className="flex items-center space-x-2">
                <i className="fas fa-mouse-pointer" />
                <span>Mouse Control Active</span>
              </div>
              <div className="flex items-center space-x-2">
                <i className="fas fa-keyboard" />
                <span>Keyboard Input Active</span>
              </div>
              <div className="flex items-center space-x-2">
                <i className="fas fa-eye" />
                <span>Real-time Display</span>
              </div>
              {(!window.electronAPI || typeof window.electronAPI.simulateMouseMove !== 'function') && (
                <div className="flex items-center space-x-2 text-yellow-400">
                  <i className="fas fa-exclamation-triangle" />
                  <span>Browser Mode - Limited Control</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}; 