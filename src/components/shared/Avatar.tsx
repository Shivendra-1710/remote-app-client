import { motion } from 'framer-motion';
import { UserStatus } from '../../types/user';

interface AvatarProps {
  src: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  status?: UserStatus;
  className?: string;
}

const sizes = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

const statusColors = {
  online: 'bg-green-500',
  offline: 'bg-gray-500',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
  'in-call': 'bg-purple-500',
  idle: 'bg-yellow-500',
  dnd: 'bg-red-500'
} as const;

export const Avatar = ({
  src,
  alt,
  size = 'md',
  status,
  className = '',
}: AvatarProps) => {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="relative inline-block"
    >
      <div
        className={`
          relative rounded-full overflow-hidden
          ${sizes[size]}
          ${className}
        `}
      >
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to initials if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.parentElement!.innerHTML = alt
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase();
            target.parentElement!.className += ' bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-medium';
          }}
        />
      </div>
      {status && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={`
            absolute bottom-0 right-0
            w-3 h-3 rounded-full border-2 border-white
            ${statusColors[status]}
          `}
        />
      )}
    </motion.div>
  );
}; 