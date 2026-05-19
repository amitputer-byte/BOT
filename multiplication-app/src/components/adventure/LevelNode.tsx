import React from 'react';
import { motion } from 'framer-motion';
import type { LevelConfig } from '../../lib/adventure-map';

export type LevelStatus = 'locked' | 'current' | 'completed';

interface LevelNodeProps {
  levelConfig: LevelConfig;
  status: LevelStatus;
  stars: number; // 0-3
  onClick: () => void;
}

const worldColors: Record<number, string> = {
  1: 'bg-green-400 border-green-700',
  2: 'bg-blue-400 border-blue-700',
  3: 'bg-purple-400 border-purple-700',
  4: 'bg-orange-400 border-orange-700',
  5: 'bg-yellow-400 border-yellow-700',
};

const worldColorsCurrent: Record<number, string> = {
  1: 'bg-green-500 border-green-800',
  2: 'bg-blue-500 border-blue-800',
  3: 'bg-purple-500 border-purple-800',
  4: 'bg-orange-500 border-orange-800',
  5: 'bg-yellow-500 border-yellow-800',
};

export const LevelNode: React.FC<LevelNodeProps> = ({
  levelConfig,
  status,
  stars,
  onClick,
}) => {
  const isLocked = status === 'locked';
  const isCurrent = status === 'current';
  const isCompleted = status === 'completed';

  const colorClass = isCurrent
    ? worldColorsCurrent[levelConfig.worldId]
    : isCompleted
    ? worldColors[levelConfig.worldId]
    : 'bg-gray-200 border-gray-400';

  return (
    <div className="flex flex-col items-center gap-1">
      <motion.button
        onClick={isLocked ? undefined : onClick}
        disabled={isLocked}
        aria-label={`שלב ${levelConfig.id}: ${levelConfig.name}${isLocked ? ' - נעול' : ''}`}
        animate={
          isCurrent
            ? { scale: [1, 1.1, 1] }
            : {}
        }
        transition={
          isCurrent
            ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
            : {}
        }
        whileHover={isLocked ? {} : { scale: 1.1, y: -2 }}
        whileTap={isLocked ? {} : { scale: 0.92 }}
        className={[
          'relative flex items-center justify-center',
          'w-[60px] h-[60px] rounded-full',
          'border-3 font-fredoka font-bold text-white',
          'shadow-comic transition-all',
          isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
          colorClass,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* Lock overlay */}
        {isLocked && (
          <span className="text-2xl text-gray-500">🔒</span>
        )}

        {/* Completed: show level number */}
        {isCompleted && (
          <span className="text-xl font-bold text-dark-ink">{levelConfig.id}</span>
        )}

        {/* Current: show level number */}
        {isCurrent && (
          <span className="text-xl font-bold text-dark-ink">{levelConfig.id}</span>
        )}

        {/* Boss crown indicator */}
        {levelConfig.isBoss && !isLocked && (
          <span
            className="absolute -top-3 left-1/2 -translate-x-1/2 text-base leading-none"
            aria-label="שלב בוס"
          >
            👑
          </span>
        )}
      </motion.button>

      {/* Stars row under node */}
      <div className="flex gap-0.5">
        {[1, 2, 3].map((s) => (
          <span key={s} className={`text-xs ${s <= stars ? '' : 'opacity-20'}`}>
            ⭐
          </span>
        ))}
      </div>

      {/* Level name */}
      <span
        className={`text-xs font-fredoka text-center max-w-[70px] leading-tight ${
          isLocked ? 'text-gray-400' : 'text-dark-ink'
        }`}
      >
        {levelConfig.name}
      </span>
    </div>
  );
};

export default LevelNode;
