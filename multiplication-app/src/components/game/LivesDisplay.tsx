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
              initial={!isActive ? { scale: 1.4 } : { scale: 1 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={
                !isActive
                  ? { type: 'spring', stiffness: 500, damping: 10 }
                  : { duration: 0.2 }
              }
              className={`text-2xl select-none leading-none ${isActive ? '' : 'grayscale opacity-35'}`}
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
