import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu } from '@headlessui/react';
import { Sidebar } from './Sidebar';
import { Chat } from './Chat';
import { RemoteControl } from './RemoteControl';
import { RemoteAccessViewer } from './RemoteAccessViewer';
import { ScreenShare } from './ScreenShare';
import { UserProfile } from './UserProfile';
import { AdminSettings } from './AdminSettings';
import { Logo } from './Logo';
import { logout } from '../services/auth';
import { getUserProfile, updateUserProfile, updateUserStatus, getAllUsers } from '../services/user';
import { User, UserStatus } from '../types/user';
import { chatService } from '../services/chatService';
import { Message } from '../types/chat';
import { useRemoteAccess } from '../hooks/useRemoteAccess';
import SocketManager from '../utils/socketManager';

// Current User Profile Component
const CurrentUserProfile: React.FC<{
  user: User;
  onLogout: () => void;
  onStatusChange: (status: UserStatus) => void;
  onProfileUpdate: (updatedProfile: Partial<User>) => void;
}> = ({ user, onLogout, onStatusChange, onProfileUpdate }) => {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <div className="fixed bottom-0 w-80 bg-zinc-800 border-t border-zinc-700">
        {/* Main Profile Bar */}
        <div className="flex items-center h-[68px] px-4">
          {/* Avatar Section */}
          <div className="relative">
            <img
              src={user.avatar}
              alt={user.name}
              className="h-9 w-9 rounded-full ring-2 ring-zinc-700"
            />
            <span
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full 
                       ring-2 ring-zinc-800 transition-all duration-200
                       ${user.status === 'online' ? 'bg-green-500' :
                         user.status === 'busy' ? 'bg-red-500' :
                         user.status === 'idle' ? 'bg-amber-500' :
                         'bg-zinc-500'}`}
            />
          </div>

          {/* User Info Section */}
          <div className="ml-3 flex-1 min-w-0">
            <h3 className="text-sm font-medium text-zinc-100 truncate">
              {user.name}
            </h3>
            <p className="text-xs text-zinc-400 truncate">
              {user.title || 'Online'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-zinc-400 hover:text-zinc-100 rounded-lg 
                     hover:bg-zinc-700/50 transition-colors"
            >
              <i className="fas fa-cog text-lg" />
            </button>
            <button
              onClick={onLogout}
              className="p-2 text-zinc-400 hover:text-red-400 rounded-lg 
                     hover:bg-zinc-700/50 transition-colors"
            >
              <i className="fas fa-sign-out-alt text-lg" />
            </button>
          </div>

          {/* Status Menu Popup */}
          {showStatusMenu && (
            <div className="absolute bottom-full left-0 w-full p-2">
              <div className="bg-zinc-800 rounded-lg shadow-lg border border-zinc-700 overflow-hidden">
                <div className="p-3 border-b border-zinc-700">
                  <div className="flex items-center gap-3">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="h-10 w-10 rounded-full"
                    />
                    <div>
                      <h4 className="text-sm font-medium text-zinc-100">{user.name}</h4>
                      <p className="text-xs text-zinc-400">{user.title}</p>
                    </div>
                  </div>
                </div>
                <div className="p-2">
                  {[
                    { status: 'online', label: 'Online', icon: 'circle', color: 'text-green-400' },
                    { status: 'busy', label: 'Do Not Disturb', icon: 'moon', color: 'text-red-400' },
                    { status: 'idle', label: 'Idle', icon: 'clock', color: 'text-amber-400' },
                    { status: 'offline', label: 'Invisible', icon: 'circle-minus', color: 'text-zinc-400' }
                  ].map((option) => (
                    <button
                      key={option.status}
                      onClick={() => {
                        onStatusChange(option.status as UserStatus);
                        setShowStatusMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md
                               ${user.status === option.status ? 'bg-zinc-700' : 'hover:bg-zinc-700/50'}
                               transition-colors duration-200`}
                    >
                      <i className={`fas fa-${option.icon} ${option.color}`} />
                      <span className="text-sm text-zinc-100">{option.label}</span>
                      {user.status === option.status && (
                        <i className="fas fa-check ml-auto text-purple-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Admin Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <AdminSettings
            currentUser={user}
            onClose={() => setShowSettings(false)}
            onStatusChange={onStatusChange}
            onProfileUpdate={onProfileUpdate}
          />
        )}
      </AnimatePresence>
    </>
  );
};

