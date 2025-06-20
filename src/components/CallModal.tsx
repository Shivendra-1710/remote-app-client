import React, { useEffect, useRef, useState } from 'react';
import { User } from '../types/user';
import { motion, AnimatePresence } from 'framer-motion';

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isVideo: boolean;
  selectedUser: User;
  onEndCall: () => void;
}

export const CallModal: React.FC<CallModalProps> = ({
  isOpen,
  onClose,
  localStream,
  remoteStream,
  isVideo,
  selectedUser,
  onEndCall,
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  // Handle local media stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
    if (localAudioRef.current && localStream) {
      localAudioRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Handle remote media stream
  useEffect(() => {
    console.log("Remote stream updated:", remoteStream);
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(error => {
        console.error("Error playing remote audio:", error);
      });
    }
  }, [remoteStream]);

  useEffect(() => {
    if (isOpen) {
      const interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

      return () => {
        clearInterval(interval);
        setCallDuration(0);
      };
    }
  }, [isOpen]);

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  if (!isOpen) return null;

  const minimizedView = (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed bottom-4 right-4 bg-gray-800 rounded-lg shadow-lg overflow-hidden z-50"
      style={{ width: isVideo ? '280px' : '240px' }}
    >
      <div className="relative">
        {/* Hidden audio elements */}
        <audio ref={localAudioRef} muted playsInline autoPlay />
        <audio ref={remoteAudioRef} playsInline autoPlay />

        {isVideo ? (
          <div className="relative">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-40 object-cover"
            />
            <div className="absolute top-2 right-2 w-20 h-16 bg-black rounded-lg overflow-hidden shadow-lg">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        ) : (
          <div className="p-4 flex items-center space-x-3">
            <img
              src={selectedUser.avatar}
              alt={selectedUser.name}
              className="w-10 h-10 rounded-full"
            />
            <div>
              <p className="text-white font-medium text-sm">{selectedUser.name}</p>
              <p className="text-gray-400 text-xs">{formatDuration(callDuration)}</p>
            </div>
          </div>
        )}

        {/* Minimized Controls */}
        <div className="absolute top-2 left-2 flex items-center space-x-2">
          <button
            onClick={toggleMinimize}
            className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center"
          >
            <i className="fas fa-expand text-white text-sm" />
          </button>
        </div>

        <div className="bg-gray-900 p-2 flex items-center justify-center space-x-2">
          <button
            onClick={toggleMute}
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isMuted ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <i className={`fas ${isMuted ? 'fa-microphone-slash' : 'fa-microphone'} text-white text-sm`} />
          </button>

          <button
            onClick={onEndCall}
            className="w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center"
          >
            <i className="fas fa-phone-slash text-white text-sm" />
          </button>

          {isVideo && (
            <button
              onClick={toggleVideo}
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                !isVideoEnabled ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <i className={`fas ${isVideoEnabled ? 'fa-video' : 'fa-video-slash'} text-white text-sm`} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );

  const maximizedView = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
    >
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden">
        <div className="relative h-[600px]">
          {/* Hidden audio elements */}
          <audio ref={localAudioRef} muted playsInline autoPlay />
          <audio ref={remoteAudioRef} playsInline autoPlay />

          {/* Header with minimize button */}
          <div className="absolute top-0 left-0 right-0 p-4 z-10 bg-gradient-to-b from-black to-transparent">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">{selectedUser.name}</h3>
              <button
                onClick={toggleMinimize}
                className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center"
              >
                <i className="fas fa-compress text-white" />
              </button>
            </div>
          </div>

          {isVideo ? (
            <>
              {/* Remote Video (Full Screen) */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              
              {/* Local Video (Picture-in-Picture) */}
              <div className="absolute top-16 right-4 w-48 h-36 bg-black rounded-lg overflow-hidden shadow-lg">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <div className="text-center">
                <img
                  src={selectedUser.avatar}
                  alt={selectedUser.name}
                  className="w-32 h-32 rounded-full mx-auto mb-4"
                />
                <h2 className="text-2xl font-semibold text-white mb-2">
                  {selectedUser.name}
                </h2>
                <p className="text-gray-400">
                  {formatDuration(callDuration)}
                </p>
                {isMuted && (
                  <p className="text-red-500 mt-2">
                    <i className="fas fa-microphone-slash mr-2" />
                    Muted
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Call Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black to-transparent">
            <div className="flex items-center justify-center space-x-6">
              <button
                onClick={toggleMute}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                  isMuted ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <i className={`fas ${isMuted ? 'fa-microphone-slash' : 'fa-microphone'} text-white`} />
              </button>

              <button
                onClick={onEndCall}
                className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
              >
                <i className="fas fa-phone-slash text-2xl text-white" />
              </button>

              {isVideo && (
                <button
                  onClick={toggleVideo}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                    !isVideoEnabled ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <i className={`fas ${isVideoEnabled ? 'fa-video' : 'fa-video-slash'} text-white`} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <AnimatePresence>
      {isMinimized ? minimizedView : maximizedView}
    </AnimatePresence>
  );
}; 