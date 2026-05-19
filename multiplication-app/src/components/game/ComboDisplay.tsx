import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ComboDisplayProps {
  combo: number;
}

export const ComboDisplay: React.FC<ComboDisplayProps> = ({ combo }) => {
  const visible = combo >= 3;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={combo}
          initial={{ scale: 0, opacity: 0, y: 10 }}
          animate={{ scale: [1, 1.15, 1], opacity: 1, y: 0 }}
          exit={{ scale: 0, opacity: 0, y: -10 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          className="flex items-center justify-center gap-1 font-fredoka font-bold text-lg text-accent"
        >
          <span>🔥</span>
          <span>{combo} ברצף!</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ComboDisplay;
