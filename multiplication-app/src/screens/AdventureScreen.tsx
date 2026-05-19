import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactConfetti from 'react-confetti';
import { useProfileStore } from '../store/profileStore';
import { useProgressStore } from '../store/progressStore';
import { useSettingsStore } from '../store/settingsStore';
import { generateQuestion } from '../lib/questions';
import {
  WORLDS,
  ALL_LEVELS,
  getLevelConfig,
  getWorldForLevel,
  getNextLevel,
} from '../lib/adventure-map';
import type { LevelConfig, WorldConfig } from '../lib/adventure-map';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { MascotCharacter, type MascotState } from '../components/character/MascotCharacter';
import { WorldSection } from '../components/adventure/WorldSection';
import { BossCharacter } from '../components/adventure/BossCharacter';
import { BackgroundDecoration } from '../components/layout/BackgroundDecoration';
import { useSound } from '../hooks/useSound';
import type { Question } from '../types';

// ─── View State Machine ──────────────────────────────────────────────────────
type View = 'map' | 'level-intro' | 'playing' | 'level-complete' | 'champion';

// ─── Helper ──────────────────────────────────────────────────────────────────
function calcStars(correct: number, total: number): 1 | 2 | 3 {
  const pct = correct / total;
  if (pct >= 1) return 3;
  if (pct >= 0.8) return 2;
  return 1;
}

function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const handler = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return size;
}

