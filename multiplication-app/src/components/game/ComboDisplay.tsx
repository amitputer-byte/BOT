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
          initial={{ scale: 0, opacity: 0, y: 12 }}
          animate={{
            scale: [0, 1.3, 0.95, 1.08, 1],
            opacity: 1,
            y: 0,
          }}
          exit={{ scale: 0, opacity: 0, y: -8 }}
          transition={{ type: 'spring', stiffness: 450, damping: 14 }}
          className="flex items-center justify-center gap-1 font-fredoka font-bold text-lg text-accent"
        >
          <motion.span
            animate={{ rotate: [0, -15, 15, -10, 10, 0] }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            🔥
          </motion.span>
          <span>{combo} ברצף!</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ComboDisplay;
