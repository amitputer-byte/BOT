import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  padding?: 'sm' | 'md' | 'lg';
}

const paddingStyles = {
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-8',
};

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hover = false,
  onClick,
  padding = 'md',
}) => {
  const base = [
    'bg-white',
    'rounded-2xl',
    'border-3 border-dark-ink',
    'shadow-comic',
    paddingStyles[padding],
    onClick ? 'cursor-pointer' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (hover || onClick) {
    return (
      <motion.div
        className={base}
        onClick={onClick}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={onClick ? { scale: 0.98, x: 4, y: 4 } : {}}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {children}
      </motion.div>
    );
  }

  return <div className={base}>{children}</div>;
};

export default Card;