// ─── Main Component ──────────────────────────────────────────────────────────
export const AdventureScreen: React.FC = () => {
  const navigate = useNavigate();
  const getActiveProfile = useProfileStore((s) => s.getActiveProfile);
  const getProgress = useProgressStore((s) => s.getProgress);
  const recordAnswer = useProgressStore((s) => s.recordAnswer);
  const updateAdventureProgress = useProgressStore((s) => s.updateAdventureProgress);
  const difficulty = useSettingsStore((s) => s.difficulty);
  const { playCorrect, playWrong, playClick, playLevelUp } = useSound();
  const { width: winW, height: winH } = useWindowSize();

  const profile = getActiveProfile();

  // View state
  const [view, setView] = useState<View>('map');

  // Selected level for intro/playing
  const [selectedLevelId, setSelectedLevelId] = useState<number>(1);

  // Playing state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [lives, setLives] = useState(3);
  const [answered, setAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [mascotState, setMascotState] = useState<MascotState>('idle');
  const [bossStreak, setBossStreak] = useState(0);
  const [showStreakReset, setShowStreakReset] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  // Result state
  const [resultStars, setResultStars] = useState<1 | 2 | 3>(1);
  const [resultCorrect, setResultCorrect] = useState(0);
  const [resultTotal, setResultTotal] = useState(0);

  // Champion (first-time level 15 complete) — tracked for confetti count
  const [_isChampion, setIsChampion] = useState(false);

  // Map scroll ref
  const mapRef = useRef<HTMLDivElement>(null);

  if (!profile) {
    navigate('/');
    return null;
  }

  const progress = getProgress(profile.id);
  const adventureProgress = progress.adventureProgress;

  // Determine the "current" level for the map (first locked after last completed)
  const currentMapLevelId = (() => {
    for (const lvl of ALL_LEVELS) {
      if (!adventureProgress.stars[lvl.id]) return lvl.id;
    }
    return 15; // all done
  })();

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const openLevelIntro = useCallback(
    (levelId: number) => {
      playClick();
      setSelectedLevelId(levelId);
      setView('level-intro');
    },
    [playClick]
  );

  const startLevel = useCallback(
    (levelId: number) => {
      playClick();
      const levelConfig = getLevelConfig(levelId);
      const qs: Question[] = [];
      // Generate questions from all tables in this level
      const tablePool = levelConfig.tables;
      for (let i = 0; i < levelConfig.questionCount; i++) {
        const table = tablePool[i % tablePool.length];
        qs.push(generateQuestion(table, difficulty, progress.questionWeights));
      }
      // Shuffle questions
      for (let i = qs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [qs[i], qs[j]] = [qs[j], qs[i]];
      }

      setQuestions(qs);
      setCurrentQIdx(0);
      setCorrectCount(0);
      setLives(3);
      setAnswered(false);
      setSelectedAnswer(null);
      setMascotState('idle');
      setBossStreak(0);
      setShowStreakReset(false);
      setGameOver(false);
      setSelectedLevelId(levelId);
      setView('playing');
    },
    [playClick, difficulty, progress.questionWeights]
  );

  const handleAnswer = useCallback(
    (answer: number) => {
      if (answered || gameOver) return;
      const q = questions[currentQIdx];
      if (!q) return;

      const levelConfig = getLevelConfig(selectedLevelId);
      const correct = answer === q.correctAnswer;

      setAnswered(true);
      setSelectedAnswer(answer);
      setMascotState(correct ? 'happy' : 'sad');
      recordAnswer(profile.id, q, correct, 0);

      if (correct) {
        playCorrect();
      } else {
        playWrong();
      }

      // Boss streak tracking
      let newStreak = bossStreak;
      if (levelConfig.isBoss) {
        if (correct) {
          newStreak = bossStreak + 1;
          setBossStreak(newStreak);
        } else {
          newStreak = 0;
          setBossStreak(0);
          setShowStreakReset(true);
          setTimeout(() => setShowStreakReset(false), 1800);
        }
      }

      // Life tracking for normal levels
      let newLives = lives;
      if (!levelConfig.isBoss && !correct) {
        newLives = lives - 1;
        setLives(newLives);
      }

      const newCorrectCount = correctCount + (correct ? 1 : 0);
      if (correct) setCorrectCount(newCorrectCount);

      setTimeout(() => {
        // Check boss win condition: streak reached required
        if (levelConfig.isBoss && newStreak >= (levelConfig.requiredCorrectStreak ?? 5)) {
          const stars = calcStars(newCorrectCount, levelConfig.questionCount);
          setResultStars(stars);
          setResultCorrect(newCorrectCount);
          setResultTotal(levelConfig.questionCount);
          updateAdventureProgress(profile.id, selectedLevelId, stars);
          playLevelUp();

          // Champion check
          if (selectedLevelId === 15 && !(adventureProgress.stars[15] > 0)) {
            setIsChampion(true);
            setView('champion');
          } else {
            setView('level-complete');
          }
          return;
        }

        // Normal level: lives ran out
        if (!levelConfig.isBoss && newLives <= 0) {
          setGameOver(true);
          setMascotState('sad');
          return;
        }

        // Move to next question
        const nextIdx = currentQIdx + 1;
        if (nextIdx >= questions.length) {
          // Level complete (normal level — used all questions)
          const stars = calcStars(newCorrectCount, questions.length);
          setResultStars(stars);
          setResultCorrect(newCorrectCount);
          setResultTotal(questions.length);
          updateAdventureProgress(profile.id, selectedLevelId, stars);
          playLevelUp();

          if (selectedLevelId === 15 && !(adventureProgress.stars[15] > 0)) {
            setIsChampion(true);
            setView('champion');
          } else {
            setView('level-complete');
          }
        } else {
          setCurrentQIdx(nextIdx);
          setAnswered(false);
          setSelectedAnswer(null);
          setMascotState('idle');
        }
      }, 1000);
    },
    [
      answered,
      gameOver,
      questions,
      currentQIdx,
      selectedLevelId,
      correctCount,
      lives,
      bossStreak,
      profile.id,
      adventureProgress.stars,
      recordAnswer,
      updateAdventureProgress,
      playCorrect,
      playWrong,
      playLevelUp,
    ]
  );

  const goToMap = useCallback(() => {
    playClick();
    setView('map');
    setGameOver(false);
    setBossStreak(0);
    setShowStreakReset(false);
  }, [playClick]);

  // ─── Derived ──────────────────────────────────────────────────────────────
  const selectedLevel: LevelConfig | null = selectedLevelId
    ? getLevelConfig(selectedLevelId)
    : null;
  const selectedWorld: WorldConfig | null = selectedLevelId
    ? getWorldForLevel(selectedLevelId)
    : null;
  const currentQ = questions[currentQIdx];
  const nextLevel = selectedLevelId ? getNextLevel(selectedLevelId) : null;

  // Boss progress: how far through the streak we are
  const bossRequired = selectedLevel?.requiredCorrectStreak ?? 5;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen bg-bg overflow-hidden" dir="rtl">
      <BackgroundDecoration />

      <AnimatePresence mode="wait">

        {/* ═══════════════════════════════════════════════════════════════════
            MAP VIEW
        ══════════════════════════════════════════════════════════════════════ */}
        {view === 'map' && (
          <motion.div
            key="map"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
            className="relative z-10 min-h-screen flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2 max-w-md mx-auto w-full">
              <Button
                variant="ghost"
                onClick={() => { playClick(); navigate('/home'); }}
                className="text-sm py-1 px-3 min-h-[44px]"
              >
                ← חזרה
              </Button>
              <h1 className="text-2xl font-bold text-dark-ink font-fredoka">🗡️ הרפתקה</h1>
              <div className="w-16" />
            </div>

            {/* Mascot + intro text */}
            <div className="text-center mb-3 px-4 max-w-md mx-auto w-full">
              <MascotCharacter state="idle" size={70} showSpeech className="mb-1" />
              <p className="font-fredoka text-dark-ink/70 text-sm">בחר שלב להרפתקה שלך!</p>
            </div>

            {/* Scrollable worlds list */}
            <div
              ref={mapRef}
              className="flex-1 overflow-y-auto px-4 pb-6 max-w-md mx-auto w-full"
            >
              {WORLDS.map((world) => (
                <WorldSection
                  key={world.id}
                  world={world}
                  adventureProgress={adventureProgress}
                  onLevelClick={openLevelIntro}
                  currentLevelId={currentMapLevelId}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            LEVEL INTRO VIEW
        ══════════════════════════════════════════════════════════════════════ */}
        {view === 'level-intro' && selectedLevel && selectedWorld && (
          <motion.div
            key="level-intro"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className={`relative z-10 min-h-screen flex flex-col ${selectedWorld.bgColor}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <Button
                variant="ghost"
                onClick={goToMap}
                className="text-sm py-1 px-3 min-h-[44px]"
              >
                ← מפה
              </Button>
              <div className="font-fredoka text-lg font-bold text-dark-ink">
                {selectedWorld.emoji} {selectedWorld.name}
              </div>
              <div className="w-16" />
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-6 py-4 max-w-md mx-auto w-full">
              {/* Level title */}
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-center mb-6"
              >
                <div className="text-sm font-fredoka text-dark-ink/60 mb-1">
                  שלב {selectedLevel.id}
                </div>
                <h2 className="text-3xl font-bold font-fredoka text-dark-ink">
                  {selectedLevel.name}
                </h2>
                {selectedLevel.isBoss && (
                  <div className="mt-2 text-lg font-fredoka text-orange-600 font-bold">
                    👑 שלב בוס!
                  </div>
                )}
              </motion.div>

              {/* Boss character or mascot */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                className="mb-6"
              >
                {selectedLevel.isBoss ? (
                  <BossCharacter worldId={selectedWorld.id} />
                ) : (
                  <MascotCharacter
                    state="excited"
                    size={100}
                    showSpeech
                    speechText="בואו נתחיל!"
                  />
                )}
              </motion.div>

              {/* Level details card */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="w-full mb-6"
              >
                <Card padding="md" className="w-full">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="text-2xl font-bold font-fredoka text-dark-ink">
                        {selectedLevel.questionCount}
                      </div>
                      <div className="text-xs font-fredoka text-dark-ink/60">שאלות</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold font-fredoka text-dark-ink">
                        {selectedLevel.tables.map((t) => `×${t}`).join(' ')}
                      </div>
                      <div className="text-xs font-fredoka text-dark-ink/60">לוחות</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold font-fredoka text-dark-ink">
                        {selectedLevel.isBoss ? '♾️' : '❤️❤️❤️'}
                      </div>
                      <div className="text-xs font-fredoka text-dark-ink/60">
                        {selectedLevel.isBoss ? 'ניסיונות' : '3 חיים'}
                      </div>
                    </div>
                  </div>
                  {selectedLevel.isBoss && (
                    <div className="mt-3 text-center">
                      <span className="inline-block bg-orange-100 border-2 border-orange-400 rounded-xl px-3 py-1 font-fredoka text-sm text-orange-700 font-bold">
                        ⚡ חייב {selectedLevel.requiredCorrectStreak} תשובות נכונות ברצף!
                      </span>
                    </div>
                  )}
                </Card>
              </motion.div>

              {/* Start button */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="w-full"
              >
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => startLevel(selectedLevel.id)}
                  className="text-xl py-4 min-h-[56px]"
                >
                  בואו נתחיל! 🚀
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            PLAYING VIEW
        ══════════════════════════════════════════════════════════════════════ */}
        {view === 'playing' && selectedLevel && selectedWorld && (
          <motion.div
            key="playing"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
            className="relative z-10 min-h-screen flex flex-col"
          >
            {/* Game Over overlay */}
            <AnimatePresence>
              {gameOver && (
                <motion.div
                  key="gameover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
                >
                  <motion.div
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 250 }}
                    className="bg-white rounded-3xl border-3 border-dark-ink shadow-comic p-8 text-center max-w-sm w-full"
                  >
                    <MascotCharacter state="sad" size={90} showSpeech speechText="נסה שוב!" className="mb-3" />
                    <h2 className="text-2xl font-bold font-fredoka text-dark-ink mb-4">
                      ניסיון נכשל 💔
                    </h2>
                    <p className="font-fredoka text-dark-ink/70 mb-6 text-sm">
                      נגמרו החיים! אתה יכול לנסות שוב.
                    </p>
                    <div className="flex gap-3">
                      <Button variant="ghost" onClick={goToMap} className="flex-1">
                        מפה
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => startLevel(selectedLevel.id)}
                        className="flex-1"
                      >
                        נסה שוב 🔄
                      </Button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Header bar */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2 max-w-md mx-auto w-full">
              <Button
                variant="ghost"
                onClick={goToMap}
                className="text-sm py-1 px-3 min-h-[44px]"
              >
                ← מפה
              </Button>
              <div className="font-fredoka font-bold text-dark-ink text-sm text-center">
                <span className="mr-1">{selectedWorld.emoji}</span>
                {selectedLevel.name}
              </div>
              {/* Lives or boss mode indicator */}
              {selectedLevel.isBoss ? (
                <div className="font-fredoka text-sm text-orange-600 font-bold min-w-[60px] text-left">
                  👑 בוס
                </div>
              ) : (
                <div className="flex gap-0.5 min-w-[60px] justify-end">
                  {[1, 2, 3].map((i) => (
                    <motion.span
                      key={i}
                      animate={i === lives + 1 && !gameOver ? { scale: [1.4, 1] } : {}}
                      transition={{ duration: 0.3 }}
                      className={`text-lg ${i <= lives ? '' : 'opacity-20'}`}
                    >
                      ❤️
                    </motion.span>
                  ))}
                </div>
              )}
            </div>

            <div className="relative z-10 px-4 max-w-md mx-auto w-full flex-1 flex flex-col">
              {/* Progress / Boss streak bar */}
              {selectedLevel.isBoss ? (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-fredoka text-xs text-dark-ink/60">רצף נכון</span>
                    <span className="font-fredoka text-xs font-bold text-dark-ink">
                      {bossStreak}/{bossRequired}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {Array.from({ length: bossRequired }).map((_, i) => (
                      <motion.div
                        key={i}
                        animate={
                          i === bossStreak - 1 && bossStreak > 0
                            ? { scale: [1.3, 1] }
                            : {}
                        }
                        transition={{ duration: 0.3 }}
                        className={[
                          'flex-1 h-4 rounded-full border-2 border-dark-ink',
                          i < bossStreak
                            ? 'bg-gradient-to-l from-orange-400 to-yellow-400'
                            : 'bg-white',
                        ].join(' ')}
                      />
                    ))}
                  </div>
                  {/* Streak reset message */}
                  <AnimatePresence>
                    {showStreakReset && (
                      <motion.p
                        key="streak-reset"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="text-center text-orange-600 font-fredoka text-sm mt-1 font-bold"
                      >
                        התחל מחדש את הרצף! 🔄
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-fredoka text-xs text-dark-ink/60">
                      שאלה {currentQIdx + 1} מתוך {questions.length}
                    </span>
                    <span className="font-fredoka text-xs font-bold text-dark-ink">
                      {Math.round(((currentQIdx) / questions.length) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-4 rounded-full bg-white border-2 border-dark-ink overflow-hidden shadow-comic-sm">
                    <motion.div
                      className="h-full bg-gradient-to-l from-secondary to-success rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(currentQIdx / questions.length) * 100}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              )}

              {/* Mascot */}
              <div className="flex justify-center mb-3">
                <MascotCharacter state={mascotState} size={70} showSpeech={answered} />
              </div>

              {/* Question card */}
              {currentQ && (
                <Card padding="lg" className="text-center mb-5">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentQIdx}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-6xl font-bold text-dark-ink font-fredoka py-2"
                    >
                      {currentQ.multiplicand} × {currentQ.multiplier} = ?
                    </motion.div>
                  </AnimatePresence>
                </Card>
              )}

              {/* Answer buttons */}
              {currentQ && (
                <div className="grid grid-cols-2 gap-3 flex-1">
                  {currentQ.options.map((option) => {
                    let style =
                      'bg-white hover:bg-primary/30 border-dark-ink cursor-pointer';
                    if (answered) {
                      if (option === currentQ.correctAnswer)
                        style = 'bg-success border-dark-ink text-white cursor-default';
                      else if (option === selectedAnswer)
                        style = 'bg-error border-dark-ink text-white cursor-default';
                      else
                        style =
                          'bg-white/50 border-dark-ink/30 text-dark-ink/40 cursor-default';
                    }
                    return (
                      <motion.button
                        key={option}
                        whileHover={!answered ? { scale: 1.05, y: -2 } : {}}
                        whileTap={!answered ? { scale: 0.95 } : {}}
                        onClick={() => handleAnswer(option)}
                        className={`border-3 rounded-2xl py-5 text-2xl font-bold font-fredoka shadow-comic transition-all min-h-[64px] ${style}`}
                      >
                        {option}
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            LEVEL COMPLETE VIEW
        ══════════════════════════════════════════════════════════════════════ */}
        {view === 'level-complete' && selectedLevel && selectedWorld && (
          <motion.div
            key="level-complete"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-8 ${selectedWorld.bgColor}`}
          >
            {/* Confetti */}
            <ReactConfetti
              width={winW}
              height={winH}
              recycle={false}
              numberOfPieces={resultStars === 3 ? 300 : 150}
              gravity={0.25}
              tweenDuration={4000}
            />

            <div className="max-w-sm w-full text-center">
              {/* Mascot */}
              <MascotCharacter
                state={resultStars === 3 ? 'excited' : 'happy'}
                size={100}
                showSpeech
                speechText={resultStars === 3 ? 'מושלם!!! 🌟' : 'כל הכבוד! 🎉'}
                className="mb-4"
              />

              {/* Title */}
              <motion.h2
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-3xl font-bold font-fredoka text-dark-ink mb-2"
              >
                עברת את השלב! 🎉
              </motion.h2>

              {/* Boss defeated special message */}
              {selectedLevel.isBoss && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 250 }}
                  className="mb-3 text-lg font-fredoka font-bold text-orange-600"
                >
                  👑 ניצחת את הבוס! מדהים!
                </motion.div>
              )}

              {/* Stars */}
              <div className="flex justify-center gap-4 my-5">
                {[1, 2, 3].map((s) => (
                  <motion.span
                    key={s}
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      delay: 0.3 + s * 0.2,
                      type: 'spring',
                      stiffness: 300,
                      damping: 15,
                    }}
                    className={`text-5xl ${s <= resultStars ? '' : 'opacity-20'}`}
                  >
                    ⭐
                  </motion.span>
                ))}
              </div>

              {/* Score recap */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Card padding="md" className="mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-success font-fredoka">
                        {resultCorrect}
                      </div>
                      <div className="text-sm text-dark-ink/60 font-fredoka">
                        מתוך {resultTotal} נכונות
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-accent font-fredoka">
                        {Math.round((resultCorrect / resultTotal) * 100)}%
                      </div>
                      <div className="text-sm text-dark-ink/60 font-fredoka">דיוק</div>
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* Action buttons */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="flex gap-3"
              >
                <Button variant="ghost" onClick={goToMap} className="flex-1 min-h-[52px]">
                  מפה
                </Button>
                {nextLevel ? (
                  <Button
                    variant="primary"
                    onClick={() => openLevelIntro(nextLevel.id)}
                    className="flex-1 min-h-[52px]"
                  >
                    השלב הבא ←
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={goToMap} className="flex-1 min-h-[52px]">
                    חזרה למפה 🗺️
                  </Button>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            CHAMPION VIEW (after level 15)
        ══════════════════════════════════════════════════════════════════════ */}
        {view === 'champion' && (
          <motion.div
            key="champion"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-8 bg-gradient-to-b from-yellow-100 to-orange-100"
          >
            {/* Massive confetti */}
            <ReactConfetti
              width={winW}
              height={winH}
              recycle={false}
              numberOfPieces={500}
              gravity={0.2}
              tweenDuration={5000}
            />

            <div className="max-w-sm w-full text-center">
              {/* Trophy */}
              <motion.div
                animate={{ scale: [1, 1.15, 1], rotate: [-5, 5, -5, 0] }}
                transition={{ duration: 1.5, repeat: 3, ease: 'easeInOut' }}
                className="text-8xl mb-3 select-none"
                aria-hidden="true"
              >
                🏆
              </motion.div>

              {/* Title */}
              <motion.h1
                initial={{ y: -30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 180 }}
                className="text-4xl font-bold font-fredoka text-dark-ink mb-2"
              >
                אלוף הכפלים!
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-lg font-fredoka text-dark-ink/70 mb-6"
              >
                סיימת את כל 15 השלבים! 🌟
              </motion.p>

              {/* Mascot excited */}
              <MascotCharacter
                state="excited"
                size={100}
                showSpeech
                speechText="אתה האלוף שלי! 🦊🏆"
                className="mb-6"
              />

              {/* Certificate card */}
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                className="mb-6"
              >
                <div className="bg-white border-4 border-yellow-500 rounded-3xl shadow-comic p-6 relative overflow-hidden">
                  {/* Decorative corners */}
                  <div className="absolute top-2 right-2 text-2xl">⭐</div>
                  <div className="absolute top-2 left-2 text-2xl">⭐</div>
                  <div className="absolute bottom-2 right-2 text-2xl">⭐</div>
                  <div className="absolute bottom-2 left-2 text-2xl">⭐</div>

                  <div className="font-fredoka text-sm text-dark-ink/50 mb-1">תעודת אלוף</div>
                  <div className="text-4xl mb-2">🏅</div>
                  <div className="font-fredoka font-bold text-2xl text-dark-ink mb-1">
                    {profile.name}
                  </div>
                  <div className="font-fredoka text-sm text-dark-ink/70">
                    סיים בהצלחה את כל לוחות הכפל
                  </div>
                  <div className="mt-3 font-fredoka text-xs text-dark-ink/40">
                    🦊 כפלי מאשר — אלוף הכפלים!
                  </div>
                </div>
              </motion.div>

              {/* Back button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <Button
                  variant="primary"
                  fullWidth
                  onClick={goToMap}
                  className="min-h-[56px] text-xl"
                >
                  חזרה למפה 🗺️
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};

export default AdventureScreen;
