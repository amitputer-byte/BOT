import React from 'react';
import { motion } from 'framer-motion';

interface StatBarProps {
  table: number;
  correct: number;
  attempted: number;
  maxHeight?: number;
}

export const StatBar: React.FC<StatBarProps> = ({
  table,
  correct,
  attempted,
  maxHeight = 120,
}) => {
  const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;

  const barColor =
    attempted === 0
      ? '#D1D5DB'
      : accuracy >= 80
      ? '#6BCB77'  // green
      : accuracy >= 60
      ? '#FFD93D'  // yellow
      : '#FF8A8A'; // red

  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
      {/* Percentage label above bar */}
      <span className="text-xs font-bold font-fredoka text-dark-ink leading-none">
        {attempted > 0 ? `${accuracy}%` : '—'}
      </span>

      {/* Bar container */}
      <div
        className="w-full relative rounded-t-lg overflow-hidden bg-dark-ink/10 border border-dark-ink/20"
        style={{ height: maxHeight }}
      >
        <motion.div
          className="absolute bottom-0 left-0 right-0 rounded-t-lg"
          style={{ backgroundColor: barColor }}
          initial={{ height: 0 }}
          animate={{ height: attempted > 0 ? `${accuracy}%` : '3px' }}
          transition={{
            duration: 0.8,
            ease: 'easeOut',
            delay: 0.08 * (table - 2),
          }}
        />
      </div>

      {/* Table label */}
      <span className="text-xs font-bold font-fredoka text-dark-ink leading-none">
        ×{table}
      </span>

      {/* Attempt count */}
      <span className="text-xs font-fredoka text-dark-ink/50 leading-none">
        {attempted}
      </span>
    </div>
  );
};

export default StatBar;
