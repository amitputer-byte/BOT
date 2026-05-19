import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfileStore } from '../store/profileStore';
import { useProgressStore } from '../store/progressStore';
import { useSettingsStore } from '../store/settingsStore';
import { generateQuestion } from '../lib/questions';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { MascotCharacter, type MascotState } from '../components/character/MascotCharacter';
import { BackgroundDecoration } from '../components/layout/BackgroundDecoration';
import { ProgressBar } from '../components/ui/ProgressBar';
import { useSound } from '../hooks/useSound';
import type { Question } from '../types';

// Adventure levels config: each level has a table and number of questions
const LEVELS = [
  { level: 1, table: 2, questions: 5, name: 'יער הכפל', emoji: '🌲' },
  { level: 2, table: 3, questions: 6, name: 'מערת 3', emoji: '🦇' },
  { level: 3, table: 4, questions: 6, name: 'הר 4', emoji: '⛰️' },
  { level: 4, table: 5, questions: 7, name: 'אי 5', emoji: '🏝️' },
  { level: 5, table: 2, questions: 8, name: 'ארמון הכפל', emoji: '🏰', mixed: true },
  { level: 6, table: 6, questions: 7, name: 'ספינת 6', emoji: '⛵' },
  { level: 7, table: 7, questions: 8, name: 'כוכב 7', emoji: '⭐' },
  { level: 8, table: 8, questions: 8, name: 'מבצר 8', emoji: '🏯' },
  { level: 9, table: 9, questions: 9, name: 'ענן 9', emoji: '☁️' },
  { level: 10, table: 10, questions: 10, name: 'המקדש הגדול', emoji: '🏛️', mixed: true },
];

type Mode = 'map' | 'playing' | 'result';

