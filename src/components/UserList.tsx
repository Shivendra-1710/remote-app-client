import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { AdminSettings } from './AdminSettings';
import { Logo } from './Logo';
import { getDefaultAvatar } from '../utils/avatar';
import { User, UserStatus } from '../types/user';

interface UserListProps {
  users: User[];
  selectedUser: User | null;
  onUserSelect: (user: User) => void;
  currentUser: User | null;
  onAddUser: () => void;
  onStatusChange: (status: UserStatus) => Promise<void>;
  onProfileUpdate: (updatedProfile: Partial<User>) => Promise<void>;
  onShowSettings?: () => void;
}

export const UserList: React.FC<UserListProps> = ({
  users,
  selectedUser,
  onUserSelect,
  currentUser,
  onAddUser,
  onStatusChange,
  onProfileUpdate,
  onShowSettings,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5001/api/users/online', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
          onUserSelect(response.data.users);
        }
      } catch (err) {
        setError('Failed to fetch users');
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
    const interval = setInterval(fetchUsers, 30000);
    return () => clearInterval(interval);
  }, [onUserSelect]);

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                         (user.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||      
                         (user.department?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                         (user.title?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    
    const matchesFilter = filter === 'all' ||
                         (filter === 'online' && user.status !== 'offline') ||
                         (filter === 'offline' && user.status === 'offline');
    
    return matchesSearch && matchesFilter;
  });

  const onlineCount = users.filter(u => u.status !== 'offline').length;
  const offlineCount = users.length - onlineCount;

  return (
    <div className="w-64 bg-discord-dark-primary flex flex-col">
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-discord-divider">
        <Logo size="sm" />
      </div>

      {/* Search and Filter */}
      <div className="p-3 border-b border-discord-divider">
        <div className="relative mb-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="w-full px-3 py-1.5 pl-8 bg-discord-dark rounded-md text-discord-text placeholder-discord-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-discord-accent"
          />
          <i className="fas fa-search absolute left-2.5 top-2.5 text-discord-text-muted text-sm" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-discord-text-muted hover:text-discord-text"
            >
              <i className="fas fa-times text-sm" />
            </button>
          )}
        </div>
        <div className="flex space-x-2 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-1 rounded ${
              filter === 'all'
                ? 'bg-discord-accent text-white'
                : 'text-discord-text-muted hover:text-discord-text hover:bg-discord-hover'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('online')}
            className={`px-2 py-1 rounded flex items-center ${
              filter === 'online'
                ? 'bg-discord-accent text-white'
                : 'text-discord-text-muted hover:text-discord-text hover:bg-discord-hover'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-green-500 mr-1.5" />
            Online ({onlineCount})
          </button>
          <button
            onClick={() => setFilter('offline')}
            className={`px-2 py-1 rounded flex items-center ${
              filter === 'offline'
                ? 'bg-discord-accent text-white'
                : 'text-discord-text-muted hover:text-discord-text hover:bg-discord-hover'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-gray-500 mr-1.5" />
            Offline ({offlineCount})
          </button>
        </div>
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-y-auto py-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-discord-accent"></div>
          </div>
        ) : error ? (
          <div className="px-4 py-8 text-center text-discord-text-muted">
            <i className="fas fa-exclamation-circle text-2xl mb-2" />
            <p className="text-sm">{error}</p>
          </div>
        ) : filteredUsers.length > 0 ? (
          <div className="space-y-0.5 px-2">
            {filteredUsers.map((user) => (
              <motion.button
                key={user.id}
                onClick={() => onUserSelect(user)}
                whileHover={{ x: 4 }}
                className={`w-full px-2 py-2 flex items-center space-x-3 rounded-md cursor-pointer transition-colors ${
                  selectedUser?.id === user.id
                    ? 'bg-discord-selected text-white'
                    : 'text-discord-text hover:bg-discord-hover'
                }`}
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={user.avatar || getDefaultAvatar(user.name)}
                    alt={user.name}
                    className="w-8 h-8 rounded-full bg-discord-dark object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = getDefaultAvatar(user.name);
                    }}
                  />
                  <div
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-discord-dark-primary ${
                      user.status === 'online'
                        ? 'bg-green-500'
                        : user.status === 'busy'
                        ? 'bg-red-500'
                        : user.status === 'in-call'
                        ? 'bg-yellow-500'
                        : 'bg-gray-500'
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-sm font-medium truncate flex items-center">
                    {user.name}
                    {user.role === 'admin' && (
                      <span className="ml-1.5 px-1 py-0.5 bg-discord-accent bg-opacity-25 text-discord-accent text-xs rounded">
                        ADMIN
                      </span>
                    )}
                  </div>
                  {(user.activity || user.customStatus) && (
                    <div className="text-xs text-discord-text-muted truncate">
                      {user.activity || user.customStatus}
                    </div>
                  )}
                  {user.department && (
                    <div className="text-xs text-discord-text-muted truncate">
                      {user.department}
                    </div>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-discord-text-muted">
            <i className="fas fa-search text-2xl mb-2" />
            <p className="text-sm">No users found</p>
            {searchQuery && (
              <p className="text-xs mt-1">
                Try adjusting your search or filters
              </p>
            )}
          </div>
        )}
      </div>

      {/* Current User Profile */}
      {currentUser && (
        <div className="mt-auto p-3 bg-discord-dark-secondary flex items-center space-x-3">
          <div className="relative">
            <img
              src={currentUser.avatar || getDefaultAvatar(currentUser.name)}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full bg-discord-dark object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setShowSettings(true)}
            />
            <div
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-discord-dark-secondary ${
                currentUser.status === 'online'
                  ? 'bg-green-500'
                  : currentUser.status === 'busy'
                  ? 'bg-red-500'
                  : currentUser.status === 'in-call'
                  ? 'bg-yellow-500'
                  : 'bg-gray-500'
              }`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">
              {currentUser.name}
            </div>
            <div className="text-xs text-discord-text-muted truncate flex items-center">
              <div
                className={`w-2 h-2 rounded-full mr-1.5 ${
                  currentUser.status === 'online'
                    ? 'bg-green-500'
                    : currentUser.status === 'busy'
                    ? 'bg-red-500'
                    : currentUser.status === 'in-call'
                    ? 'bg-yellow-500'
                    : 'bg-gray-500'
                }`}
              />
              {currentUser.status.charAt(0).toUpperCase() + currentUser.status.slice(1)}
            </div>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="w-8 h-8 flex items-center justify-center rounded-md text-discord-text-muted hover:text-discord-text hover:bg-discord-hover transition-colors"
          >
            <i className="fas fa-cog" />
          </button>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && currentUser && (
        <AdminSettings
          onClose={() => setShowSettings(false)}
          currentUser={currentUser}
          onStatusChange={(status) => {
            onStatusChange(status);
            setShowSettings(false);
          }}
          onProfileUpdate={(profile) => {
            onProfileUpdate(profile);
            setShowSettings(false);
          }}
          onAddUser={onAddUser}
        />
      )}
    </div>
  );
};