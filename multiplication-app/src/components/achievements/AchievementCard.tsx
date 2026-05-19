import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Achievement } from '../../lib/achievements';

interface AchievementCardProps {
  achievement: Achievement;
  isUnlocked: boolean;
  unlockedAt?: string;
  isNew?: boolean;
}

export const AchievementCard: React.FC<AchievementCardProps> = ({
  achievement,
  isUnlocked,
  unlockedAt,
  isNew = false,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <motion.div
      className="relative"
      initial={isNew ? { scale: 0 } : { opacity: 0, y: 16 }}
      animate={isNew ? { scale: [0, 1.2, 1] } : { opacity: 1, y: 0 }}
      transition={
        isNew
          ? { type: 'spring', stiffness: 260, damping: 20 }
          : { type: 'tween', duration: 0.3 }
      }
      onHoverStart={() => setShowTooltip(true)}
      onHoverEnd={() => setShowTooltip(false)}
      onClick={() => setShowTooltip((v) => !v)}
    >
      <div
        className={[
          'relative rounded-2xl border-3 p-3 flex items-center gap-3',
          isUnlocked
            ? 'bg-white border-yellow-400 shadow-[0_0_14px_3px_rgba(255,215,0,0.5)]'
            : 'bg-white/50 border-dark-ink/20 opacity-60',
        ].join(' ')}
      >
        {/* Icon */}
        <div
          className={[
            'text-5xl flex-shrink-0 w-14 h-14 flex items-center justify-center rounded-xl',
            isUnlocked ? '' : 'grayscale opacity-50',
          ].join(' ')}
          style={{ fontSize: 48 }}
        >
          {achievement.icon}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <h3
            className={[
              'font-bold font-fredoka text-base leading-tight',
              isUnlocked ? 'text-dark-ink' : 'text-dark-ink/40',
            ].join(' ')}
          >
            {achievement.title}
          </h3>
          <p
            className={[
              'font-fredoka text-sm leading-tight mt-0.5',
              isUnlocked ? 'text-dark-ink/70' : 'text-dark-ink/30',
            ].join(' ')}
          >
            {achievement.description}
          </p>
          {isUnlocked && unlockedAt && (
            <p className="text-xs text-yellow-600 font-fredoka mt-1">
              הושג: {unlockedAt}
            </p>
          )}
        </div>

        {/* Status badge */}
        {isUnlocked ? (
          <span className="flex-shrink-0 bg-yellow-400 text-dark-ink text-xs font-bold font-fredoka px-2 py-1 rounded-lg border-2 border-dark-ink whitespace-nowrap">
            ✓ הושג!
          </span>
        ) : (
          <span className="flex-shrink-0 text-2xl opacity-30">🔒</span>
        )}

        {/* Lock overlay for locked */}
        {!isUnlocked && (
          <div className="absolute inset-0 rounded-2xl bg-dark-ink/5 pointer-events-none" />
        )}
      </div>

      {/* Tooltip — shown on hover/tap for locked */}
      <AnimatePresence>
        {showTooltip && !isUnlocked && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full mb-2 right-0 left-0 z-20 bg-dark-ink text-white text-sm font-fredoka rounded-xl px-3 py-2 shadow-lg text-center"
          >
            {achievement.description}
            <div className="absolute top-full right-6 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-dark-ink" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AchievementCard;
