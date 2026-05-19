import React from 'react';
import { motion } from 'framer-motion';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'success';

interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
  type?: 'button' | 'submit' | 'reset';
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-primary hover:bg-primary-dark text-dark-ink border-dark-ink',
  secondary: 'bg-secondary hover:bg-teal-500 text-white border-dark-ink',
  ghost: 'bg-white hover:bg-gray-50 text-dark-ink border-dark-ink',
  accent: 'bg-accent hover:bg-pink-500 text-white border-dark-ink',
  success: 'bg-success hover:bg-green-500 text-white border-dark-ink',
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  onClick,
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
  type = 'button',
  fullWidth = false,
}) => {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      whileHover={disabled ? {} : { scale: 1.05 }}
      whileTap={disabled ? {} : { scale: 0.95, x: 4, y: 4 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={[
        'inline-flex items-center justify-center',
        'min-h-[44px] px-6 py-2',
        'font-fredoka font-semibold text-lg',
        'rounded-2xl border-3',
        'shadow-comic',
        'cursor-pointer select-none',
        'transition-colors duration-150',
        variantStyles[variant],
        disabled ? 'opacity-50 cursor-not-allowed' : '',
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </motion.button>
  );
};

export default Button;
