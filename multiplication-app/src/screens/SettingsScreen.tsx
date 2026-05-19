import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSettingsStore } from '../store/settingsStore';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { MascotCharacter } from '../components/character/MascotCharacter';
import { BackgroundDecoration } from '../components/layout/BackgroundDecoration';

const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: () => void;
  label: string;
  emoji: string;
}> = ({ checked, onChange, label, emoji }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <span className="text-2xl">{emoji}</span>
      <span className="font-fredoka font-semibold text-dark-ink text-lg">{label}</span>
    </div>
    <motion.button
      onClick={onChange}
      className={[
        'relative w-14 h-7 rounded-full border-3 border-dark-ink transition-colors',
        checked ? 'bg-success' : 'bg-gray-200',
      ].join(' ')}
      aria-label={label}
    >
      <motion.div
        className="absolute top-0.5 w-5 h-5 bg-white rounded-full border-2 border-dark-ink shadow-sm"
        animate={{ x: checked ? 28 : 2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      />
    </motion.button>
  </div>
);

const DifficultyButton: React.FC<{
  value: 'easy' | 'medium' | 'hard';
  current: 'easy' | 'medium' | 'hard';
  label: string;
  emoji: string;
  onClick: () => void;
}> = ({ value, current, label, emoji, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={[
      'flex-1 flex flex-col items-center py-3 rounded-xl border-3 border-dark-ink',
      'font-fredoka font-semibold transition-all',
      current === value
        ? 'bg-secondary text-white shadow-comic'
        : 'bg-white text-dark-ink hover:bg-secondary/10',
    ].join(' ')}
  >
    <span className="text-2xl mb-1">{emoji}</span>
    <span className="text-sm">{label}</span>
  </motion.button>
);

export const SettingsScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    soundEnabled,
    musicEnabled,
    volume,
    difficulty,
    toggleSound,
    toggleMusic,
    setVolume,
    setDifficulty,
  } = useSettingsStore();

  return (
    <div className="relative min-h-screen bg-bg overflow-hidden">
      <BackgroundDecoration />

      <div className="relative z-10 max-w-md mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/home')}
            className="text-sm py-1 px-3 min-h-[36px]"
          >
            ← חזרה
          </Button>
          <h1 className="text-2xl font-bold text-dark-ink font-fredoka">⚙️ הגדרות</h1>
          <div className="w-16" />
        </div>

        {/* Mascot */}
        <div className="flex justify-center mb-6">
          <MascotCharacter state="idle" size={90} showSpeech speechText="בואו נגדיר הכל!" />
        </div>

        {/* Sound Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4"
        >
          <Card padding="md">
            <h2 className="text-xl font-bold text-dark-ink font-fredoka mb-4">🔊 צלילים</h2>

            <div className="space-y-4">
              <ToggleSwitch
                checked={soundEnabled}
                onChange={toggleSound}
                label="אפקטים קוליים"
                emoji="🔔"
              />
              <ToggleSwitch
                checked={musicEnabled}
                onChange={toggleMusic}
                label="מוזיקה"
                emoji="🎵"
              />

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🔉</span>
                  <span className="font-fredoka font-semibold text-dark-ink text-lg">
                    עוצמת שמע: {Math.round(volume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full accent-secondary h-3 rounded-full"
                  dir="ltr"
                />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Difficulty Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-4"
        >
          <Card padding="md">
            <h2 className="text-xl font-bold text-dark-ink font-fredoka mb-4">
              🎯 רמת קושי
            </h2>
            <div className="flex gap-3">
              <DifficultyButton
                value="easy"
                current={difficulty}
                label="קל"
                emoji="🌱"
                onClick={() => setDifficulty('easy')}
              />
              <DifficultyButton
                value="medium"
                current={difficulty}
                label="בינוני"
                emoji="⚡"
                onClick={() => setDifficulty('medium')}
              />
              <DifficultyButton
                value="hard"
                current={difficulty}
                label="קשה"
                emoji="🔥"
                onClick={() => setDifficulty('hard')}
              />
            </div>

            <div className="mt-3 p-3 bg-bg rounded-xl border-2 border-dark-ink/10">
              <p className="font-fredoka text-dark-ink/70 text-sm text-center">
                {difficulty === 'easy'
                  ? '🌱 מספרים קטנים (1-5), תשובות ברורות'
                  : difficulty === 'medium'
                  ? '⚡ מספרים עד 7, מסיחים חכמים'
                  : '🔥 כל המספרים עד 10, אתגר אמיתי!'}
              </p>
            </div>
          </Card>
        </motion.div>

        {/* About */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card padding="md" className="text-center">
            <p className="font-fredoka text-2xl font-bold text-dark-ink mb-1">כפלי 🦊</p>
            <p className="font-fredoka text-dark-ink/60 text-sm">
              אפליקציית לוח הכפל לילדים
            </p>
            <p className="font-fredoka text-dark-ink/40 text-xs mt-2">
              גרסה 1.0.0 — לומדים כפל בכיף!
            </p>
          </Card>
        </motion.div>

        <div className="h-8" />
      </div>
    </div>
  );
};

export default SettingsScreen;
