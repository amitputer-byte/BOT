import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useProfileStore } from '../store/profileStore';
import { useProgressStore } from '../store/progressStore';
import { Card } from '../components/ui/Card';
import { MascotCharacter } from '../components/character/MascotCharacter';
import { BackgroundDecoration } from '../components/layout/BackgroundDecoration';
import { ProgressBar } from '../components/ui/ProgressBar';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const getActiveProfile = useProfileStore((s) => s.getActiveProfile);
  const getProgress = useProgressStore((s) => s.getProgress);

  const profile = getActiveProfile();

  if (!profile) {
    navigate('/');
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

  const greetingEmoji =
    progress.totalAttempted === 0
      ? '👋'
      : progress.dailyStreak >= 7
      ? '🔥'
      : '😊';

  return (
    <div className="relative min-h-screen bg-bg overflow-hidden">
      <BackgroundDecoration />

      <div className="relative z-10 max-w-md mx-auto px-4 py-6">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            onClick={() => navigate('/')}
            className="text-dark-ink/60 hover:text-dark-ink font-fredoka text-sm border-2 border-dark-ink/30 rounded-xl px-3 py-1 bg-white/80"
          >
            החלף שחקן
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="text-2xl"
            aria-label="הגדרות"
          >
            ⚙️
          </button>
        </motion.div>

        {/* Welcome section */}
        <motion.div
          className="text-center mb-6"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <MascotCharacter
            state={progress.totalAttempted === 0 ? 'excited' : 'happy'}
            size={90}
            showSpeech
            className="mb-3"
          />
          <h1 className="text-3xl font-bold text-dark-ink font-fredoka">
            שלום, {profile.name}! {greetingEmoji}
          </h1>
          {progress.dailyStreak > 1 && (
            <p className="text-secondary font-fredoka font-semibold mt-1">
              🔥 רצף של {progress.dailyStreak} ימים!
            </p>
          )}
        </motion.div>

        {/* Stats cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-3 gap-3 mb-6"
        >
          <motion.div variants={itemVariants}>
            <Card padding="sm" className="text-center">
              <div className="text-3xl font-bold text-secondary font-fredoka">
                {progress.totalCorrect}
              </div>
              <div className="text-xs text-dark-ink/60 font-fredoka">נכונות</div>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card padding="sm" className="text-center">
              <div className="text-3xl font-bold text-accent font-fredoka">
                {accuracy}%
              </div>
              <div className="text-xs text-dark-ink/60 font-fredoka">דיוק</div>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card padding="sm" className="text-center">
              <div className="text-3xl font-bold text-primary-dark font-fredoka">
                {tablesLearned}
              </div>
              <div className="text-xs text-dark-ink/60 font-fredoka">לוחות</div>
            </Card>
          </motion.div>
        </motion.div>

        {/* Progress bar */}
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

        {/* Main menu */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 gap-4"
        >
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
                  <h2 className="text-2xl font-bold text-dark-ink">תרגול</h2>
                  <p className="text-dark-ink/70 text-sm">תרגל לוחות כפל ספציפיים</p>
                </div>
              </div>
            </motion.button>
          </motion.div>

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
                    {progress.achievements.length} הישגים נפתחו!
                  </p>
                </div>
              </div>
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default HomeScreen;