const HomePage: React.FC = () => {
  // 🔥 CRITICAL: Stable state management to prevent hook re-creation
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'chat' | 'remote' | 'profile'>('chat');
  const [isControlling, setIsControlling] = useState<boolean>(false);

  // 🔥 SIMPLIFIED: Remote access state (no complex state synchronization)
  const [showRemoteAccessViewer, setShowRemoteAccessViewer] = useState(false);
  const [remoteAccessTarget, setRemoteAccessTarget] = useState<User | null>(null);

  // 🔥 CRITICAL FIX: Use useCallback for ALL callbacks to prevent hook re-creation
  const handleError = useCallback((error: string) => {
    console.error('🚨 [HomePage] Error:', error);
    setError(error);
  }, []);

  const handleRemoteAccessStarted = useCallback((targetUserId: string) => {
    console.log('🎮 [HomePage] Remote access started for target:', targetUserId);
    // Find the target user and set states
    const targetUser = users.find(user => user.id === targetUserId);
    if (targetUser) {
      console.log('🎮 [HomePage] Setting remote access target:', targetUser.name);
      setRemoteAccessTarget(targetUser);
      setShowRemoteAccessViewer(true);
    }
  }, [users]);

  const handleRemoteAccessStopped = useCallback(() => {
    console.log('🛑 [HomePage] Remote access stopped');
    setShowRemoteAccessViewer(false);
    setRemoteAccessTarget(null);
  }, []);

  // 🔥 CRITICAL: Always call hook with stable callbacks - NO conditional calling
  const { 
    startRemoteAccess,
    stopRemoteAccess,
    isControlling: isRemoteControlling,
    remoteStream: remoteAccessStream,
    hasRemoteStream,
    remoteStreamId: remoteAccessStreamId
  } = useRemoteAccess({
    userId: currentUser?.id || '', // Safe fallback, hook handles empty string
    onError: handleError,
    onRemoteAccessStarted: handleRemoteAccessStarted,
    onRemoteAccessStopped: handleRemoteAccessStopped,
  });

  // 🔥 DEBUG: Track hook state synchronization
  useEffect(() => {
    console.log('[HomePage] 🔍 Hook state update:', {
      isRemoteControlling,
      hasRemoteStream,
      remoteAccessStreamId,
      showRemoteAccessViewer,
      remoteAccessTarget: remoteAccessTarget?.name
    });
    
    // Auto-show viewer when remote stream is available
    if (isRemoteControlling && hasRemoteStream && !showRemoteAccessViewer) {
      console.log('[HomePage] ✅ Auto-showing remote access viewer due to stream availability');
      setShowRemoteAccessViewer(true);
    }
  }, [isRemoteControlling, hasRemoteStream, remoteAccessStreamId, showRemoteAccessViewer, remoteAccessTarget]);

  // 🔥 STABILIZED: Fetch data effect with stable dependencies
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('🔍 [HomePage] Fetching user data...');
        const [userData, allUsers] = await Promise.all([
          getUserProfile(),
          getAllUsers()
        ]);
        
        console.log('👤 [HomePage] Current user:', { id: userData.id, name: userData.name });
        setCurrentUser(userData);
        setUsers(allUsers);

        // Initialize socket connection for the current user
        const socketManager = SocketManager.getInstance();
        socketManager.connect(userData.id);
      } catch (err) {
        setError('Failed to fetch user data');
        console.error('❌ [HomePage] Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Cleanup socket connection on unmount
    return () => {
      const socketManager = SocketManager.getInstance();
      socketManager.disconnect();
    };
  }, []); // 🔥 STABLE: Empty dependencies

  // 🔥 STABILIZED: Chat history effect
  useEffect(() => {
    if (selectedUser && currentUser) {
      chatService.getChatHistory(selectedUser.id)
        .then((history: Message[]) => {
          setMessages(history);
        })
        .catch((err: Error) => {
          console.error('Failed to load chat history:', err);
        });

      // Set up real-time message listeners
      chatService.onNewMessage((message: Message) => {
        setMessages(prev => [...prev, message]);
      });
    }
  }, [selectedUser?.id, currentUser?.id]); // 🔥 STABLE: Only depend on IDs

  // 🔥 STABILIZED: All callback handlers with useCallback
  const handleStatusChange = useCallback(async (status: UserStatus) => {
    if (!currentUser) return;
    
    try {
      const updatedUser = await updateUserStatus(status);
      setCurrentUser(updatedUser);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  }, [currentUser?.id]); // Only depend on currentUser.id

  const handleProfileUpdate = useCallback(async (updatedProfile: Partial<User>) => {
    if (!currentUser) return;

    try {
      const updatedUser = await updateUserProfile(updatedProfile);
      setCurrentUser(updatedUser);
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  }, [currentUser?.id]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!selectedUser || !content.trim() || !currentUser) return;

    try {
      const savedMessage = await chatService.sendMessage(selectedUser.id, content);
      setMessages(prev => [...prev, savedMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [selectedUser?.id, currentUser?.id]);

  const handleAddUser = useCallback(() => {
    console.log('Add user clicked');
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    window.location.reload();
  }, []);

  const handleRemoteAccessStart = useCallback((targetUser: User) => {
    console.log('🎮 [HomePage] Remote access started from sidebar for:', targetUser.name);
    setRemoteAccessTarget(targetUser);
    setShowRemoteAccessViewer(true);
  }, []);

  const handleRemoteAccessClose = useCallback(() => {
    console.log('🛑 [HomePage] Closing remote access viewer');
    setShowRemoteAccessViewer(false);
    setRemoteAccessTarget(null);
    if (isRemoteControlling) {
      stopRemoteAccess();
    }
  }, [isRemoteControlling, stopRemoteAccess]);

  // Early returns with stable JSX
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-discord-dark">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (error || !currentUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-discord-dark">
        <div className="text-red-500">{error || 'Failed to load user data'}</div>
      </div>
    );
  }

  return (
    <div 
      className="flex flex-col h-screen bg-discord-dark text-white overflow-hidden"
    >
      {/* Full-width header with centered logo */}
      <div className="w-full h-14 bg-discord-dark-secondary border-b border-discord-divider flex items-center justify-center">
        <Logo size="md" showText={true} />
      </div>

      {/* Main content container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Users List and Current User */}
        <div className="w-80 bg-discord-dark-primary flex flex-col">

          {/* Users List */}
          <div className="flex-1 overflow-y-auto">
            <Sidebar
              currentUser={currentUser}
              users={users}
              onUserSelect={setSelectedUser}
              onStatusChange={handleStatusChange}
              onLogout={handleLogout}
              selectedUserId={selectedUser?.id || null}
              onRemoteAccessStart={handleRemoteAccessStart}
            />
          </div>

          {/* Current User Profile */}
          <CurrentUserProfile
            user={currentUser}
            onLogout={handleLogout}
            onStatusChange={handleStatusChange}
            onProfileUpdate={handleProfileUpdate}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex">
          {selectedUser ? (
            <>
              {activeView === 'chat' && (
                <Chat
                  selectedUser={selectedUser}
                  currentUser={currentUser}
                  onSendMessage={handleSendMessage}
                  onStartCall={() => setActiveView('remote')}
                  onStartVideoCall={() => setActiveView('remote')}
                />
              )}
              {activeView === 'remote' && !isControlling && (
                <ScreenShare
                  isHost={currentUser.role === 'admin'}
                  roomId={`screen-${currentUser.id}-${selectedUser.id}`}
                  onError={(error) => console.error('Screen share error:', error)}
                />
              )}
              {activeView === 'remote' && isControlling && (
                <RemoteControl
                  targetUser={selectedUser}
                  isControlling={isControlling}
                  onControlChange={setIsControlling}
                />
              )}
              {activeView === 'profile' && (
                <UserProfile
                  user={selectedUser}
                  onClose={() => setActiveView('chat')}
                  onProfileUpdate={handleProfileUpdate}
                />
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-discord-dark-secondary">
              <div className="text-center text-discord-text-muted">
                <h2 className="text-2xl font-semibold mb-2">Welcome to Remotely</h2>
                <p>Select a user to start chatting, share your screen, or enable remote control.</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Remote Access Viewer Overlay */}
      {(showRemoteAccessViewer || (isRemoteControlling && hasRemoteStream)) && remoteAccessTarget && (
        <RemoteAccessViewer
          targetUser={remoteAccessTarget}
          remoteStream={remoteAccessStream}
          isConnected={isRemoteControlling}
          onClose={handleRemoteAccessClose}
          onError={(error) => setError(error)}
        />
      )}
    </div>
  );
};

export default HomePage; 