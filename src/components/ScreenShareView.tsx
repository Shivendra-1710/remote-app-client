import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface ScreenShareViewProps {
  stream: MediaStream | null;
  isLocal?: boolean;
  onClose?: () => void;
}

export const ScreenShareView: React.FC<ScreenShareViewProps> = ({ stream, isLocal = false, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
    >
      <div className="relative w-full max-w-7xl mx-4">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent z-10">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-white text-sm font-medium">
              {isLocal ? 'Sharing Your Screen' : 'Viewing Shared Screen'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <i className="fas fa-times" />
          </button>
        </div>

        {/* Video */}
        <div className="relative aspect-video bg-zinc-900 rounded-lg overflow-hidden shadow-2xl">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal}
            className="w-full h-full object-contain"
          />
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
          </div>
        </div>
      </div>
    </motion.div>
  );
}; 