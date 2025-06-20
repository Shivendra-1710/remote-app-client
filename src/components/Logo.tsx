import { motion } from 'framer-motion';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true, className = '' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  return (
    <motion.div 
      className={`flex items-center space-x-2 ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className={`${sizeClasses[size]} relative`}>
        <motion.div
          className="absolute inset-0 bg-discord-accent rounded-lg"
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-2 bg-discord-dark rounded-md flex items-center justify-center"
          whileHover={{ scale: 1.05 }}
        >
          <i className="fas fa-desktop text-discord-accent" style={{ fontSize: size === 'sm' ? '0.75rem' : size === 'md' ? '1rem' : '1.5rem' }} />
        </motion.div>
      </div>
      {showText && (
        <motion.h1 
          className={`font-bold text-white ${textSizeClasses[size]}`}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          Remotely
        </motion.h1>
      )}
    </motion.div>
  );
}; 