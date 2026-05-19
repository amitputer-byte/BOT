import React from 'react';
import { motion } from 'framer-motion';
import type { Question } from '../../types';

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  total: number;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  questionNumber,
  total,
}) => {
  return (
    <motion.div
      key={questionNumber}
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -300 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="bg-white border-3 border-dark-ink rounded-2xl p-8 text-center mx-4"
      style={{ boxShadow: '4px 4px 0px #FFEB3B, 6px 6px 0px #2D2D44' }}
    >
      <div className="text-sm font-fredoka text-dark-ink/50 mb-2">
        שאלה {questionNumber} מתוך {total}
      </div>
      <div className="flex items-center justify-center gap-3 py-2" dir="ltr">
        <span
          className="font-fredoka font-bold text-primary-dark"
          style={{ fontSize: '72px', lineHeight: 1 }}
        >
          {question.multiplicand}
        </span>
        <span
          className="font-fredoka font-bold text-accent"
          style={{ fontSize: '72px', lineHeight: 1 }}
        >
          ×
        </span>
        <span
          className="font-fredoka font-bold text-primary-dark"
          style={{ fontSize: '72px', lineHeight: 1 }}
        >
          {question.multiplier}
        </span>
        <span
          className="font-fredoka font-bold text-dark-ink"
          style={{ fontSize: '72px', lineHeight: 1 }}
        >
          =
        </span>
        <span
          className="font-fredoka font-bold text-dark-ink"
          style={{ fontSize: '72px', lineHeight: 1 }}
        >
          ?
        </span>
      </div>
    </motion.div>
  );
};

export default QuestionCard;
