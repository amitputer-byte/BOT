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
  default: 'bg-white border-dark-ink text-dark-ink hover:bg-primary/20 cursor-pointer',
  correct: 'bg-success border-dark-ink text-white cursor-default',
  wrong: 'bg-error border-dark-ink text-white cursor-default',
  reveal: 'bg-success/20 border-success text-success cursor-default',
};

const wrongAnimation = {
  x: [0, -14, 14, -10, 10, -6, 6, -3, 3, 0],
  transition: { duration: 0.55, ease: 'easeInOut' },
};

const correctAnimation = {
  scale: [1, 1.25, 0.92, 1.08, 1],
  transition: { type: 'spring' as const, stiffness: 400, damping: 8, duration: 0.5 },
};

const revealAnimation = {
  scale: [1, 1.05, 1],
  transition: { duration: 0.7, repeat: Infinity, ease: 'easeInOut' },
};

export const AnswerButton: React.FC<AnswerButtonProps> = ({
  value,
  state,
  onClick,
  disabled,
  keyHint,
}) => {
  const getAnimate = () => {
    if (state === 'wrong') return wrongAnimation;
    if (state === 'correct') return correctAnimation;
    if (state === 'reveal') return revealAnimation;
    return {};
  };

  return (
    <motion.button
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      animate={getAnimate()}
      whileHover={state === 'default' && !disabled ? { scale: 1.06, y: -3 } : {}}
      whileTap={state === 'default' && !disabled ? { scale: 0.94, y: 3 } : {}}
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
        disabled && state === 'default' ? 'opacity-70' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={
        state === 'reveal'
          ? { border: '3px solid #22c55e' }
          : undefined
      }
    >
      {/* Key hint badge — desktop only */}
      <span className="absolute top-1 right-2 text-xs font-fredoka text-dark-ink/35 hidden sm:block">
        {keyHint}
      </span>

      {/* State icons */}
      {state === 'correct' && <span className="mr-1 text-xl">✓</span>}
      {state === 'wrong' && <span className="mr-1 text-xl">✗</span>}

      {value}
    </motion.button>
  );
};

export default AnswerButton;
