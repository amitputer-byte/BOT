import React, { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSound } from '../../hooks/useSound';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'success';

interface RippleItem {
  id: number;
  x: number;
  y: number;
}

interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
  type?: 'button' | 'submit' | 'reset';
  fullWidth?: boolean;
  /** Set to false to suppress auto click sound (e.g. answer buttons that play their own sound) */
  playSound?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:   'bg-primary hover:bg-primary-dark text-dark-ink border-dark-ink',
  secondary: 'bg-secondary hover:bg-teal-500 text-white border-dark-ink',
  ghost:     'bg-white hover:bg-gray-50 text-dark-ink border-dark-ink',
  accent:    'bg-accent hover:bg-pink-500 text-white border-dark-ink',
  success:   'bg-success hover:bg-green-500 text-white border-dark-ink',
};

let rippleCounter = 0;

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  onClick,
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
  type = 'button',
  fullWidth = false,
  playSound: shouldPlaySound = true,
}) => {
  const { playClick } = useSound();
  const [ripples, setRipples] = useState<RippleItem[]>([]);
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;

      // Play click sound
      if (shouldPlaySound) {
        playClick();
      }

      // Ripple effect
      const rect = btnRef.current?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const id = ++rippleCounter;
        setRipples((prev) => [...prev, { id, x, y }]);
        setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.id !== id));
        }, 550);
      }

      onClick?.();
    },
    [disabled, shouldPlaySound, playClick, onClick]
  );

  return (
    <motion.button
      ref={btnRef as React.RefObject<HTMLButtonElement>}
      type={type}
      onClick={handleClick}
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
        'relative overflow-hidden',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-ink focus-visible:ring-offset-1',
        variantStyles[variant],
        disabled ? 'opacity-50 cursor-not-allowed' : '',
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}

      {/* Ripple overlays */}
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            initial={{ width: 0, height: 0, opacity: 0.4 }}
            animate={{ width: 280, height: 280, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="absolute rounded-full bg-white pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}
      </AnimatePresence>
    </motion.button>
  );
};

export default Button;
