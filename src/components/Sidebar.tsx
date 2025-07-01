import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu } from '@headlessui/react';
import { Avatar } from './shared/Avatar';
import { Button } from './shared/Button';
import { Card } from './shared/Card';
import { User, UserStatus } from '../types/user';
import { useScreenShare } from '../hooks/useScreenShare';
import { useRemoteAccess } from '../hooks/useRemoteAccess';
import SocketManager from '../utils/socketManager';
import { NewScreenShareDialog } from './NewScreenShareDialog';

interface SidebarProps {
  currentUser: User;
  users: User[];
  onUserSelect: (user: User) => void;
  onStatusChange: (status: UserStatus) => void;
  onLogout?: () => void;
  className?: string;
  selectedUserId: string | null;
  onError?: (error: string) => void;
  onRemoteAccessStart?: (targetUser: User) => void;
}

const statusLabels = {
  'online': 'Online',
  'offline': 'Offline',
  'away': 'Away',
  'busy': 'Do not disturb',
  'in-call': 'In a call',
  'idle': 'Idle',
  'dnd': 'Do not disturb'
} as const;

const statusIcons = {
  online: 'fa-circle',
  offline: 'fa-circle-minus',
  busy: 'fa-circle-exclamation',
  'in-call': 'fa-phone',
  idle: 'fa-moon',
  dnd: 'fa-focus'
};

const statusColors = {
  'online': 'bg-green-500',
  'offline': 'bg-gray-500',
  'away': 'bg-yellow-500',
  'busy': 'bg-red-500',
  'in-call': 'bg-purple-500',
  'idle': 'bg-yellow-500',
  'dnd': 'bg-red-500'
} as const;

