import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProgressStore } from '../../store/progressStore';
import { ACHIEVEMENTS } from '../../lib/achievements';

interface ToastItem {
  id: string;
  title: string;
  icon: string;
}

export const AchievementToast: React.FC = () => {
  const newAchievements = useProgressStore((s) => s.newAchievements);
  const clearNewAchievements = useProgressStore((s) => s.clearNewAchievements);

  const [queue, setQueue] = useState<ToastItem[]>([]);
  const [current, setCurrent] = useState<ToastItem | null>(null);
  const [visible, setVisible] = useState(false);

  // Drain new achievements from store into local queue
  useEffect(() => {
    if (newAchievements.length === 0) return;

    const items: ToastItem[] = newAchievements
      .map((id) => {
        const def = ACHIEVEMENTS.find((a) => a.id === id);
        if (!def) return null;
        return { id, title: def.title, icon: def.icon };
      })
      .filter(Boolean) as ToastItem[];

    setQueue((q) => [...q, ...items]);
    clearNewAchievements();
  }, [newAchievements, clearNewAchievements]);

  // Show toasts one at a time from queue
  const showNext = useCallback(() => {
    setQueue((q) => {
      if (q.length === 0) return q;
      const [first, ...rest] = q;
      setCurrent(first);
      setVisible(true);
      return rest;
    });
  }, []);

  // When a toast becomes invisible, check queue for next
  useEffect(() => {
    if (!visible && queue.length > 0) {
      // small gap between toasts
      const timer = setTimeout(showNext, 300);
      return () => clearTimeout(timer);
    }
  }, [visible, queue.length, showNext]);

  // Start first toast when queue gains items
  useEffect(() => {
    if (queue.length > 0 && !visible && !current) {
      showNext();
    }
  }, [queue.length, visible, current, showNext]);

  // Auto-dismiss after 3s
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      setVisible(false);
      setCurrent(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [visible, current]);

  if (!current) return null;

  return (
    <div
      className="fixed top-4 left-0 right-0 z-[9998] flex justify-center pointer-events-none px-4"
      dir="rtl"
    >
      <AnimatePresence>
        {visible && (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: -60, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            className="pointer-events-auto"
          >
            <div
              className="flex items-center gap-3 bg-primary border-3 border-dark-ink
                         rounded-2xl shadow-comic px-5 py-3 max-w-xs"
            >
              <span className="text-3xl leading-none">{current.icon}</span>
              <div className="text-right">
                <p className="font-fredoka font-bold text-dark-ink text-sm leading-tight">
                  הישג חדש! 🏆
                </p>
                <p className="font-fredoka font-semibold text-dark-ink/80 text-base leading-tight">
                  {current.title}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AchievementToast;
