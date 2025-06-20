import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '../types/user';

interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice' | 'screen';
  category: string;
}

interface ChannelListProps {
  channels: Channel[];
  selectedChannel: Channel | null;
  onChannelSelect: (channel: Channel) => void;
  users: User[];
  currentUser: User | null;
  onAddUser: () => void;
}

export const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  selectedChannel,
  onChannelSelect,
  users,
  currentUser,
  onAddUser,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Text Channels': true,
    'Remote Access': true,
  });

  const categories = channels.reduce((acc, channel) => {
    if (!acc[channel.category]) {
      acc[channel.category] = [];
    }
    acc[channel.category].push(channel);
    return acc;
  }, {} as Record<string, Channel[]>);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const getChannelIcon = (type: Channel['type']) => {
    switch (type) {
      case 'text':
        return 'fas fa-hashtag';
      case 'voice':
        return 'fas fa-volume-up';
      case 'screen':
        return 'fas fa-desktop';
      default:
        return 'fas fa-hashtag';
    }
  };

  return (
    <div className="w-60 bg-discord-dark-primary flex flex-col">
      {/* Server Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-discord-divider shadow-sm">
        <h2 className="font-semibold text-white">Remote Desktop</h2>
        <button className="text-discord-text-muted hover:text-discord-text">
          <i className="fas fa-chevron-down" />
        </button>
      </div>

      {/* Channels */}
      <div className="flex-1 overflow-y-auto space-y-2 pt-4">
        {Object.entries(categories).map(([category, categoryChannels]) => (
          <div key={category}>
            <button
              onClick={() => toggleCategory(category)}
              className="px-4 flex items-center text-xs font-semibold text-discord-text-muted hover:text-discord-text uppercase tracking-wide group w-full"
            >
              <i className={`fas fa-chevron-${expandedCategories[category] ? 'down' : 'right'} mr-1 w-3`} />
              {category}
            </button>
            <AnimatePresence>
              {expandedCategories[category] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-1 space-y-0.5"
                >
                  {categoryChannels.map((channel) => (
                    <button
                      key={channel.id}
                      onClick={() => onChannelSelect(channel)}
                      className={`w-full px-4 py-1 flex items-center space-x-2 rounded group hover:bg-discord-hover ${
                        selectedChannel?.id === channel.id ? 'bg-discord-selected text-white' : 'text-discord-text-muted'
                      }`}
                    >
                      <i className={`${getChannelIcon(channel.type)} w-4`} />
                      <span className="truncate">{channel.name}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Online Users */}
      <div className="mt-4">
        <div className="px-4 flex items-center justify-between text-xs font-semibold text-discord-text-muted uppercase tracking-wide">
          <span>Online — {users.filter(u => u.status === 'online').length}</span>
          {currentUser?.role === 'admin' && (
            <button
              onClick={onAddUser}
              className="hover:text-discord-text"
            >
              <i className="fas fa-plus" />
            </button>
          )}
        </div>
        <div className="mt-2 space-y-0.5">
          {users.map((user) => (
            <div
              key={user.id}
              className="px-4 py-1 flex items-center space-x-3 hover:bg-discord-hover group cursor-pointer"
            >
              <div className="relative">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-8 h-8 rounded-full"
                />
                <div
                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-discord-dark-primary ${
                    user.status === 'online'
                      ? 'bg-green-500'
                      : user.status === 'idle'
                      ? 'bg-yellow-500'
                      : user.status === 'dnd'
                      ? 'bg-red-500'
                      : 'bg-gray-500'
                  }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-discord-text truncate">
                  {user.name}
                  {user.role === 'admin' && (
                    <span className="ml-1 text-xs bg-discord-accent text-white px-1 rounded">
                      ADMIN
                    </span>
                  )}
                </div>
                {user.activity && (
                  <div className="text-xs text-discord-text-muted truncate">
                    {user.activity}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User Controls */}
      <div className="mt-auto p-2 bg-discord-dark-secondary flex items-center space-x-2">
        {currentUser && (
          <>
            <div className="relative">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full"
              />
              <div
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-discord-dark-secondary ${
                  currentUser.status === 'online'
                    ? 'bg-green-500'
                    : currentUser.status === 'idle'
                    ? 'bg-yellow-500'
                    : currentUser.status === 'dnd'
                    ? 'bg-red-500'
                    : 'bg-gray-500'
                }`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">
                {currentUser.name}
              </div>
              <div className="text-xs text-discord-text-muted">
                #{currentUser.id.slice(0, 4)}
              </div>
            </div>
            <div className="flex items-center space-x-2 text-discord-text-muted">
              <button className="hover:text-discord-text">
                <i className="fas fa-microphone" />
              </button>
              <button className="hover:text-discord-text">
                <i className="fas fa-headphones" />
              </button>
              <button className="hover:text-discord-text">
                <i className="fas fa-cog" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}; 