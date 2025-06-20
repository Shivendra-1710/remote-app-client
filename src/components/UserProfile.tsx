import { motion } from 'framer-motion';
import { User } from '../types/user';

interface UserProfileProps {
  user: User;
  onClose: () => void;
  onProfileUpdate: (updatedProfile: Partial<User>) => Promise<void>;
}

export const UserProfile: React.FC<UserProfileProps> = ({ user, onClose, onProfileUpdate }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-discord-dark-primary rounded-lg shadow-xl w-full max-w-md overflow-hidden"
      >
        {/* Banner */}
        <div className="h-24 bg-discord-accent" />

        {/* Profile Content */}
        <div className="relative px-4 pb-4">
          {/* Avatar */}
          <div className="absolute -top-10 left-4">
            <div className="w-20 h-20 rounded-full border-8 border-discord-dark-primary relative">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-full h-full rounded-full object-cover"
              />
              <div
                className={`absolute bottom-0 right-0 w-5 h-5 rounded-full border-4 border-discord-dark-primary ${
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
          </div>

          {/* User Info */}
          <div className="mt-12">
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-semibold text-white">{user.name}</h2>
              {user.role === 'admin' && (
                <span className="px-2 py-0.5 bg-discord-accent text-white text-xs rounded">
                  ADMIN
                </span>
              )}
            </div>
            <div className="text-sm text-discord-text-muted">#{user.id.slice(0, 4)}</div>

            {/* Status */}
            {user.customStatus && (
              <div className="mt-4 p-3 bg-discord-dark-secondary rounded-lg">
                <div className="text-discord-text">{user.customStatus}</div>
              </div>
            )}

            {/* Activity */}
            {user.activity && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold text-discord-text-muted uppercase tracking-wide">
                  CURRENTLY DOING
                </h3>
                <div className="mt-2 p-3 bg-discord-dark-secondary rounded-lg">
                  <div className="text-discord-text">{user.activity}</div>
                </div>
              </div>
            )}

            {/* Additional Info */}
            {(user.department || user.title || user.location) && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold text-discord-text-muted uppercase tracking-wide">
                  DETAILS
                </h3>
                <div className="mt-2 space-y-2">
                  {user.department && (
                    <div className="text-discord-text">
                      <span className="text-discord-text-muted">Department:</span> {user.department}
                    </div>
                  )}
                  {user.title && (
                    <div className="text-discord-text">
                      <span className="text-discord-text-muted">Title:</span> {user.title}
                    </div>
                  )}
                  {user.location && (
                    <div className="text-discord-text">
                      <span className="text-discord-text-muted">Location:</span> {user.location}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex space-x-2">
              <button 
                className="flex-1 px-4 py-2 bg-discord-accent text-white rounded-md hover:bg-discord-accent-hover transition-colors"
                onClick={() => onProfileUpdate({ status: 'online' })}
              >
                Message
              </button>
              {user.role !== 'admin' && (
                <button className="px-4 py-2 bg-discord-dark-secondary text-discord-text hover:bg-discord-hover rounded-md transition-colors">
                  <i className="fas fa-desktop" />
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}; 