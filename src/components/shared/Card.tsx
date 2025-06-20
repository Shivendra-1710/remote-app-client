import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  isInteractive?: boolean;
}

export const Card = ({
  children,
  className = '',
  onClick,
  isInteractive = false,
}: CardProps) => {
  const baseClasses = `
    bg-white rounded-xl shadow-soft overflow-hidden
    ${isInteractive ? 'cursor-pointer hover:shadow-glow transition-shadow duration-300' : ''}
    ${className}
  `;

  if (isInteractive) {
    return (
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={onClick}
        className={baseClasses}
      >
        {children}
      </motion.div>
    );
  }

  return <div className={baseClasses}>{children}</div>;
};

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export const CardHeader = ({ children, className = '' }: CardHeaderProps) => (
  <div className={`p-4 border-b border-gray-200 ${className}`}>{children}</div>
);

interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

export const CardBody = ({ children, className = '' }: CardBodyProps) => (
  <div className={`p-4 ${className}`}>{children}</div>
);

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export const CardFooter = ({ children, className = '' }: CardFooterProps) => (
  <div className={`p-4 border-t border-gray-200 ${className}`}>{children}</div>
); 