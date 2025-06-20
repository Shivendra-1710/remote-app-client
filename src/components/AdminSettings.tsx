import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfileSettings } from './UserProfileSettings';
import { AddUser } from './AddUser';
import { User, UserStatus } from '../types/user';

interface AdminSettingsProps {
  onClose: () => void;
  currentUser: User;
  onStatusChange: (status: UserStatus) => void;
  onProfileUpdate: (updatedProfile: Partial<User>) => void;
  onAddUser?: () => void;
}

type SettingsView = 'main' | 'profile' | 'notifications' | 'privacy' | 'app' | 'add-user' | 'user-management' | 'activity-logs';

export const AdminSettings: React.FC<AdminSettingsProps> = ({
  onClose,
  currentUser,
  onStatusChange,
  onProfileUpdate,
  onAddUser
}) => {
  const [currentView, setCurrentView] = useState<SettingsView>('main');

  const renderMainView = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="flex-1 overflow-y-auto"
    >
      <div className="p-6 border-b border-discord-divider">
        <h2 className="text-2xl font-bold text-white">User Settings</h2>
      </div>
      
      <div className="p-6 space-y-6">
        {/* Profile Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-discord-text">User Profile</h3>
          <div className="bg-discord-dark-secondary rounded-lg p-4 flex items-center space-x-4 hover:bg-discord-hover cursor-pointer"
               onClick={() => setCurrentView('profile')}>
            <img src={currentUser.avatar} alt={currentUser.name} className="w-16 h-16 rounded-full" />
            <div className="flex-1">
              <h4 className="text-white font-medium">{currentUser.name}</h4>
              <p className="text-discord-text-muted">{currentUser.email}</p>
              <p className="text-discord-text-muted text-sm">{currentUser.title}</p>
            </div>
            <i className="fas fa-chevron-right text-discord-text-muted" />
          </div>
        </div>

        {/* Status Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-discord-text">Status</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { status: 'online', label: 'Online', color: 'bg-green-500', icon: 'circle' },
              { status: 'idle', label: 'Idle', color: 'bg-yellow-500', icon: 'moon' },
              { status: 'dnd', label: 'Do Not Disturb', color: 'bg-red-500', icon: 'minus-circle' },
              { status: 'offline', label: 'Invisible', color: 'bg-gray-500', icon: 'circle-dot' }
            ].map((option) => (
              <button
                key={option.status}
                onClick={() => onStatusChange(option.status as UserStatus)}
                className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200
                  ${currentUser.status === option.status 
                    ? 'bg-discord-selected text-white' 
                    : 'bg-discord-dark-secondary hover:bg-discord-hover text-discord-text'}`}
              >
                <div className={`w-3 h-3 rounded-full ${option.color}`} />
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Admin Controls */}
        {currentUser.role === 'admin' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-discord-text">Admin Controls</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setCurrentView('add-user')}
                className="bg-discord-dark-secondary hover:bg-discord-hover text-white p-4 rounded-lg transition-all duration-200 flex items-center space-x-3"
              >
                <div className="w-10 h-10 rounded-lg bg-discord-accent flex items-center justify-center">
                  <i className="fas fa-user-plus text-lg" />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-medium">Add User</h4>
                  <p className="text-sm text-discord-text-muted">Create new user accounts</p>
                </div>
              </button>
              
              <button
                onClick={() => setCurrentView('user-management')}
                className="bg-discord-dark-secondary hover:bg-discord-hover text-white p-4 rounded-lg transition-all duration-200 flex items-center space-x-3"
              >
                <div className="w-10 h-10 rounded-lg bg-discord-accent flex items-center justify-center">
                  <i className="fas fa-users-cog text-lg" />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-medium">User Management</h4>
                  <p className="text-sm text-discord-text-muted">Manage existing users</p>
                </div>
              </button>
              
              <button
                onClick={() => setCurrentView('activity-logs')}
                className="bg-discord-dark-secondary hover:bg-discord-hover text-white p-4 rounded-lg transition-all duration-200 flex items-center space-x-3"
              >
                <div className="w-10 h-10 rounded-lg bg-discord-accent flex items-center justify-center">
                  <i className="fas fa-history text-lg" />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-medium">Activity Logs</h4>
                  <p className="text-sm text-discord-text-muted">View system activity</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* App Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-discord-text">App Settings</h3>
          <div className="space-y-2">
            {[
              { view: 'notifications', label: 'Notifications', icon: 'bell' },
              { view: 'privacy', label: 'Privacy & Safety', icon: 'shield-alt' },
              { view: 'app', label: 'App Settings', icon: 'sliders-h' }
            ].map((setting) => (
              <button
                key={setting.view}
                onClick={() => setCurrentView(setting.view as SettingsView)}
                className="w-full flex items-center justify-between p-4 rounded-lg bg-discord-dark-secondary hover:bg-discord-hover transition-all duration-200"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-discord-accent flex items-center justify-center">
                    <i className={`fas fa-${setting.icon}`} />
                  </div>
                  <span className="text-discord-text">{setting.label}</span>
                </div>
                <i className="fas fa-chevron-right text-discord-text-muted" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-discord-dark rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex"
      >
        {/* Sidebar */}
        <div className="w-64 bg-discord-dark-secondary border-r border-discord-divider flex flex-col">
          {/* User Info */}
          <div className="p-4 border-b border-discord-divider">
            <div className="flex items-center space-x-3">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-10 h-10 rounded-full"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-medium truncate">{currentUser.name}</h3>
                <p className="text-discord-text-muted text-sm truncate">{currentUser.email}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto py-4">
            <nav className="px-2 space-y-1">
              {[
                { view: 'main', label: 'Overview', icon: 'home' },
                { view: 'profile', label: 'My Profile', icon: 'user' },
                { view: 'notifications', label: 'Notifications', icon: 'bell' },
                { view: 'privacy', label: 'Privacy', icon: 'shield-alt' },
                { view: 'app', label: 'App Settings', icon: 'cog' },
                ...(currentUser.role === 'admin' ? [
                  { view: 'add-user', label: 'Add User', icon: 'user-plus' },
                  { view: 'user-management', label: 'User Management', icon: 'users-cog' },
                  { view: 'activity-logs', label: 'Activity Logs', icon: 'history' }
                ] : [])
              ].map((item) => (
                <button
                  key={item.view}
                  onClick={() => setCurrentView(item.view as SettingsView)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors duration-200
                    ${currentView === item.view 
                      ? 'bg-discord-selected text-white' 
                      : 'text-discord-text hover:bg-discord-hover'}`}
                >
                  <i className={`fas fa-${item.icon} w-5 text-center`} />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Close Button */}
          <div className="p-4 border-t border-discord-divider">
            <button
              onClick={onClose}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-discord-text hover:bg-discord-hover hover:text-white transition-colors"
            >
              <i className="fas fa-times" />
              <span>Close Settings</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <AnimatePresence mode="wait">
            {currentView === 'main' && renderMainView()}
            {currentView === 'profile' && (
              <UserProfileSettings
                user={currentUser}
                onSave={onProfileUpdate}
                onCancel={() => setCurrentView('main')}
              />
            )}
            {currentView === 'add-user' && (
              <AddUser
                onClose={() => setCurrentView('main')}
                onUserAdded={() => {
                  onAddUser?.();
                  setCurrentView('main');
                }}
              />
            )}
            {currentView === 'notifications' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="p-6"
              >
                <h2 className="text-2xl font-bold text-white mb-4">Notifications</h2>
                <p className="text-discord-text-muted">Notification settings coming soon...</p>
              </motion.div>
            )}
            {currentView === 'privacy' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="p-6"
              >
                <h2 className="text-2xl font-bold text-white mb-4">Privacy & Safety</h2>
                <p className="text-discord-text-muted">Privacy settings coming soon...</p>
              </motion.div>
            )}
            {currentView === 'app' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="p-6"
              >
                <h2 className="text-2xl font-bold text-white mb-4">App Settings</h2>
                <p className="text-discord-text-muted">App settings coming soon...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}; 