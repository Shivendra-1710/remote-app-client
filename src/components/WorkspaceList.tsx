import { motion } from 'framer-motion';
import { User, UserStatus } from '../types/user';

interface Workspace {
  id: string;
  name: string;
  icon: string;
}

interface WorkspaceListProps {
  workspaces: Workspace[];
  selectedWorkspace: Workspace | null;
  onWorkspaceSelect: (workspace: Workspace) => void;
  currentUser: User | null;
  onStatusChange: (status: UserStatus) => void;
}

export const WorkspaceList: React.FC<WorkspaceListProps> = ({
  workspaces,
  selectedWorkspace,
  onWorkspaceSelect,
  currentUser,
  onStatusChange,
}) => {
  return (
    <div className="w-18 bg-discord-dark-secondary flex flex-col items-center py-3 space-y-2">
      {/* Home Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="w-12 h-12 rounded-full bg-discord-primary flex items-center justify-center text-white hover:bg-discord-accent transition-colors"
      >
        <i className="fas fa-home text-xl" />
      </motion.button>

      <div className="w-8 h-0.5 bg-discord-divider rounded-full mx-auto my-2" />

      {/* Workspace List */}
      <div className="space-y-2 overflow-y-auto flex-1 w-full px-3">
        {workspaces.map((workspace) => (
          <motion.button
            key={workspace.id}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onWorkspaceSelect(workspace)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl hover:rounded-xl transition-all duration-200 ${
              selectedWorkspace?.id === workspace.id
                ? 'bg-discord-accent text-white'
                : 'bg-discord-primary text-discord-text hover:bg-discord-accent'
            }`}
          >
            {workspace.icon}
          </motion.button>
        ))}

        {/* Add Server Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="w-12 h-12 rounded-full bg-discord-primary flex items-center justify-center text-discord-accent hover:bg-discord-accent hover:text-white transition-all"
        >
          <i className="fas fa-plus text-xl" />
        </motion.button>
      </div>

      {/* User Profile */}
      {currentUser && (
        <div className="w-full px-3">
          <div className="w-12 h-12 relative">
            <motion.button
              whileHover={{ scale: 1.1 }}
              className="w-full h-full rounded-full bg-discord-primary flex items-center justify-center overflow-hidden"
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-full h-full object-cover"
              />
            </motion.button>
            <div
              className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-discord-dark-secondary ${
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
        </div>
      )}
    </div>
  );
}; 