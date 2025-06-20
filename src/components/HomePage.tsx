import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu } from '@headlessui/react';
import { Sidebar } from './Sidebar';
import { Chat } from './Chat';
import { RemoteControl } from './RemoteControl';
import { ScreenShare } from './ScreenShare';
import { UserProfile } from './UserProfile';
import { AdminSettings } from './AdminSettings';
import { Logo } from './Logo';
import { logout } from '../services/auth';
import { getUserProfile, updateUserProfile, updateUserStatus, getAllUsers } from '../services/user';
import { User, UserStatus } from '../types/user';
import { chatService } from '../services/chatService';
import { Message } from '../types/chat';
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
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<'chat' | 'remote' | 'profile'>('chat');
  const [isControlling, setIsControlling] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Replace hardcoded current user with state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  // Fetch current user data and all users on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userData, allUsers] = await Promise.all([
          getUserProfile(),
          getAllUsers()
        ]);
        setCurrentUser(userData);
        setUsers(allUsers);

        // Initialize socket connection for the current user
        const socketManager = SocketManager.getInstance();
        socketManager.connect(userData.id);
      } catch (err) {
        setError('Failed to fetch user data');
        console.error('Error fetching data:', err);
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
  }, []);

  // Load chat history when a user is selected
  useEffect(() => {
    if (selectedUser && currentUser) {
      console.log('Loading chat history for users:', {
        currentUser: currentUser.id,
        selectedUser: selectedUser.id
      });

      chatService.getChatHistory(selectedUser.id)
        .then((history: Message[]) => {
          console.log('Received chat history:', history);
          setMessages(history);
        })
        .catch((err: Error) => {
          console.error('Failed to load chat history:', err);
        });

      // Set up real-time message listeners
      chatService.onNewMessage((message: Message) => {
        console.log('Received new message:', message);
        setMessages(prev => {
          console.log('Previous messages:', prev);
          return [...prev, message];
        });
      });
    }
  }, [selectedUser, currentUser]);

  const handleStatusChange = async (status: UserStatus) => {
    if (!currentUser) return;
    
    try {
      const updatedUser = await updateUserStatus(status);
      setCurrentUser(updatedUser);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleProfileUpdate = async (updatedProfile: Partial<User>) => {
    if (!currentUser) return;

    try {
      const updatedUser = await updateUserProfile(updatedProfile);
      setCurrentUser(updatedUser);
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedUser || !content.trim() || !currentUser) return;

    try {
      console.log('Sending message:', {
        content,
        to: selectedUser.id,
        from: currentUser.id
      });

      // Send the message through the socket
      const savedMessage = await chatService.sendMessage(selectedUser.id, content);
      console.log('Message saved successfully:', savedMessage);

      // Update messages with the saved message
      setMessages(prev => [...prev, savedMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleAddUser = () => {
    // Implement user addition logic
    console.log('Add user clicked');
  };

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  // Add loading and error states to the render
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
    <div className="flex flex-col h-screen bg-discord-dark text-white overflow-hidden">
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
    </div>
  );
};

export default HomePage; 