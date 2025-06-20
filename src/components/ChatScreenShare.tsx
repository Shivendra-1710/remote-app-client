import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '../types/user';

interface ChatScreenShareProps {
  stream: MediaStream | null;
  isLocal: boolean;
  user: User;
  onClose?: () => void;
  onStartSharing?: () => void;
  isSharing: boolean;
}

export const ChatScreenShare: React.FC<ChatScreenShareProps> = ({
  stream,
  isLocal,
  user,
  onClose,
  onStartSharing,
  isSharing
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-6xl mx-4">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent z-10">
          <div className="flex items-center space-x-3">
            <img
              src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}
              alt={user.name}
              className="w-10 h-10 rounded-full"
            />
            <div>
              <h3 className="text-white font-medium">{user.name}</h3>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-zinc-300 text-sm">
                  {isLocal ? 'Sharing your screen' : 'Viewing shared screen'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <i className="fas fa-times" />
          </button>
        </div>

        {/* Video Container */}
        <div className="relative aspect-video bg-zinc-900 rounded-lg overflow-hidden shadow-2xl">
          {stream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={isLocal}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 space-y-4">
              <i className="fas fa-desktop text-4xl" />
              {!isSharing && !isLocal && (
                <>
                  <p className="text-lg">No active screen share</p>
                  <button
                    onClick={onStartSharing}
                    className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                  >
                    <i className="fas fa-desktop mr-2" />
                    Share Your Screen
                  </button>
                </>
              )}
              {!isSharing && isLocal && (
                <p className="text-lg">Waiting to start sharing...</p>
              )}
              {isSharing && (
                <p className="text-lg">Connecting to stream...</p>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
          <div className="flex items-center justify-center space-x-4">
            {isLocal && (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
              >
                <i className="fas fa-stop mr-2" />
                Stop Sharing
              </button>
            )}
            {!isLocal && (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white transition-colors"
              >
                <i className="fas fa-times mr-2" />
                Close Viewer
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}; 