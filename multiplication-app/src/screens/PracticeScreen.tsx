import React, { useState, useEffect, useCallback } from 'react';
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

type Mode = 'select' | 'playing' | 'summary';

const TABLE_NUMBERS = [2, 3, 4, 5, 6, 7, 8, 9, 10];
const QUESTIONS_PER_SESSION = 10;

const TableSelectView: React.FC<{
  onSelectTable: (table: number | 'mixed') => void;
}> = ({ onSelectTable }) => {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold text-dark-ink font-fredoka text-center mb-6">
        בחר לוח כפל:
      </h2>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {TABLE_NUMBERS.map((n) => (
          <motion.button
            key={n}
            whileHover={{ scale: 1.08, y: -2 }}
            whileTap={{ scale: 0.95, y: 3 }}
            onClick={() => onSelectTable(n)}
            className="bg-white border-3 border-dark-ink rounded-2xl shadow-comic
                       py-5 text-center font-fredoka font-bold text-2xl text-dark-ink
                       hover:bg-primary/20 transition-colors cursor-pointer"
          >
            × {n}
          </motion.button>
        ))}
      </div>
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => onSelectTable('mixed')}
        className="w-full bg-primary border-3 border-dark-ink rounded-2xl shadow-comic-lg
                   py-4 font-fredoka font-bold text-xl text-dark-ink cursor-pointer"
      >
        🌀 מעורב - כל הלוחות!
      </motion.button>
    </div>
  );
};

