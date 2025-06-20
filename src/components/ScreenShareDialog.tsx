import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '../types/user';

interface ScreenShareDialogProps {
  stream: MediaStream | null;
  isLocal: boolean;
  user: User;
  onAccept?: () => void;
  onDecline?: () => void;
  onClose?: () => void;
  status: 'requesting' | 'sharing' | 'viewing';
}

export const ScreenShareDialog: React.FC<ScreenShareDialogProps> = ({
  stream,
  isLocal,
  user,
  onAccept,
  onDecline,
  onClose,
  status
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-zinc-900 rounded-xl shadow-2xl w-full max-w-4xl mx-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center space-x-3">
            <img
              src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}
              alt={user.name}
              className="w-10 h-10 rounded-full"
            />
            <div>
              <h3 className="text-zinc-200 font-medium">{user.name}</h3>
              <p className="text-sm text-zinc-400">
                {status === 'requesting' && 'Wants to share their screen'}
                {status === 'sharing' && 'Screen sharing in progress'}
                {status === 'viewing' && 'Sharing their screen with you'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            <i className="fas fa-times" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {status === 'requesting' ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mb-4">
                <i className="fas fa-desktop text-2xl text-purple-400" />
              </div>
              <h2 className="text-xl font-medium text-zinc-200">Screen Sharing Request</h2>
              <p className="text-zinc-400 text-center max-w-md">
                {user.name} would like to share their screen with you. 
                Do you want to accept?
              </p>
              <div className="flex items-center space-x-3 mt-4">
                <button
                  onClick={onAccept}
                  className="px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white transition-colors"
                >
                  Accept
                </button>
                <button
                  onClick={onDecline}
                  className="px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors"
                >
                  Decline
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Screen Share View */}
              <div className="relative aspect-video bg-zinc-950 rounded-lg overflow-hidden">
                {stream ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isLocal}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-zinc-500 text-center">
                      <i className="fas fa-desktop text-4xl mb-2" />
                      <p>Waiting for screen share to start...</p>
                    </div>
                  </div>
                )}

                {/* Status Indicator */}
                <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-black/50 text-sm text-white flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span>{isLocal ? 'You are sharing' : 'Viewing shared screen'}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center space-x-3">
                {isLocal ? (
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
                  >
                    <i className="fas fa-stop mr-2" />
                    Stop Sharing
                  </button>
                ) : (
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors"
                  >
                    <i className="fas fa-times mr-2" />
                    Close
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}; 