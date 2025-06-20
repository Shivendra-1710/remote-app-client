import React, { useEffect, useRef } from 'react';
import { User } from '../types/user';

interface NewScreenShareDialogProps {
  user: User;
  onClose: () => void;
  onStartSharing: () => void;
  onViewShare: () => void;
  isRemoteSharing: boolean;
  isSharing: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

export const NewScreenShareDialog: React.FC<NewScreenShareDialogProps> = ({
  user,
  onClose,
  onStartSharing,
  onViewShare,
  isRemoteSharing,
  isSharing,
  localStream,
  remoteStream
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      console.log('📤 Local screen share stream received');
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      console.log('📥 Remote screen share stream received');
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleStartSharing = () => {
    console.log('🎬 Starting screen share...');
    onStartSharing();
  };

  const handleStopSharing = () => {
    console.log('⏹️ Stopping screen share...');
    onStartSharing(); // This should trigger the stop action since isSharing is true
  };

  const handleViewShare = () => {
    console.log('👀 Viewing remote screen share...');
    onViewShare();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-zinc-900 rounded-xl shadow-2xl w-full max-w-4xl mx-4 overflow-hidden">
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
              <p className="text-sm text-zinc-400">Screen Sharing Options</p>
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
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Share Your Screen Section */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-zinc-200">Share Your Screen</h4>
            <div className="aspect-video bg-zinc-800 rounded-lg overflow-hidden relative">
              {isSharing && localStream ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 space-y-4">
                  <i className="fas fa-desktop text-4xl" />
                  <p className="text-sm">Click below to start sharing</p>
                </div>
              )}
            </div>
            <button
              onClick={isSharing ? handleStopSharing : handleStartSharing}
              disabled={false} // Remove the disabled state to allow stopping
              className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                isSharing
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-purple-500 hover:bg-purple-600 text-white'
              }`}
            >
              {isSharing ? (
                <>
                  <i className="fas fa-stop mr-2" />
                  Stop Sharing
                </>
              ) : (
                <>
                  <i className="fas fa-desktop mr-2" />
                  Share Screen
                </>
              )}
            </button>
          </div>

          {/* View Remote Screen Section */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-zinc-200">View Remote Screen</h4>
            <div className="aspect-video bg-zinc-800 rounded-lg overflow-hidden relative">
              {isRemoteSharing && remoteStream ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 space-y-4">
                  <i className="fas fa-desktop text-4xl" />
                  <p className="text-sm">No remote screen is being shared</p>
                </div>
              )}
            </div>
            <button
              onClick={handleViewShare}
              disabled={!isRemoteSharing}
              className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                isRemoteSharing
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-zinc-600 text-zinc-400 cursor-not-allowed'
              }`}
            >
              <i className="fas fa-eye mr-2" />
              View Shared Screen
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}; 