const QuestionCard: React.FC<{
  question: Question;
  questionNum: number;
  totalQuestions: number;
  streak: number;
  onAnswer: (answer: number) => void;
  answered: boolean;
  selectedAnswer: number | null;
}> = ({ question, questionNum, totalQuestions, streak, onAnswer, answered, selectedAnswer }) => {
  const getOptionStyle = (option: number) => {
    if (!answered) {
      return 'bg-white hover:bg-primary/30 border-dark-ink cursor-pointer';
    }
    if (option === question.correctAnswer) {
      return 'bg-success border-dark-ink text-white cursor-default';
    }
    if (option === selectedAnswer && option !== question.correctAnswer) {
      return 'bg-error border-dark-ink text-white cursor-default';
    }
    return 'bg-white/50 border-dark-ink/30 text-dark-ink/40 cursor-default';
  };

  return (
    <div className="px-4 py-2">
      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="font-fredoka text-sm text-dark-ink/60">
            שאלה {questionNum} מתוך {totalQuestions}
          </span>
          {streak >= 3 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="font-fredoka text-sm font-bold text-accent"
            >
              🔥 {streak} ברצף!
            </motion.span>
          )}
        </div>
        <ProgressBar value={(questionNum / totalQuestions) * 100} height="sm" />
      </div>

      {/* Question display */}
      <Card padding="lg" className="text-center mb-6">
        <motion.div
          key={`${question.multiplicand}x${question.multiplier}`}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="text-6xl font-bold text-dark-ink font-fredoka py-2"
        >
          {question.multiplicand} × {question.multiplier} = ?
        </motion.div>
      </Card>

      {/* Answer options */}
      <div className="grid grid-cols-2 gap-3">
        {question.options.map((option) => (
          <motion.button
            key={option}
            whileHover={!answered ? { scale: 1.05, y: -2 } : {}}
            whileTap={!answered ? { scale: 0.95, y: 3 } : {}}
            onClick={() => !answered && onAnswer(option)}
            className={[
              'border-3 rounded-2xl py-5 text-2xl font-bold font-fredoka shadow-comic',
              'transition-all duration-150',
              getOptionStyle(option),
            ].join(' ')}
          >
            {answered && option === question.correctAnswer && '✓ '}
            {answered && option === selectedAnswer && option !== question.correctAnswer && '✗ '}
            {option}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

const SummaryView: React.FC<{
  correct: number;
  total: number;
  table: number | 'mixed';
  onPlayAgain: () => void;
  onBack: () => void;
}> = ({ correct, total, table, onPlayAgain, onBack }) => {
  const accuracy = Math.round((correct / total) * 100);
  const mascotState: MascotState =
    accuracy === 100 ? 'excited' : accuracy >= 70 ? 'happy' : accuracy >= 50 ? 'idle' : 'sad';
  const stars = accuracy === 100 ? 3 : accuracy >= 70 ? 2 : 1;

  return (
    <div className="px-4 py-6 text-center">
      <MascotCharacter state={mascotState} size={100} showSpeech className="mb-4" />

      <h2 className="text-3xl font-bold text-dark-ink font-fredoka mb-2">
        {accuracy === 100 ? 'מושלם! 🎉' : accuracy >= 70 ? 'כל הכבוד! 👏' : 'לא נורא, ננסה שוב! 💪'}
      </h2>

      {/* Stars */}
      <div className="flex justify-center gap-2 my-4">
        {[1, 2, 3].map((s) => (
          <motion.span
            key={s}
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: s * 0.2, type: 'spring', stiffness: 300 }}
            className={`text-5xl ${s <= stars ? '' : 'opacity-25'}`}
          >
            ⭐
          </motion.span>
        ))}
      </div>

      <Card padding="md" className="mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-4xl font-bold text-success font-fredoka">{correct}</div>
            <div className="text-sm text-dark-ink/60 font-fredoka">תשובות נכונות</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-accent font-fredoka">{accuracy}%</div>
            <div className="text-sm text-dark-ink/60 font-fredoka">דיוק</div>
          </div>
        </div>
        <div className="mt-3">
          <ProgressBar value={accuracy} height="md" color={accuracy >= 70 ? 'success' : 'accent'} showPercent />
        </div>
      </Card>

      <p className="text-dark-ink/60 font-fredoka mb-6">
        {table === 'mixed' ? 'לוח מעורב' : `לוח כפל ${table}`} — {total} שאלות
      </p>

      <div className="flex gap-3">
        <Button variant="ghost" onClick={onBack} className="flex-1">
          חזרה
        </Button>
        <Button variant="primary" onClick={onPlayAgain} className="flex-1">
          שוב! 🔄
        </Button>
      </div>
    </div>
  );
};

export const PracticeScreen: React.FC = () => {
  const navigate = useNavigate();
  const getActiveProfile = useProfileStore((s) => s.getActiveProfile);
  const getProgress = useProgressStore((s) => s.getProgress);
  const recordAnswer = useProgressStore((s) => s.recordAnswer);
  const difficulty = useSettingsStore((s) => s.difficulty);
  const { playCorrect, playWrong, playClick, playStreak } = useSound();

  const profile = getActiveProfile();

  const [mode, setMode] = useState<Mode>('select');
  const [selectedTable, setSelectedTable] = useState<number | 'mixed'>(2);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionNum, setQuestionNum] = useState(1);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [mascotState, setMascotState] = useState<MascotState>('idle');

  const nextQuestion = useCallback(
    (table: number | 'mixed') => {
      if (!profile) return;
      const progress = getProgress(profile.id);
      const q = generateQuestion(table, difficulty, progress.questionWeights);
      setCurrentQuestion(q);
      setAnswered(false);
      setSelectedAnswer(null);
      setMascotState('idle');
    },
    [profile, getProgress, difficulty]
  );

  const handleSelectTable = (table: number | 'mixed') => {
    playClick();
    setSelectedTable(table);
    setQuestionNum(1);
    setCorrectCount(0);
    setStreak(0);
    setMode('playing');
    if (profile) {
      const progress = getProgress(profile.id);
      const q = generateQuestion(table, difficulty, progress.questionWeights);
      setCurrentQuestion(q);
      setAnswered(false);
      setSelectedAnswer(null);
    }
  };

  const handleAnswer = useCallback(
    (answer: number) => {
      if (!currentQuestion || !profile || answered) return;

      const correct = answer === currentQuestion.correctAnswer;
      const newStreak = correct ? streak + 1 : 0;

      setAnswered(true);
      setSelectedAnswer(answer);
      setStreak(newStreak);

      if (correct) {
        setCorrectCount((c) => c + 1);
        setMascotState(newStreak >= 5 ? 'excited' : 'happy');
        if (newStreak > 0 && newStreak % 5 === 0) {
          playStreak();
        } else {
          playCorrect();
        }
      } else {
        setMascotState('sad');
        playWrong();
      }

      recordAnswer(profile.id, currentQuestion, correct, 0);

      setTimeout(() => {
        if (questionNum >= QUESTIONS_PER_SESSION) {
          setMode('summary');
        } else {
          setQuestionNum((n) => n + 1);
          nextQuestion(selectedTable);
        }
      }, 1200);
    },
    [
      currentQuestion,
      profile,
      answered,
      streak,
      questionNum,
      selectedTable,
      recordAnswer,
      nextQuestion,
      playCorrect,
      playWrong,
      playStreak,
    ]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (mode !== 'playing' || !currentQuestion || answered) return;
      const keyMap: Record<string, number> = {
        '1': currentQuestion.options[0],
        '2': currentQuestion.options[1],
        '3': currentQuestion.options[2],
        '4': currentQuestion.options[3],
      };
      if (keyMap[e.key] !== undefined) {
        handleAnswer(keyMap[e.key]);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [mode, currentQuestion, answered, handleAnswer]);

  if (!profile) {
    navigate('/');
    return null;
  }

  return (
    <div className="relative min-h-screen bg-bg overflow-hidden">
      <BackgroundDecoration />

      <div className="relative z-10 max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <Button variant="ghost" onClick={() => { playClick(); navigate('/home'); }} className="text-sm py-1 px-3 min-h-[36px]">
            ← חזרה
          </Button>
          <h1 className="text-2xl font-bold text-dark-ink font-fredoka">תרגול</h1>
          <div className="w-16" />
        </div>

        {/* Mascot */}
        {mode === 'playing' && (
          <div className="flex justify-center py-2">
            <MascotCharacter state={mascotState} size={70} showSpeech={answered} />
          </div>
        )}

        {/* Content */}
        <AnimatePresence mode="wait">
          {mode === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
            >
              <TableSelectView onSelectTable={handleSelectTable} />
            </motion.div>
          )}

          {mode === 'playing' && currentQuestion && (
            <motion.div
              key={`q-${questionNum}`}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
            >
              <QuestionCard
                question={currentQuestion}
                questionNum={questionNum}
                totalQuestions={QUESTIONS_PER_SESSION}
                streak={streak}
                onAnswer={handleAnswer}
                answered={answered}
                selectedAnswer={selectedAnswer}
              />
            </motion.div>
          )}

          {mode === 'summary' && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <SummaryView
                correct={correctCount}
                total={QUESTIONS_PER_SESSION}
                table={selectedTable}
                onPlayAgain={() => handleSelectTable(selectedTable)}
                onBack={() => setMode('select')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PracticeScreen;
