import React from 'react';
import { motion } from 'framer-motion';

export type AnswerButtonState = 'default' | 'correct' | 'wrong' | 'reveal';

interface AnswerButtonProps {
  value: number;
  state: AnswerButtonState;
  onClick: () => void;
  disabled: boolean;
  keyHint: '1' | '2' | '3' | '4';
}

const stateStyles: Record<AnswerButtonState, string> = {
  default:
    'bg-white border-dark-ink text-dark-ink hover:bg-primary/20 cursor-pointer',
  correct:
    'bg-success border-dark-ink text-white cursor-default',
  wrong:
    'bg-error border-dark-ink text-white cursor-default',
  reveal:
    'bg-success/20 border-success text-success cursor-default',
};

export const AnswerButton: React.FC<AnswerButtonProps> = ({
  value,
  state,
  onClick,
  disabled,
  keyHint,
}) => {
  const shakeVariants = {
    wrong: {
      x: [0, -12, 12, -10, 10, -6, 6, 0],
      transition: { duration: 0.5, ease: 'easeInOut' },
    },
  };

  const correctVariants = {
    correct: {
      scale: [1, 1.2, 0.95, 1.05, 1],
      transition: { type: 'spring', stiffness: 400, damping: 10, duration: 0.5 },
    },
  };

  const revealVariants = {
    reveal: {
      scale: [1, 1.04, 1],
      transition: { duration: 0.6, repeat: Infinity, ease: 'easeInOut' },
    },
  };

  const getAnimateState = () => {
    if (state === 'wrong') return 'wrong';
    if (state === 'correct') return 'correct';
    if (state === 'reveal') return 'reveal';
    return 'idle';
  };

  return (
    <motion.button
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      variants={{ ...shakeVariants, ...correctVariants, ...revealVariants }}
      animate={getAnimateState()}
      whileHover={state === 'default' && !disabled ? { scale: 1.05, y: -3 } : {}}
      whileTap={state === 'default' && !disabled ? { scale: 0.95, y: 3 } : {}}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={[
        'relative',
        'border-3 rounded-2xl',
        'font-fredoka font-bold text-3xl',
        'shadow-comic',
        'min-h-[80px]',
        'flex items-center justify-center',
        'select-none',
        'transition-colors duration-100',
        stateStyles[state],
        disabled && state === 'default' ? 'opacity-80' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={
        state === 'reveal'
          ? { border: '3px solid #22c55e', animation: undefined }
          : undefined
      }
    >
      {/* Key hint badge */}
      <span className="absolute top-1 right-2 text-xs font-fredoka text-dark-ink/40 hidden sm:block">
        {keyHint}
      </span>

      {/* State icons */}
      {state === 'correct' && (
        <span className="mr-1 text-xl">✓</span>
      )}
      {state === 'wrong' && (
        <span className="mr-1 text-xl">✗</span>
      )}

      {value}
    </motion.button>
  );
};

export default AnswerButton;
