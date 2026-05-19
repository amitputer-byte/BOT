import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useProfileStore } from '../store/profileStore';
import { useProgressStore } from '../store/progressStore';
import { AvatarDisplay } from '../components/character/AvatarDisplay';
import { Card } from '../components/ui/Card';
import { BackgroundDecoration } from '../components/layout/BackgroundDecoration';
import { ProgressBar } from '../components/ui/ProgressBar';

// ─── Bottom Navigation ────────────────────────────────────────────────────────

const navItems = [
  { path: '/home',         label: 'בית',    icon: '🏠' },
  { path: '/practice',     label: 'תרגול',  icon: '✏️' },
  { path: '/adventure',    label: 'הרפתקה', icon: '🗡️' },
  { path: '/achievements', label: 'הישגים', icon: '🏆' },
  { path: '/settings',     label: 'הגדרות', icon: '⚙️' },
];

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 bg-white
                 flex items-center justify-around px-2 pb-safe"
      style={{ borderTop: '3px solid #2D2D44' }}
    >
      {navItems.map((item) => {
        const active = location.pathname === item.path;
        return (
          <motion.button
            key={item.path}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(item.path)}
            className={[
              'flex flex-col items-center justify-center py-2 px-3 min-w-[52px] min-h-[52px]',
              'font-fredoka text-xs rounded-xl cursor-pointer select-none',
              'transition-colors duration-150',
              active ? 'text-primary-dark bg-primary/20' : 'text-dark-ink/60',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className="text-2xl leading-tight">{item.icon}</span>
            <span className="leading-tight">{item.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
};

// ─── Animation variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const getActiveProfile = useProfileStore((s) => s.getActiveProfile);
  const getProgress = useProgressStore((s) => s.getProgress);

  const profile = getActiveProfile();

  if (!profile) {
    navigate('/profile');
    return null;
  }

  const progress = getProgress(profile.id);

  const accuracy =
    progress.totalAttempted > 0
      ? Math.round((progress.totalCorrect / progress.totalAttempted) * 100)
      : 0;

  const tablesLearned = Object.keys(progress.byTable).filter(
    (k) => (progress.byTable[Number(k)]?.attempted ?? 0) >= 5
  ).length;

  const achievementsCount = progress.achievements.length;

  const greetingEmoji =
    progress.totalAttempted === 0 ? '👋' : progress.dailyStreak >= 7 ? '🔥' : '😊';

  return (
    <div className="relative min-h-screen bg-bg overflow-hidden pb-20" dir="rtl">
      <BackgroundDecoration />

      <div className="relative z-10 max-w-md mx-auto px-4 py-6">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Avatar + profile name — tap to switch */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 bg-white/80 border-2 border-dark-ink/30
                       rounded-2xl px-3 py-1.5 cursor-pointer shadow-comic-sm"
            aria-label="החלף שחקן"
          >
            <AvatarDisplay id={profile.avatar} size={36} />
            <div className="text-right">
              <p className="font-fredoka font-bold text-dark-ink text-sm leading-tight">
                {profile.name}
              </p>
              <p className="font-fredoka text-dark-ink/50 text-xs leading-tight">
                החלף
              </p>
            </div>
          </motion.button>

          {/* Settings */}
          <motion.button
            whileHover={{ scale: 1.1, rotate: 20 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/settings')}
            className="text-2xl cursor-pointer"
            aria-label="הגדרות"
          >
            ⚙️
          </motion.button>
        </motion.div>

        {/* Greeting */}
        <motion.div
          className="text-center mb-6"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          {/* Big avatar */}
          <motion.div
            className="flex justify-center mb-3"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 20 }}
          >
            <div className="rounded-full border-4 border-dark-ink shadow-comic p-1 bg-white">
              <AvatarDisplay id={profile.avatar} size={90} />
            </div>
          </motion.div>

          <h1 className="text-3xl font-bold text-dark-ink font-fredoka">
            שלום, {profile.name}! {greetingEmoji}
          </h1>
          {progress.dailyStreak > 1 && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-secondary font-fredoka font-semibold mt-1"
            >
              🔥 רצף של {progress.dailyStreak} ימים!
            </motion.p>
          )}
        </motion.div>

        {/* Stats cards — REAL data */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-4 gap-2 mb-6"
        >
          <motion.div variants={itemVariants}>
            <Card padding="sm" className="text-center">
              <div className="text-2xl font-bold text-secondary font-fredoka">
                {progress.totalCorrect}
              </div>
              <div className="text-xs text-dark-ink/60 font-fredoka">נכונות</div>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card padding="sm" className="text-center">
              <div className="text-2xl font-bold text-accent font-fredoka">{accuracy}%</div>
              <div className="text-xs text-dark-ink/60 font-fredoka">דיוק</div>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card padding="sm" className="text-center">
              <div className="text-2xl font-bold text-primary-dark font-fredoka">
                {progress.dailyStreak}
              </div>
              <div className="text-xs text-dark-ink/60 font-fredoka">רצף</div>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card padding="sm" className="text-center">
              <div className="text-2xl font-bold text-dark-ink font-fredoka">
                {achievementsCount}
              </div>
              <div className="text-xs text-dark-ink/60 font-fredoka">הישגים</div>
            </Card>
          </motion.div>
        </motion.div>

        {/* Daily streak card */}
        {progress.dailyStreak > 0 && (
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="mb-5"
          >
            <Card padding="sm" className="flex items-center gap-3">
              <span className="text-3xl">🔥</span>
              <div className="flex-1">
                <p className="font-fredoka font-bold text-dark-ink text-sm">
                  רצף יומי — {progress.dailyStreak} ימים
                </p>
                <ProgressBar value={Math.min((progress.dailyStreak / 30) * 100, 100)} height="sm" />
              </div>
            </Card>
          </motion.div>
        )}

        {/* Overall progress bar */}
        {progress.totalAttempted > 0 && (
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="mb-6"
          >
            <Card padding="sm">
              <p className="text-sm font-fredoka text-dark-ink/70 mb-2">
                התקדמות כוללת ({tablesLearned}/9 לוחות)
              </p>
              <ProgressBar value={(tablesLearned / 9) * 100} height="md" />
            </Card>
          </motion.div>
        )}

        {/* Main mode buttons */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 gap-4"
        >
          {/* Practice */}
          <motion.div variants={itemVariants}>
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97, y: 4 }}
              onClick={() => navigate('/practice')}
              className="w-full bg-primary border-3 border-dark-ink rounded-2xl shadow-comic-lg p-5
                         text-right font-fredoka cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <span className="text-5xl">✏️</span>
                <div>
                  <h2 className="text-2xl font-bold text-dark-ink">תרגול חופשי</h2>
                  <p className="text-dark-ink/70 text-sm">תרגל לוחות כפל ספציפיים</p>
                </div>
              </div>
            </motion.button>
          </motion.div>

          {/* Adventure */}
          <motion.div variants={itemVariants}>
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97, y: 4 }}
              onClick={() => navigate('/adventure')}
              className="w-full bg-secondary border-3 border-dark-ink rounded-2xl shadow-comic-lg p-5
                         text-right font-fredoka cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <span className="text-5xl">🗡️</span>
                <div>
                  <h2 className="text-2xl font-bold text-white">הרפתקה</h2>
                  <p className="text-white/80 text-sm">
                    רמה {progress.adventureProgress.currentLevel + 1} מחכה לך!
                  </p>
                </div>
              </div>
            </motion.button>
          </motion.div>

          {/* Achievements */}
          <motion.div variants={itemVariants}>
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97, y: 4 }}
              onClick={() => navigate('/achievements')}
              className="w-full bg-accent border-3 border-dark-ink rounded-2xl shadow-comic-lg p-5
                         text-right font-fredoka cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <span className="text-5xl">🏆</span>
                <div>
                  <h2 className="text-2xl font-bold text-white">הישגים</h2>
                  <p className="text-white/80 text-sm">
                    {achievementsCount} הישגים נפתחו!
                  </p>
                </div>
              </div>
            </motion.button>
          </motion.div>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
};

export default HomeScreen;
