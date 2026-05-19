import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onDone: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onDone }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Hard 0.8s timeout — doesn't block on slow networks
    const timer = setTimeout(() => {
      setVisible(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Notify parent after exit animation completes
  const handleAnimationComplete = () => {
    if (!visible) {
      onDone();
    }
  };

  return (
    <AnimatePresence onExitComplete={onDone}>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          onAnimationComplete={handleAnimationComplete}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{ backgroundColor: '#FFD93D' }}
          dir="rtl"
        >
          {/* Fox mascot logo */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 280, damping: 20, delay: 0.05 }}
            style={{ width: 110, height: 132 }}
          >
            <SplashFox />
          </motion.div>

          {/* App name */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.4 }}
            className="font-fredoka font-bold text-4xl text-dark-ink mt-4"
          >
            כפלי 🦊
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32, duration: 0.4 }}
            className="font-fredoka text-lg text-dark-ink/70 mt-2"
          >
            לומדים כפל בדרך הכיפית!
          </motion.p>

          {/* Bouncing dots */}
          <div className="flex gap-2 mt-8">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-dark-ink/40"
                animate={{ y: [0, -8, 0] }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: i * 0.15,
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Inline simple fox SVG for splash
const SplashFox: React.FC = () => (
  <svg viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <polygon points="15,55 25,15 45,50" fill="#FF8C42" stroke="#2D2D44" strokeWidth="2.5" strokeLinejoin="round" />
    <polygon points="75,50 95,15 105,55" fill="#FF8C42" stroke="#2D2D44" strokeWidth="2.5" strokeLinejoin="round" />
    <polygon points="22,50 30,24 40,48" fill="#FFB8A0" />
    <polygon points="80,48 90,24 98,50" fill="#FFB8A0" />
    <ellipse cx="60" cy="78" rx="45" ry="42" fill="#FF8C42" stroke="#2D2D44" strokeWidth="2.5" />
    <ellipse cx="60" cy="90" rx="28" ry="22" fill="#FFF0E0" stroke="#2D2D44" strokeWidth="1.5" />
    <circle cx="46" cy="72" r="6" fill="white" stroke="#2D2D44" strokeWidth="2" />
    <circle cx="74" cy="72" r="6" fill="white" stroke="#2D2D44" strokeWidth="2" />
    <circle cx="47" cy="73" r="3.5" fill="#2D2D44" />
    <circle cx="75" cy="73" r="3.5" fill="#2D2D44" />
    <circle cx="48" cy="70" r="1" fill="white" />
    <circle cx="76" cy="70" r="1" fill="white" />
    <ellipse cx="60" cy="82" rx="5" ry="3.5" fill="#2D2D44" />
    <path d="M47 90 Q60 102 73 90" stroke="#2D2D44" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <ellipse cx="36" cy="82" rx="7" ry="4" fill="#FF6B9D" opacity="0.5" />
    <ellipse cx="84" cy="82" rx="7" ry="4" fill="#FF6B9D" opacity="0.5" />
    <ellipse cx="60" cy="125" rx="30" ry="20" fill="#FF8C42" stroke="#2D2D44" strokeWidth="2.5" />
    <ellipse cx="60" cy="130" rx="18" ry="12" fill="#FFF0E0" stroke="#2D2D44" strokeWidth="1.5" />
  </svg>
);

export default SplashScreen;
