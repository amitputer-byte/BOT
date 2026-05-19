import React from 'react';
import { motion } from 'framer-motion';

interface ProgressBarProps {
  value: number; // 0 to 100
  className?: string;
  label?: string;
  showPercent?: boolean;
  height?: 'sm' | 'md' | 'lg';
  color?: 'default' | 'success' | 'accent';
}

const heightStyles = {
  sm: 'h-3',
  md: 'h-5',
  lg: 'h-7',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  className = '',
  label,
  showPercent = false,
  height = 'md',
  color = 'default',
}) => {
  const clampedValue = Math.max(0, Math.min(100, value));

  const gradientClass =
    color === 'success'
      ? 'from-success to-secondary'
      : color === 'accent'
      ? 'from-accent to-primary'
      : 'from-secondary to-success';

  return (
    <div className={`w-full ${className}`}>
      {(label || showPercent) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-sm font-semibold text-dark-ink font-fredoka">{label}</span>}
          {showPercent && (
            <span className="text-sm font-bold text-dark-ink font-fredoka">{Math.round(clampedValue)}%</span>
          )}
        </div>
      )}

      <div
        className={[
          'w-full rounded-full',
          'bg-white border-3 border-dark-ink',
          'overflow-hidden',
          'shadow-comic-sm',
          heightStyles[height],
        ].join(' ')}
      >
        <motion.div
          className={`h-full rounded-full bg-gradient-to-l ${gradientClass}`}
          initial={{ width: 0 }}
          animate={{ width: `${clampedValue}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
