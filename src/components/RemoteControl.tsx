import React, { useState, useEffect, useRef } from 'react';
import type { FC } from 'react';
import SocketManager from '../utils/socketManager';
import { User } from '../types/user';
import '../types/electron.d.ts';

interface RemoteControlProps {
  targetUser: User;
  isControlling: boolean;
  onControlChange: (isControlling: boolean) => void;
}

export const RemoteControl: FC<RemoteControlProps> = ({ targetUser, isControlling, onControlChange }) => {
  const [isConnected, setIsConnected] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketManager = useRef(SocketManager.getInstance());
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [screenSize, setScreenSize] = useState<{ width: number; height: number; scaleFactor: number } | null>(null);

  useEffect(() => {
    const initScreenSize = async () => {
      if (window.electronAPI) {
        const size = await window.electronAPI.getScreenSize();
        setScreenSize(size);
      }
    };
    initScreenSize();
  }, []);

  useEffect(() => {
    const socket = socketManager.current.connect();

    socket.on('remoteControl:start', async (data: { from: string }) => {
      if (data.from === targetUser.id && !isControlling) {
        try {
          const stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              cursor: 'always',
              displaySurface: 'monitor'
            },
            audio: false
          });
          mediaStreamRef.current = stream;
          
          // Start sending screen frames
          const track = stream.getVideoTracks()[0];
          const settings = track.getSettings();
          
          // Create a video element to capture frames
          const video = document.createElement('video');
          video.srcObject = stream;
          await video.play();
          
          const sendFrame = async () => {
            if (!mediaStreamRef.current || !canvasRef.current) return;
            
            try {
              const canvas = document.createElement('canvas');
              canvas.width = settings.width || 1920;
              canvas.height = settings.height || 1080;
              const ctx = canvas.getContext('2d');
              if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const frame = canvas.toDataURL('image/jpeg', 0.7);
                socket.emit('remoteControl:frame', {
                  to: targetUser.id,
                  frame
                });
              }
            } catch (error) {
              console.error('Error capturing frame:', error);
            }
          };

          const frameInterval = setInterval(sendFrame, 1000 / 30); // 30 FPS

          stream.getVideoTracks()[0].onended = () => {
            clearInterval(frameInterval);
            stopSharing();
          };

          setIsConnected(true);
        } catch (error) {
          console.error('Failed to start screen sharing:', error);
        }
      }
    });

    socket.on('remoteControl:frame', (data: { from: string; frame: string }) => {
      if (data.from === targetUser.id && isControlling && canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          const img = new Image();
          img.onload = () => {
            if (!canvasRef.current) return;
            ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
          };
          img.src = data.frame;
        }
      }
    });

    socket.on('remoteControl:input', (data: { from: string; type: string; event: any }) => {
      if (data.from === targetUser.id && !isControlling) {
        // Simulate input events on the controlled machine
        const { type, event } = data;
        switch (type) {
          case 'mousemove':
            simulateMouseMove(event.x, event.y);
            break;
          case 'mousedown':
            simulateMouseClick(event.x, event.y, true);
            break;
          case 'mouseup':
            simulateMouseClick(event.x, event.y, false);
            break;
          case 'keydown':
            simulateKeyEvent(event.key, true);
            break;
          case 'keyup':
            simulateKeyEvent(event.key, false);
            break;
        }
      }
    });

    return () => {
      socket.off('remoteControl:start');
      socket.off('remoteControl:frame');
      socket.off('remoteControl:input');
      stopSharing();
    };
  }, [targetUser.id, isControlling]);

  const stopSharing = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setIsConnected(false);
    onControlChange(false);
  };

  const startControlling = () => {
    if (!isControlling || !targetUser.id) return;
    socketManager.current.getSocket()?.emit('remoteControl:start', { to: targetUser.id });
    onControlChange(true);
  };

  const handleMouseMove = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isControlling || !canvasRef.current || !screenSize) return;
    const rect = canvasRef.current.getBoundingClientRect();
    
    const x = Math.floor((e.clientX - rect.left) / rect.width * screenSize.width);
    const y = Math.floor((e.clientY - rect.top) / rect.height * screenSize.height);

    try {
      await window.electronAPI?.simulateMouseMove(x, y);
      socketManager.current.getSocket()?.emit('remoteControl:input', {
        to: targetUser.id,
        type: 'mousemove',
        event: { x, y }
      });
    } catch (error) {
      console.error('Failed to simulate mouse move:', error);
    }
  };

  const handleMouseDown = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isControlling || !canvasRef.current || !screenSize) return;
    const rect = canvasRef.current.getBoundingClientRect();
    
    const x = Math.floor((e.clientX - rect.left) / rect.width * screenSize.width);
    const y = Math.floor((e.clientY - rect.top) / rect.height * screenSize.height);

    try {
      await window.electronAPI?.simulateMouseClick(x, y, true);
      socketManager.current.getSocket()?.emit('remoteControl:input', {
        to: targetUser.id,
        type: 'mousedown',
        event: { x, y }
      });
    } catch (error) {
      console.error('Failed to simulate mouse down:', error);
    }
  };

  const handleMouseUp = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isControlling || !canvasRef.current || !screenSize) return;
    const rect = canvasRef.current.getBoundingClientRect();
    
    const x = Math.floor((e.clientX - rect.left) / rect.width * screenSize.width);
    const y = Math.floor((e.clientY - rect.top) / rect.height * screenSize.height);

    try {
      await window.electronAPI?.simulateMouseClick(x, y, false);
      socketManager.current.getSocket()?.emit('remoteControl:input', {
        to: targetUser.id,
        type: 'mouseup',
        event: { x, y }
      });
    } catch (error) {
      console.error('Failed to simulate mouse up:', error);
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (!isControlling) return;
    try {
      await window.electronAPI?.simulateKeyEvent(e.key, true);
      socketManager.current.getSocket()?.emit('remoteControl:input', {
        to: targetUser.id,
        type: 'keydown',
        event: { key: e.key }
      });
    } catch (error) {
      console.error('Failed to simulate key down:', error);
    }
  };

  const handleKeyUp = async (e: React.KeyboardEvent) => {
    if (!isControlling) return;
    try {
      await window.electronAPI?.simulateKeyEvent(e.key, false);
      socketManager.current.getSocket()?.emit('remoteControl:input', {
        to: targetUser.id,
        type: 'keyup',
        event: { key: e.key }
      });
    } catch (error) {
      console.error('Failed to simulate key up:', error);
    }
  };

  return (
    <div className="relative w-full h-full bg-gray-900 flex flex-col">
      {/* Control Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between bg-gray-800 bg-opacity-75 rounded-lg p-3">
        <div className="flex items-center space-x-4">
          <button
            onClick={isControlling ? stopSharing : startControlling}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
              isControlling ? 'bg-red-500 hover:bg-red-600' : 'bg-primary-500 hover:bg-primary-600'
            } text-white transition-colors`}
            disabled={!targetUser.id}
          >
            <i className={`fas ${isControlling ? 'fa-stop' : 'fa-desktop'} mr-2`} />
            <span>{isControlling ? 'Stop Controlling' : 'Start Control'}</span>
          </button>
        </div>
      </div>

      {/* Remote Desktop View */}
      <div className="flex-1 flex items-center justify-center">
        {!isConnected && !isControlling && (
          <div className="text-center text-gray-400">
            <i className="fas fa-desktop text-6xl mb-4 block" />
            <p className="text-lg">
              {isControlling
                ? "Click 'Start Control' to control remote desktop"
                : 'Waiting for remote control request...'}
            </p>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className={`w-full h-full object-contain ${!isConnected && 'hidden'}`}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          tabIndex={0}
        />
      </div>

      {/* Connection Status */}
      {isConnected && (
        <div className="absolute bottom-4 left-4 bg-gray-800 bg-opacity-75 rounded-lg px-3 py-2 text-sm text-white flex items-center">
          <span className="h-2 w-2 rounded-full bg-green-500 mr-2" />
          {isControlling ? 'Controlling remote desktop' : 'Sharing desktop'}
        </div>
      )}
    </div>
  );
};

// Helper functions for input simulation
const simulateMouseMove = async (x: number, y: number) => {
  try {
    if (!window.electronAPI) return;
    const screenSize = await window.electronAPI.getScreenSize();
    const absoluteX = Math.floor(x * screenSize.width);
    const absoluteY = Math.floor(y * screenSize.height);
    await window.electronAPI.simulateMouseMove(absoluteX, absoluteY);
  } catch (error) {
    console.error('Failed to simulate mouse move:', error);
  }
};

const simulateMouseClick = async (x: number, y: number, isDown: boolean) => {
  try {
    if (!window.electronAPI) return;
    const screenSize = await window.electronAPI.getScreenSize();
    const absoluteX = Math.floor(x * screenSize.width);
    const absoluteY = Math.floor(y * screenSize.height);
    await window.electronAPI.simulateMouseClick(absoluteX, absoluteY, isDown);
  } catch (error) {
    console.error('Failed to simulate mouse click:', error);
  }
};

const simulateKeyEvent = async (key: string, isDown: boolean) => {
  try {
    if (!window.electronAPI) return;
    await window.electronAPI.simulateKeyEvent(key, isDown);
  } catch (error) {
    console.error('Failed to simulate key event:', error);
  }
}; 