export const AdventureScreen: React.FC = () => {
  const navigate = useNavigate();
  const getActiveProfile = useProfileStore((s) => s.getActiveProfile);
  const getProgress = useProgressStore((s) => s.getProgress);
  const recordAnswer = useProgressStore((s) => s.recordAnswer);
  const updateAdventureProgress = useProgressStore((s) => s.updateAdventureProgress);
  const difficulty = useSettingsStore((s) => s.difficulty);
  const { playCorrect, playWrong, playClick, playLevelUp } = useSound();

  const profile = getActiveProfile();

  const [mode, setMode] = useState<Mode>('map');
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [mascotState, setMascotState] = useState<MascotState>('idle');
  const [resultStars, setResultStars] = useState(0);

  if (!profile) {
    navigate('/');
    return null;
  }

  const progress = getProgress(profile.id);
  const unlockedLevel = progress.adventureProgress.currentLevel + 1;

  const startLevel = useCallback(
    (levelIdx: number) => {
      playClick();
      const levelConfig = LEVELS[levelIdx];
      const table = levelConfig.mixed ? 'mixed' : levelConfig.table;
      const qs: Question[] = [];
      for (let i = 0; i < levelConfig.questions; i++) {
        qs.push(generateQuestion(table, difficulty, progress.questionWeights));
      }
      setQuestions(qs);
      setCurrentQIdx(0);
      setCorrectCount(0);
      setAnswered(false);
      setSelectedAnswer(null);
      setMascotState('idle');
      setCurrentLevelIdx(levelIdx);
      setMode('playing');
    },
    [playClick, difficulty, progress.questionWeights]
  );

  const handleAnswer = useCallback(
    (answer: number) => {
      if (answered || !questions[currentQIdx]) return;
      const q = questions[currentQIdx];
      const correct = answer === q.correctAnswer;

      setAnswered(true);
      setSelectedAnswer(answer);
      setMascotState(correct ? 'happy' : 'sad');

      if (correct) {
        setCorrectCount((c) => c + 1);
        playCorrect();
      } else {
        playWrong();
      }

      recordAnswer(profile.id, q, correct, 0);

      setTimeout(() => {
        if (currentQIdx + 1 >= questions.length) {
          // Level complete
          const finalCorrect = correctCount + (correct ? 1 : 0);
          const total = questions.length;
          const accuracy = finalCorrect / total;
          const stars = accuracy === 1 ? 3 : accuracy >= 0.7 ? 2 : accuracy >= 0.5 ? 1 : 0;

          setResultStars(stars);
          if (stars > 0) {
            updateAdventureProgress(profile.id, LEVELS[currentLevelIdx].level, stars as 1 | 2 | 3);
            playLevelUp();
          }
          setMode('result');
        } else {
          setCurrentQIdx((i) => i + 1);
          setAnswered(false);
          setSelectedAnswer(null);
          setMascotState('idle');
        }
      }, 1000);
    },
    [
      answered,
      questions,
      currentQIdx,
      correctCount,
      currentLevelIdx,
      profile.id,
      recordAnswer,
      updateAdventureProgress,
      playCorrect,
      playWrong,
      playLevelUp,
    ]
  );

  const getLevelStars = (levelNum: number) =>
    progress.adventureProgress.stars[levelNum] ?? 0;

  const currentQ = questions[currentQIdx];
  const levelConfig = LEVELS[currentLevelIdx];

  return (
    <div className="relative min-h-screen bg-bg overflow-hidden">
      <BackgroundDecoration />
      <div className="relative z-10 max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <Button
            variant="ghost"
            onClick={() => { playClick(); mode === 'map' ? navigate('/home') : setMode('map'); }}
            className="text-sm py-1 px-3 min-h-[36px]"
          >
            ← {mode === 'map' ? 'חזרה' : 'מפה'}
          </Button>
          <h1 className="text-2xl font-bold text-dark-ink font-fredoka">🗡️ הרפתקה</h1>
          <div className="w-16" />
        </div>

        <AnimatePresence mode="wait">
          {/* MAP MODE */}
          {mode === 'map' && (
            <motion.div
              key="map"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 py-2"
            >
              <div className="text-center mb-4">
                <MascotCharacter state="idle" size={70} showSpeech className="mb-2" />
                <p className="font-fredoka text-dark-ink/70">בחר רמה להרפתקה שלך!</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {LEVELS.map((lvl, idx) => {
                  const isUnlocked = lvl.level <= unlockedLevel;
                  const stars = getLevelStars(lvl.level);

                  return (
                    <motion.button
                      key={lvl.level}
                      whileHover={isUnlocked ? { scale: 1.05, y: -2 } : {}}
                      whileTap={isUnlocked ? { scale: 0.97 } : {}}
                      onClick={() => isUnlocked && startLevel(idx)}
                      className={[
                        'border-3 border-dark-ink rounded-2xl p-4 text-center font-fredoka',
                        isUnlocked
                          ? 'bg-white shadow-comic cursor-pointer hover:bg-primary/10'
                          : 'bg-white/40 shadow-comic-sm opacity-60 cursor-not-allowed',
                      ].join(' ')}
                    >
                      <div className="text-3xl mb-1">{isUnlocked ? lvl.emoji : '🔒'}</div>
                      <div className="font-bold text-sm text-dark-ink">
                        רמה {lvl.level}
                      </div>
                      <div className="text-xs text-dark-ink/60 mb-2">{lvl.name}</div>
                      {/* Stars */}
                      <div className="flex justify-center gap-1">
                        {[1, 2, 3].map((s) => (
                          <span key={s} className={`text-sm ${s <= stars ? '' : 'opacity-20'}`}>
                            ⭐
                          </span>
                        ))}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* PLAYING MODE */}
          {mode === 'playing' && currentQ && (
            <motion.div
              key={`q-${currentQIdx}`}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="px-4 py-2"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-fredoka text-sm text-dark-ink/60 bg-white border-2 border-dark-ink/20 rounded-xl px-3 py-1">
                  {levelConfig.emoji} {levelConfig.name}
                </span>
                <span className="font-fredoka text-sm font-bold text-dark-ink">
                  {currentQIdx + 1}/{questions.length}
                </span>
              </div>

              <ProgressBar
                value={((currentQIdx) / questions.length) * 100}
                height="sm"
                className="mb-4"
              />

              <div className="flex justify-center mb-3">
                <MascotCharacter state={mascotState} size={70} showSpeech={answered} />
              </div>

              <Card padding="lg" className="text-center mb-6">
                <motion.div
                  key={currentQIdx}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-6xl font-bold text-dark-ink font-fredoka py-2"
                >
                  {currentQ.multiplicand} × {currentQ.multiplier} = ?
                </motion.div>
              </Card>

              <div className="grid grid-cols-2 gap-3">
                {currentQ.options.map((option) => {
                  let style = 'bg-white hover:bg-primary/30 border-dark-ink cursor-pointer';
                  if (answered) {
                    if (option === currentQ.correctAnswer) style = 'bg-success border-dark-ink text-white cursor-default';
                    else if (option === selectedAnswer) style = 'bg-error border-dark-ink text-white cursor-default';
                    else style = 'bg-white/50 border-dark-ink/30 text-dark-ink/40 cursor-default';
                  }
                  return (
                    <motion.button
                      key={option}
                      whileHover={!answered ? { scale: 1.05, y: -2 } : {}}
                      whileTap={!answered ? { scale: 0.95 } : {}}
                      onClick={() => handleAnswer(option)}
                      className={`border-3 rounded-2xl py-5 text-2xl font-bold font-fredoka shadow-comic transition-all ${style}`}
                    >
                      {option}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* RESULT MODE */}
          {mode === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-4 py-4 text-center"
            >
              <MascotCharacter
                state={resultStars >= 2 ? 'excited' : resultStars === 1 ? 'happy' : 'sad'}
                size={100}
                showSpeech
                className="mb-4"
              />

              <h2 className="text-3xl font-bold text-dark-ink font-fredoka mb-2">
                {resultStars === 3 ? 'מושלם!!! 🎉' : resultStars === 2 ? 'כל הכבוד! 👏' : resultStars === 1 ? 'טוב! 💪' : 'נסה שוב! 💡'}
              </h2>

              <div className="flex justify-center gap-3 my-5">
                {[1, 2, 3].map((s) => (
                  <motion.span
                    key={s}
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: s * 0.25, type: 'spring', stiffness: 250 }}
                    className={`text-6xl ${s <= resultStars ? '' : 'opacity-20'}`}
                  >
                    ⭐
                  </motion.span>
                ))}
              </div>

              <Card padding="md" className="mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-success font-fredoka">{correctCount}</div>
                    <div className="text-sm text-dark-ink/60 font-fredoka">מתוך {questions.length} נכונות</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-accent font-fredoka">
                      {Math.round((correctCount / questions.length) * 100)}%
                    </div>
                    <div className="text-sm text-dark-ink/60 font-fredoka">דיוק</div>
                  </div>
                </div>
              </Card>

              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setMode('map')} className="flex-1">
                  מפה
                </Button>
                <Button
                  variant="primary"
                  onClick={() => startLevel(currentLevelIdx)}
                  className="flex-1"
                >
                  שוב! 🔄
                </Button>
                {resultStars > 0 && currentLevelIdx < LEVELS.length - 1 && (
                  <Button
                    variant="secondary"
                    onClick={() => startLevel(currentLevelIdx + 1)}
                    className="flex-1"
                  >
                    הבא →
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdventureScreen;
