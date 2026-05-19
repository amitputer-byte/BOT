import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactConfetti from 'react-confetti';
import { useProfileStore } from '../store/profileStore';
import { useProgressStore } from '../store/progressStore';
import { useSettingsStore } from '../store/settingsStore';
import { generateQuestion } from '../lib/questions';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { MascotCharacter, type MascotState } from '../components/character/MascotCharacter';
import { BackgroundDecoration } from '../components/layout/BackgroundDecoration';
import { ProgressBar } from '../components/ui/ProgressBar';
import { QuestionCard } from '../components/game/QuestionCard';
import { AnswerButton, type AnswerButtonState } from '../components/game/AnswerButton';
import { LivesDisplay } from '../components/game/LivesDisplay';
import { ComboDisplay } from '../components/game/ComboDisplay';
import { useSound } from '../hooks/useSound';
import type { Question } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type View = 'table-select' | 'session' | 'summary';

interface SessionState {
  questions: Question[];
  currentIndex: number;
  score: number;
  lives: number;
  selectedOption: number | null;
  isAnswered: boolean;
  isCorrect: boolean | null;
  startTime: number;
  answeredTimes: number[];
  showLightningBonus: boolean;
  combo: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABLE_NUMBERS = [2, 3, 4, 5, 6, 7, 8, 9, 10];
const QUESTIONS_PER_SESSION = 10;
const MAX_LIVES = 3;

const TABLE_COLORS: Record<number, { bg: string; border: string; text: string }> = {
  2:  { bg: '#FFD93D', border: '#E6C200', text: '#2D2D44' },
  3:  { bg: '#FF6B9D', border: '#E0457A', text: '#fff' },
  4:  { bg: '#4ECDC4', border: '#2AADA4', text: '#fff' },
  5:  { bg: '#A29BFE', border: '#7B6FE8', text: '#fff' },
  6:  { bg: '#6BCB77', border: '#47B054', text: '#fff' },
  7:  { bg: '#FF8C42', border: '#E06B1A', text: '#fff' },
  8:  { bg: '#74B9FF', border: '#4A9DFF', text: '#fff' },
  9:  { bg: '#FD79A8', border: '#D95A84', text: '#fff' },
  10: { bg: '#B2EBF2', border: '#77D9E8', text: '#2D2D44' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function starsFromAccuracy(accuracy: number): number {
  if (accuracy >= 90) return 3;
  if (accuracy >= 70) return 2;
  if (accuracy >= 50) return 1;
  return 0;
}

function buildQuestions(
  table: number | 'mixed',
  difficulty: 'easy' | 'medium' | 'hard',
  weights: Record<string, number>
): Question[] {
  const qs: Question[] = [];
  for (let i = 0; i < QUESTIONS_PER_SESSION; i++) {
    qs.push(generateQuestion(table, difficulty, weights));
  }
  return qs;
}

// ─── Sub-view: Table Select ───────────────────────────────────────────────────

interface TableSelectViewProps {
  onSelectTable: (table: number | 'mixed') => void;
  masteryByTable: Record<number, number>; // 0–3 stars per table
}

const TableSelectView: React.FC<TableSelectViewProps> = ({ onSelectTable, masteryByTable }) => {
  return (
    <motion.div
      key="table-select"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      className="px-4 py-2"
    >
      <h2 className="text-2xl font-bold text-dark-ink font-fredoka text-center mb-5">
        באיזה לוח נתאמן?
      </h2>

      {/* 3×3 grid for ×2–×10 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {TABLE_NUMBERS.map((n, idx) => {
          const colors = TABLE_COLORS[n];
          const stars = masteryByTable[n] ?? 0;
          return (
            <motion.button
              key={n}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: idx * 0.05,
                type: 'spring',
                stiffness: 350,
                damping: 20,
              }}
              whileHover={{ scale: 1.1, y: -3 }}
              whileTap={{ scale: 0.92, y: 3 }}
              onClick={() => onSelectTable(n)}
              className="flex flex-col items-center justify-center border-3 border-dark-ink rounded-full shadow-comic cursor-pointer select-none"
              style={{
                width: '80px',
                height: '80px',
                margin: '0 auto',
                background: colors.bg,
                borderColor: colors.border,
              }}
            >
              <span
                className="font-fredoka font-bold text-xl leading-tight"
                style={{ color: colors.text }}
              >
                ×{n}
              </span>
              <span className="text-xs leading-none mt-0.5" style={{ fontSize: '11px' }}>
                {stars >= 1 ? '⭐' : '○'}
                {stars >= 2 ? '⭐' : '○'}
                {stars >= 3 ? '⭐' : '○'}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Mixed challenge button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, type: 'spring', stiffness: 300, damping: 24 }}
        whileHover={{ scale: 1.03, y: -2 }}
        whileTap={{ scale: 0.97, y: 4 }}
        onClick={() => onSelectTable('mixed')}
        className="w-full bg-accent border-3 border-dark-ink rounded-2xl shadow-comic-lg
                   py-4 font-fredoka font-bold text-xl text-white cursor-pointer select-none"
      >
        🌀 אתגר מעורב — כל הלוחות!
      </motion.button>
    </motion.div>
  );
};

// ─── Sub-view: Game Session ───────────────────────────────────────────────────

interface GameSessionViewProps {
  session: SessionState;
  selectedTable: number | 'mixed';
  mascotState: MascotState;
  onAnswer: (answer: number) => void;
  onBack: () => void;
  showMiniConfetti: boolean;
}

const GameSessionView: React.FC<GameSessionViewProps> = ({
  session,
  selectedTable,
  mascotState,
  onAnswer,
  onBack,
  showMiniConfetti,
}) => {
  const question = session.questions[session.currentIndex];
  const progressPercent = (session.score / QUESTIONS_PER_SESSION) * 100;

  if (!question) return null;

  const getButtonState = (option: number): AnswerButtonState => {
    if (!session.isAnswered) return 'default';
    if (option === question.correctAnswer) {
      // If user answered this one correctly, show green
      if (option === session.selectedOption) return 'correct';
      // If user answered wrong, reveal the correct one
      if (session.isCorrect === false) return 'reveal';
      return 'correct';
    }
    if (option === session.selectedOption && !session.isCorrect) return 'wrong';
    return 'default';
  };

  const keyHints: Array<'1' | '2' | '3' | '4'> = ['1', '2', '3', '4'];

  return (
    <motion.div
      key="session"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      className="flex flex-col"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={onBack}
          className="bg-white border-3 border-dark-ink rounded-xl px-3 py-1.5 font-fredoka
                     font-semibold text-dark-ink shadow-comic-sm cursor-pointer text-sm min-h-[36px]"
        >
          ← חזרה
        </motion.button>

        <div className="font-fredoka font-bold text-dark-ink text-sm text-center">
          {selectedTable === 'mixed' ? 'מעורב' : `לוח ×${selectedTable}`}
        </div>

        <LivesDisplay lives={session.lives} maxLives={MAX_LIVES} />
      </div>

      {/* Progress bar */}
      <div className="px-4 mb-1">
        <motion.div
          className="h-3 rounded-full border-2 border-dark-ink overflow-hidden bg-white"
          style={{ boxShadow: '2px 2px 0 #2D2D44' }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: '#4ECDC4' }}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
        </motion.div>
      </div>

      {/* Mascot + combo row */}
      <div className="flex items-center justify-between px-4 py-1">
        <ComboDisplay combo={session.combo} />
        <MascotCharacter
          state={mascotState}
          size={55}
          showSpeech={session.isAnswered}
          className="ml-auto"
        />
      </div>

      {/* Question Card with AnimatePresence for slide-in */}
      <AnimatePresence mode="wait">
        <QuestionCard
          key={session.currentIndex}
          question={question}
          questionNumber={session.currentIndex + 1}
          total={QUESTIONS_PER_SESSION}
        />
      </AnimatePresence>

      {/* Lightning bonus */}
      <div className="relative h-8 mx-4 mt-2">
        <AnimatePresence>
          {session.showLightningBonus && (
            <motion.div
              key="lightning"
              initial={{ opacity: 0, y: 0, scale: 0.7 }}
              animate={{ opacity: 1, y: -24, scale: 1 }}
              exit={{ opacity: 0, y: -48, scale: 0.8 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="absolute inset-x-0 flex justify-center"
            >
              <span className="bg-primary border-3 border-dark-ink rounded-full px-4 py-1
                               font-fredoka font-bold text-dark-ink text-base shadow-comic">
                ⚡ בונוס בזק! +5
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mini confetti on correct */}
      {showMiniConfetti && (
        <div className="pointer-events-none fixed inset-0 z-50">
          <ReactConfetti
            width={window.innerWidth}
            height={window.innerHeight}
            numberOfPieces={80}
            recycle={false}
            gravity={0.4}
            tweenDuration={1500}
          />
        </div>
      )}

      {/* Answer buttons 2×2 */}
      <div className="grid grid-cols-2 gap-3 px-4 mt-2">
        {question.options.map((option, idx) => (
          <AnswerButton
            key={option}
            value={option}
            state={getButtonState(option)}
            onClick={() => onAnswer(option)}
            disabled={session.isAnswered}
            keyHint={keyHints[idx]}
          />
        ))}
      </div>

      {/* No lives overlay */}
      <AnimatePresence>
        {session.lives <= 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-dark-ink/70 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 350, damping: 22 }}
              className="bg-white border-3 border-dark-ink rounded-2xl p-8 mx-6 text-center shadow-comic-lg"
            >
              <div className="text-5xl mb-3">💔</div>
              <h3 className="font-fredoka font-bold text-2xl text-dark-ink mb-2">
                נגמרו החיים!
              </h3>
              <p className="font-fredoka text-dark-ink/60 mb-6">
                אל תתייאש, ננסה שוב!
              </p>
              <Button variant="primary" onClick={onBack} fullWidth>
                נסה שוב
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Sub-view: Summary ────────────────────────────────────────────────────────

interface SummaryViewProps {
  session: SessionState;
  selectedTable: number | 'mixed';
  onPlayAgain: () => void;
  onBack: () => void;
}

const SummaryView: React.FC<SummaryViewProps> = ({
  session,
  selectedTable,
  onPlayAgain,
  onBack,
}) => {
  const accuracy = Math.round((session.score / QUESTIONS_PER_SESSION) * 100);
  const stars = starsFromAccuracy(accuracy);
  const mascotState: MascotState =
    accuracy >= 80 ? 'excited' : accuracy >= 50 ? 'happy' : 'thinking';

  const avgTime =
    session.answeredTimes.length > 0
      ? Math.round(session.answeredTimes.reduce((a, b) => a + b, 0) / session.answeredTimes.length / 100) / 10
      : 0;
  const fastestTime =
    session.answeredTimes.length > 0
      ? Math.round(Math.min(...session.answeredTimes) / 100) / 10
      : 0;

  const windowW = typeof window !== 'undefined' ? window.innerWidth : 400;
  const windowH = typeof window !== 'undefined' ? window.innerHeight : 700;

  return (
    <motion.div
      key="summary"
      initial={{ opacity: 0, scale: 0.93 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      className="px-4 py-4 text-center"
    >
      {/* Full-screen confetti if score >= 80% */}
      {accuracy >= 80 && (
        <ReactConfetti
          width={windowW}
          height={windowH}
          numberOfPieces={200}
          recycle={false}
          gravity={0.25}
          tweenDuration={4000}
          className="fixed inset-0 z-50 pointer-events-none"
        />
      )}

      <MascotCharacter state={mascotState} size={90} showSpeech className="mb-3" />

      <h2 className="text-3xl font-bold text-dark-ink font-fredoka mb-2">
        {accuracy === 100 ? 'מושלם! 🎉' : accuracy >= 80 ? 'כל הכבוד! 👏' : accuracy >= 50 ? 'יפה! 💪' : 'ננסה שוב! 🦊'}
      </h2>

      {/* Stars */}
      <div className="flex justify-center gap-3 my-4">
        {[1, 2, 3].map((s) => (
          <motion.span
            key={s}
            initial={{ scale: 0, rotate: -30, opacity: 0 }}
            animate={s <= stars ? { scale: 1, rotate: 0, opacity: 1 } : { scale: 1, rotate: 0, opacity: 0.2 }}
            transition={{ delay: s * 0.3, type: 'spring', stiffness: 350, damping: 15 }}
            className="text-5xl"
          >
            ⭐
          </motion.span>
        ))}
      </div>

      {/* Score */}
      <Card padding="md" className="mb-4">
        <div className="text-5xl font-bold text-secondary font-fredoka mb-1">
          {session.score} מתוך {QUESTIONS_PER_SESSION}
        </div>
        <ProgressBar value={accuracy} height="md" color={accuracy >= 70 ? 'success' : 'accent'} showPercent />
      </Card>

      {/* Stats */}
      <Card padding="sm" className="mb-5">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-2xl font-bold text-primary-dark font-fredoka">{avgTime}s</div>
            <div className="text-xs text-dark-ink/60 font-fredoka">ממוצע</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-success font-fredoka">{fastestTime}s</div>
            <div className="text-xs text-dark-ink/60 font-fredoka">הכי מהיר</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-accent font-fredoka">{session.combo}</div>
            <div className="text-xs text-dark-ink/60 font-fredoka">שיא רצף</div>
          </div>
        </div>
      </Card>

      <p className="text-dark-ink/55 font-fredoka mb-5 text-sm">
        {selectedTable === 'mixed' ? 'אתגר מעורב' : `לוח כפל ×${selectedTable}`}
      </p>

      <div className="flex gap-3">
        <Button variant="ghost" onClick={onBack} className="flex-1">
          חזרה לבחירה
        </Button>
        <Button variant="primary" onClick={onPlayAgain} className="flex-1">
          תרגול נוסף 🔄
        </Button>
      </div>
    </motion.div>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const PracticeScreen: React.FC = () => {
  const navigate = useNavigate();
  const getActiveProfile = useProfileStore((s) => s.getActiveProfile);
  const getProgress = useProgressStore((s) => s.getProgress);
  const recordAnswer = useProgressStore((s) => s.recordAnswer);
  const difficulty = useSettingsStore((s) => s.difficulty);
  const { playCorrect, playWrong, playClick, playStreak } = useSound();

  const profile = getActiveProfile();

  const [view, setView] = useState<View>('table-select');
  const [selectedTable, setSelectedTable] = useState<number | 'mixed'>(2);
  const [mascotState, setMascotState] = useState<MascotState>('idle');
  const [showMiniConfetti, setShowMiniConfetti] = useState(false);

  // Session state in a single ref to avoid stale closures in timeouts
  const [session, setSession] = useState<SessionState>({
    questions: [],
    currentIndex: 0,
    score: 0,
    lives: MAX_LIVES,
    selectedOption: null,
    isAnswered: false,
    isCorrect: null,
    startTime: Date.now(),
    answeredTimes: [],
    showLightningBonus: false,
    combo: 0,
  });

  // Track best combo seen this session (for summary)
  const bestComboRef = useRef(0);

  // Compute mastery stars per table from progress
  const masteryByTable: Record<number, number> = (() => {
    if (!profile) return {};
    const progress = getProgress(profile.id);
    const result: Record<number, number> = {};
    TABLE_NUMBERS.forEach((n) => {
      const tp = progress.byTable[n];
      if (!tp || tp.attempted < 5) {
        result[n] = 0;
      } else {
        const acc = tp.correct / tp.attempted;
        result[n] = acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : acc >= 0.5 ? 1 : 0;
      }
    });
    return result;
  })();

  const startSession = useCallback(
    (table: number | 'mixed') => {
      if (!profile) return;
      const progress = getProgress(profile.id);
      const questions = buildQuestions(table, difficulty, progress.questionWeights);
      bestComboRef.current = 0;
      setSession({
        questions,
        currentIndex: 0,
        score: 0,
        lives: MAX_LIVES,
        selectedOption: null,
        isAnswered: false,
        isCorrect: null,
        startTime: Date.now(),
        answeredTimes: [],
        showLightningBonus: false,
        combo: 0,
      });
      setMascotState('thinking');
      setView('session');
    },
    [profile, getProgress, difficulty]
  );

  const handleSelectTable = useCallback(
    (table: number | 'mixed') => {
      playClick();
      setSelectedTable(table);
      startSession(table);
    },
    [playClick, startSession]
  );

  const handleAnswer = useCallback(
    (answer: number) => {
      setSession((prev) => {
        if (prev.isAnswered || !profile) return prev;

        const question = prev.questions[prev.currentIndex];
        if (!question) return prev;

        const now = Date.now();
        const timeMs = now - prev.startTime;
        const correct = answer === question.correctAnswer;
        const newCombo = correct ? prev.combo + 1 : 0;
        if (newCombo > bestComboRef.current) bestComboRef.current = newCombo;

        const isLightning = correct && timeMs < 3000;
        const scoreBonus = isLightning ? 5 : 0;
        const newScore = prev.score + (correct ? 1 : 0) + (isLightning ? scoreBonus : 0);
        const newLives = correct ? prev.lives : prev.lives - 1;

        // Sounds and mascot (side effects — safe inside setState callback as fire-and-forget)
        if (correct) {
          if (newCombo > 0 && newCombo % 5 === 0) {
            playStreak();
          } else {
            playCorrect();
          }
          setMascotState(newCombo >= 5 ? 'excited' : 'happy');
          if (correct) {
            setShowMiniConfetti(true);
            setTimeout(() => setShowMiniConfetti(false), 1500);
          }
        } else {
          playWrong();
          setMascotState('sad');
        }

        // Record answer in progress store
        recordAnswer(profile.id, question, correct, timeMs);

        return {
          ...prev,
          selectedOption: answer,
          isAnswered: true,
          isCorrect: correct,
          score: newScore,
          lives: newLives,
          answeredTimes: [...prev.answeredTimes, timeMs],
          showLightningBonus: isLightning,
          combo: newCombo,
        };
      });

      // Advance after delay
      setTimeout(() => {
        setSession((prev) => {
          if (!prev.isAnswered) return prev;

          const nextIndex = prev.currentIndex + 1;
          if (nextIndex >= QUESTIONS_PER_SESSION || prev.lives <= 0) {
            // Save best combo to summary
            setSession((s) => ({
              ...s,
              combo: Math.max(s.combo, bestComboRef.current),
            }));
            setView('summary');
            return prev;
          }

          return {
            ...prev,
            currentIndex: nextIndex,
            selectedOption: null,
            isAnswered: false,
            isCorrect: null,
            startTime: Date.now(),
            showLightningBonus: false,
          };
        });
        setMascotState('thinking');
      }, 1200);
    },
    [profile, recordAnswer, playCorrect, playWrong, playStreak]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (view !== 'session') return;

      // Escape: quit session and go back to table select
      if (e.key === 'Escape') {
        playClick();
        setView('table-select');
        return;
      }

      const question = session.questions[session.currentIndex];
      if (!question || session.isAnswered) return;

      const keyMap: Record<string, number> = {
        '1': question.options[0],
        '2': question.options[1],
        '3': question.options[2],
        '4': question.options[3],
      };

      if (keyMap[e.key] !== undefined) {
        handleAnswer(keyMap[e.key]);
        return;
      }

      // Space: select focused answer (first option as default)
      if (e.key === ' ') {
        e.preventDefault();
        handleAnswer(question.options[0]);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [view, session, handleAnswer, playClick]);

  if (!profile) {
    navigate('/');
    return null;
  }

  return (
    <div className="relative min-h-screen bg-bg overflow-hidden">
      <BackgroundDecoration />

      <div className="relative z-10 max-w-md mx-auto">
        {/* Header — only shown outside session (session has its own top bar) */}
        {view !== 'session' && (
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <Button
              variant="ghost"
              onClick={() => { playClick(); navigate('/home'); }}
              className="text-sm py-1 px-3 min-h-[36px]"
            >
              ← חזרה
            </Button>
            <h1 className="text-2xl font-bold text-dark-ink font-fredoka">תרגול</h1>
            <div className="w-16" />
          </div>
        )}

        {/* Views */}
        <AnimatePresence mode="wait">
          {view === 'table-select' && (
            <TableSelectView
              key="table-select"
              onSelectTable={handleSelectTable}
              masteryByTable={masteryByTable}
            />
          )}

          {view === 'session' && (
            <GameSessionView
              key="session"
              session={session}
              selectedTable={selectedTable}
              mascotState={mascotState}
              onAnswer={handleAnswer}
              onBack={() => { playClick(); setView('table-select'); }}
              showMiniConfetti={showMiniConfetti}
            />
          )}

          {view === 'summary' && (
            <SummaryView
              key="summary"
              session={{ ...session, combo: bestComboRef.current }}
              selectedTable={selectedTable}
              onPlayAgain={() => {
                playClick();
                startSession(selectedTable);
              }}
              onBack={() => { playClick(); setView('table-select'); }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PracticeScreen;