const getStatusColor = (status: string) => {
  return statusColors[status as keyof typeof statusColors] || statusColors.offline;
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  users,
  onUserSelect,
  onStatusChange,
  onLogout,
  className,
  selectedUserId,
  onError,
  onRemoteAccessStart,
}) => {
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [activeView, setActiveView] = useState<string>('chat');
  const [isControlling, setIsControlling] = useState<boolean>(false);
  const [showScreenShareDialog, setShowScreenShareDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const { 
    isSharing, 
    startSharing, 
    stopSharing, 
    error, 
    localStream, 
    remoteStream,
    isRemoteSharing,
    sharingWithUserId,
    viewingFromUserId,
    acceptRemoteShare,
    rejectRemoteShare 
  } = useScreenShare({
    userId: currentUser.id,
    onError: (error) => console.error('Screen share error:', error),
    onRemoteShareStarted: (userId) => {
      const user = users.find(u => u.id === userId);
      if (user) {
        setSelectedUser(user);
        setShowScreenShareDialog(true);
      }
    },
    onRemoteShareStopped: () => {
      setShowScreenShareDialog(false);
      setSelectedUser(null);
    }
  });

  const {
    isControlling: isRemoteControlling,
    startRemoteAccess,
    stopRemoteAccess,
    remoteStream: remoteAccessStream,
    error: remoteAccessError
  } = useRemoteAccess({
    userId: currentUser.id,
    onError: (error) => console.error('Remote access error:', error),
    onRemoteAccessStarted: (targetUserId) => {
      const user = users.find(u => u.id === targetUserId);
      if (user) {
        console.log('🎮 Remote access started for:', user.name);
        onRemoteAccessStart?.(user);
      }
    },
    onRemoteAccessStopped: () => {
      console.log('🛑 Remote access stopped');
    }
  });

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesOnlineFilter = showOnlineOnly ? user.status !== 'offline' : true;
    return matchesSearch && matchesOnlineFilter;
  });

  const onlineUsers = filteredUsers.filter(user => user.status !== 'offline');
  const offlineUsers = filteredUsers.filter(user => user.status === 'offline');

  const handleScreenShareClick = async (user: User) => {
    console.log('🎬 [Sidebar] Screen share clicked for user:', { 
      id: user.id, 
      name: user.name, 
      status: user.status 
    });
    setSelectedUser(user);
    setShowScreenShareDialog(true);
  };

  const handleStartSharing = async () => {
    try {
      console.log('🎬 [Sidebar] Starting screen share for user:', {
        id: selectedUser?.id,
        name: selectedUser?.name,
        status: selectedUser?.status
      });
      if (!selectedUser) {
        throw new Error('No user selected for screen sharing');
      }
      if (isSharing) {
        await stopSharing();
      } else {
        console.log('📤 [Sidebar] Calling startSharing with targetUserId:', selectedUser.id);
        await startSharing(selectedUser.id);
      }
    } catch (error) {
      console.error('❌ [Sidebar] Screen share error:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to start screen sharing');
    }
  };

  const handleViewScreenShare = async () => {
    if (selectedUser) {
      try {
        await acceptRemoteShare(selectedUser.id);
      } catch (error) {
        console.error('Failed to view screen share:', error);
      }
    }
  };

  const handleCloseScreenShare = () => {
    if (isSharing) {
      stopSharing();
    }
    setShowScreenShareDialog(false);
    setSelectedUser(null);
  };

  const handleRemoteAccessClick = async (user: User) => {
    try {
      console.log('🎮 [Sidebar] Starting remote access for user:', {
        id: user.id,
        name: user.name,
        status: user.status
      });
      
      if (isRemoteControlling) {
        await stopRemoteAccess();
      } else {
        await startRemoteAccess(user.id);
      }
    } catch (error) {
      console.error('❌ [Sidebar] Remote access error:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to start remote access');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return 'fa-circle';
      case 'offline':
        return 'fa-circle';
      case 'away':
        return 'fa-moon';
      case 'busy':
        return 'fa-minus-circle';
      case 'in-call':
        return 'fa-phone';
      default:
        return 'fa-circle';
    }
  };

  return (
    <div className="relative">
      <div className={`w-80 bg-zinc-900 flex flex-col ${className || ''}`}>
        {/* Search Section */}
        <div className="p-4 bg-zinc-800/50">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i className="fas fa-search text-zinc-500 text-sm" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Find a user..."
              className="w-full pl-10 pr-4 py-2 bg-zinc-900/90 text-zinc-200 placeholder-zinc-500
                       text-sm rounded-lg border border-zinc-700/50 focus:border-purple-500/50
                       focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
            />
          </div>

          {/* Filter Toggle */}
          <div className="mt-3 flex items-center justify-between">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowOnlineOnly(!showOnlineOnly)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm
                         transition-all duration-200 ${
                           showOnlineOnly
                             ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                             : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                         }`}
            >
              <i className={`fas fa-${showOnlineOnly ? 'check' : 'user'} text-xs`} />
              <span>{showOnlineOnly ? 'Online Only' : 'All Users'}</span>
            </motion.button>

            <span className="px-3 py-1 bg-zinc-800 rounded-lg text-xs text-zinc-400">
              {onlineUsers.length} online
            </span>
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-3 space-y-4">
            {/* Online Users Section */}
            {onlineUsers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center px-2 mb-2">
                  <div className="flex-1 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-green-400 mr-2" />
                    <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Online • {onlineUsers.length}
                    </h3>
                  </div>
                </div>
                <div className="space-y-1">
                  {onlineUsers.map(user => (
                    <UserListItem
                      key={user.id}
                      user={user}
                      isSelected={selectedUserId === user.id}
                      onClick={() => onUserSelect(user)}
                      setActiveView={setActiveView}
                      setIsControlling={setIsControlling}
                      onScreenShare={handleScreenShareClick}
                      onRemoteAccess={handleRemoteAccessClick}
                      isSharing={isSharing}
                      isRemoteSharing={isRemoteSharing}
                      isRemoteControlling={isRemoteControlling}
                      sharingWithUserId={sharingWithUserId}
                      viewingFromUserId={viewingFromUserId}
                      onStopScreenShare={handleCloseScreenShare}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Offline Users Section */}
            {!showOnlineOnly && offlineUsers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.1 }}
              >
                <div className="flex items-center px-2 mb-2">
                  <div className="flex-1 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-zinc-500 mr-2" />
                    <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Offline • {offlineUsers.length}
                    </h3>
                  </div>
                </div>
                <div className="space-y-1 opacity-75">
                  {offlineUsers.map(user => (
                    <UserListItem
                      key={user.id}
                      user={user}
                      isSelected={selectedUserId === user.id}
                      onClick={() => onUserSelect(user)}
                      setActiveView={setActiveView}
                      setIsControlling={setIsControlling}
                      onScreenShare={handleScreenShareClick}
                      onRemoteAccess={handleRemoteAccessClick}
                      isSharing={isSharing}
                      isRemoteSharing={isRemoteSharing}
                      isRemoteControlling={isRemoteControlling}
                      sharingWithUserId={sharingWithUserId}
                      viewingFromUserId={viewingFromUserId}
                      onStopScreenShare={handleCloseScreenShare}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Screen Share Dialog */}
      {showScreenShareDialog && selectedUser && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <NewScreenShareDialog
            user={selectedUser}
            onClose={handleCloseScreenShare}
            onStartSharing={handleStartSharing}
            onViewShare={handleViewScreenShare}
            isRemoteSharing={isRemoteSharing}
            isSharing={isSharing}
            localStream={localStream}
            remoteStream={remoteStream}
          />
        </div>
      )}
    </div>
  );
};

interface UserListItemProps {
  user: User;
  isSelected: boolean;
  onClick: () => void;
  setActiveView: (view: string) => void;
  setIsControlling: (isControlling: boolean) => void;
  onScreenShare: (user: User) => void;
  onRemoteAccess: (user: User) => void;
  isSharing: boolean;
  isRemoteSharing: boolean;
  isRemoteControlling: boolean;
  sharingWithUserId: string | null;
  viewingFromUserId: string | null;
  onStopScreenShare: () => void;
}

const UserListItem = ({
  user,
  isSelected,
  onClick,
  setActiveView,
  setIsControlling,
  onScreenShare,
  onRemoteAccess,
  isSharing,
  isRemoteSharing,
  isRemoteControlling,
  sharingWithUserId,
  viewingFromUserId,
  onStopScreenShare
}: UserListItemProps) => {
  const socketManager = SocketManager.getInstance();
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  
  // Only show sharing status if this user is the one we're sharing with
  const isCurrentlySharing = isSharing && sharingWithUserId === user.id;
  // Only show viewing status if this user is the one we're viewing from
  const isCurrentlyViewing = isRemoteSharing && viewingFromUserId === user.id;
  
  useEffect(() => {
    const socket = socketManager.connect(user.id);
    
    const handleConnect = () => {
      setIsSocketConnected(true);
    };

    const handleDisconnect = () => {
      setIsSocketConnected(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    setIsSocketConnected(socket.connected);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [user.id, user.name]);

  const handleScreenShareClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSocketConnected) {
      console.error('[UserListItem] Cannot start screen sharing: Socket not connected');
      return;
    }

    if (isSharing) {
        onStopScreenShare();
    } else {
      onScreenShare(user);
    }
  };

  const handleRemoteAccessClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSocketConnected) {
      console.error('[UserListItem] Cannot start remote access: Socket not connected');
      return;
    }

    onRemoteAccess(user);
  };

  return (
    <motion.div
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      className="relative group"
    >
      <div
        onClick={onClick}
        className={`w-full p-2 flex items-center rounded-lg relative overflow-hidden cursor-pointer
                 transition-all duration-200 ${
                   isSelected
                     ? 'bg-purple-500/20 hover:bg-purple-500/30'
                     : 'hover:bg-zinc-800/80'
                 }`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
      >
        {/* User Info */}
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <img
              src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}
              alt={user.name}
              className={`w-10 h-10 rounded-full object-cover transition-all duration-200
                       ${isSelected ? 'ring-2 ring-purple-500' : 'ring-1 ring-zinc-700'}`}
            />
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-zinc-900
                       ${getStatusColor(user.status)}`}
            />
          </div>

          {/* Name and Status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="font-medium text-zinc-200 truncate">
                {user.name}
              </h3>
              {user.role === 'admin' && (
                <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium bg-purple-500/20 
                             text-purple-400 rounded-full uppercase tracking-wider">
                  Admin
                </span>
              )}
              {/* Screen Share Status Indicator */}
              {isCurrentlySharing && (
                <span className="flex-shrink-0 px-2 py-0.5 text-[10px] font-medium bg-purple-500/20 
                             text-purple-400 rounded-full flex items-center space-x-1">
                  <i className="fas fa-desktop text-[8px]" />
                  <span>Sharing</span>
                </span>
              )}
              {isCurrentlyViewing && (
                <span className="flex-shrink-0 px-2 py-0.5 text-[10px] font-medium bg-green-500/20 
                             text-green-400 rounded-full flex items-center space-x-1">
                  <i className="fas fa-eye text-[8px]" />
                  <span>Viewing</span>
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-400 truncate flex items-center space-x-1">
              <span>{statusLabels[user.status]}</span>
              {isCurrentlySharing && (
                <span className="text-purple-400">• Screen sharing active</span>
              )}
              {isCurrentlyViewing && (
                <span className="text-green-400">• Viewing their screen</span>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {isSelected && (
          <div className="flex items-center space-x-1 ml-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleScreenShareClick}
              disabled={!isSocketConnected}
              className={`p-2 rounded-lg relative ${
                !isSocketConnected
                  ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                  : isCurrentlySharing
                  ? 'bg-purple-500/30 text-purple-400 shadow-lg shadow-purple-500/20'
                  : isCurrentlyViewing
                  ? 'bg-green-500/30 text-green-400 shadow-lg shadow-green-500/20'
                  : 'bg-zinc-800 hover:bg-purple-500/30 text-zinc-400 hover:text-purple-400'
              } transition-all duration-200`}
              title={
                !isSocketConnected 
                  ? 'Connecting to server...' 
                  : isCurrentlySharing 
                  ? `Stop sharing your screen with ${user.name}` 
                  : isCurrentlyViewing
                  ? `Currently viewing ${user.name}'s screen - click to manage`
                  : `Share your screen with ${user.name}`
              }
            >
              <i className={`fas ${
                isCurrentlySharing 
                  ? 'fa-desktop' 
                  : isCurrentlyViewing
                  ? 'fa-eye'
                  : 'fa-desktop'
              } text-sm`} />
              
              {/* Active indicator */}
              {(isCurrentlySharing || isCurrentlyViewing) && (
                <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
                  isCurrentlySharing ? 'bg-purple-500' : 'bg-green-500'
                } animate-pulse`} />
              )}
              
              {/* Connecting indicator */}
              {!isSocketConnected && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-yellow-500 animate-ping" />
              )}
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleRemoteAccessClick}
              disabled={!isSocketConnected}
              className={`p-2 rounded-lg relative ${
                !isSocketConnected
                  ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                  : isRemoteControlling
                  ? 'bg-orange-500/30 text-orange-400 shadow-lg shadow-orange-500/20'
                  : 'bg-zinc-800 hover:bg-orange-500/30 text-zinc-400 hover:text-orange-400'
              } transition-all duration-200`}
              title={
                !isSocketConnected 
                  ? 'Connecting to server...' 
                  : isRemoteControlling 
                  ? `Stop controlling ${user.name}'s computer` 
                  : `Take remote control of ${user.name}'s computer`
              }
            >
              <i className={`fas ${
                isRemoteControlling 
                  ? 'fa-desktop' 
                  : 'fa-mouse-pointer'
              } text-sm`} />
              
              {/* Active indicator */}
              {isRemoteControlling && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
              )}
              
              {/* Connecting indicator */}
              {!isSocketConnected && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-yellow-500 animate-ping" />
              )}
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Sidebar; 