import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LivesDisplayProps {
  lives: number;
  maxLives?: number;
}

export const LivesDisplay: React.FC<LivesDisplayProps> = ({
  lives,
  maxLives = 3,
}) => {
  return (
    <div className="flex gap-1 items-center" dir="ltr">
      {Array.from({ length: maxLives }).map((_, i) => {
        const isActive = i < lives;
        return (
          <AnimatePresence key={i} mode="wait">
            <motion.span
              key={`heart-${i}-${isActive}`}
              initial={{ scale: isActive ? 1 : 1.3 }}
              animate={{ scale: 1 }}
              transition={
                !isActive
                  ? { type: 'spring', stiffness: 500, damping: 10 }
                  : {}
              }
              className={`text-2xl select-none ${isActive ? '' : 'grayscale opacity-40'}`}
            >
              ❤️
            </motion.span>
          </AnimatePresence>
        );
      })}
    </div>
  );
};

export default LivesDisplay;
