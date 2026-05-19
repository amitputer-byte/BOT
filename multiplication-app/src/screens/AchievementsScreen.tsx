import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useProfileStore } from '../store/profileStore';
import { useProgressStore } from '../store/progressStore';
import { ACHIEVEMENTS } from '../lib/achievements';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { MascotCharacter } from '../components/character/MascotCharacter';
import { BackgroundDecoration } from '../components/layout/BackgroundDecoration';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export const AchievementsScreen: React.FC = () => {
  const navigate = useNavigate();
  const getActiveProfile = useProfileStore((s) => s.getActiveProfile);
  const getProgress = useProgressStore((s) => s.getProgress);

  const profile = getActiveProfile();

  if (!profile) {
    navigate('/');
    return null;
  }

  const progress = getProgress(profile.id);
  const unlockedIds = new Set(progress.achievements);
  const unlockedCount = unlockedIds.size;
  const totalCount = ACHIEVEMENTS.length;

  const unlocked = ACHIEVEMENTS.filter((a) => unlockedIds.has(a.id));
  const locked = ACHIEVEMENTS.filter((a) => !unlockedIds.has(a.id));

  return (
    <div className="relative min-h-screen bg-bg overflow-hidden">
      <BackgroundDecoration />

      <div className="relative z-10 max-w-md mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/home')}
            className="text-sm py-1 px-3 min-h-[36px]"
          >
            ← חזרה
          </Button>
          <h1 className="text-2xl font-bold text-dark-ink font-fredoka">🏆 הישגים</h1>
          <div className="w-16" />
        </div>

        {/* Stats summary */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5"
        >
          <Card padding="md" className="flex items-center gap-4">
            <MascotCharacter
              state={unlockedCount === totalCount ? 'excited' : unlockedCount > 5 ? 'happy' : 'idle'}
              size={70}
            />
            <div className="flex-1">
              <h2 className="text-xl font-bold text-dark-ink font-fredoka">
                {unlockedCount}/{totalCount} הישגים
              </h2>
              <p className="text-dark-ink/60 font-fredoka text-sm">
                {unlockedCount === totalCount
                  ? 'אספת את כולם! 🎉'
                  : `עוד ${totalCount - unlockedCount} נותרו`}
              </p>
              {/* Progress bar */}
              <div className="mt-2 w-full bg-white border-2 border-dark-ink/20 rounded-full h-3 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-l from-secondary to-success rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(unlockedCount / totalCount) * 100}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Unlocked achievements */}
        {unlocked.length > 0 && (
          <>
            <h2 className="text-lg font-bold text-dark-ink font-fredoka mb-3">
              ✅ הישגים שנפתחו:
            </h2>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 gap-3 mb-6"
            >
              {unlocked.map((achievement) => (
                <motion.div key={achievement.id} variants={itemVariants}>
                  <Card padding="sm" className="flex items-center gap-3 bg-primary/10">
                    <span className="text-4xl">{achievement.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-bold font-fredoka text-dark-ink text-lg leading-tight">
                        {achievement.title}
                      </h3>
                      <p className="text-dark-ink/60 font-fredoka text-sm leading-tight">
                        {achievement.description}
                      </p>
                    </div>
                    <span className="text-success text-2xl">✓</span>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </>
        )}

        {/* Locked achievements */}
        {locked.length > 0 && (
          <>
            <h2 className="text-lg font-bold text-dark-ink font-fredoka mb-3">
              🔒 הישגים נעולים:
            </h2>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 gap-3"
            >
              {locked.map((achievement) => (
                <motion.div key={achievement.id} variants={itemVariants}>
                  <Card padding="sm" className="flex items-center gap-3 opacity-60">
                    <span className="text-4xl grayscale">
                      {achievement.icon}
                    </span>
                    <div className="flex-1">
                      <h3 className="font-bold font-fredoka text-dark-ink text-lg leading-tight">
                        {achievement.title}
                      </h3>
                      <p className="text-dark-ink/60 font-fredoka text-sm leading-tight">
                        {achievement.description}
                      </p>
                    </div>
                    <span className="text-dark-ink/30 text-2xl">🔒</span>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </>
        )}

        <div className="h-8" />
      </div>
    </div>
  );
};

export default AchievementsScreen;
