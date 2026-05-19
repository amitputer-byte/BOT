import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type MascotState = 'idle' | 'thinking' | 'happy' | 'sad' | 'excited' | 'sleeping';

interface MascotCharacterProps {
  state?: MascotState;
  size?: number;
  className?: string;
  showSpeech?: boolean;
  speechText?: string;
}

const dialogues: Record<MascotState, string[]> = {
  idle: [
    'בוא נלמד כפל יחד!',
    'אני כאן לעזור לך!',
    'מוכן להתחיל?',
    'היי! שמי כפלי 🦊',
    'אתה יכול לעשות זאת!',
  ],
  thinking: [
    'רגע... אני חושב...',
    'זו שאלה טובה!',
    'בוא נחשוב ביחד...',
    'ממממ...',
  ],
  happy: [
    'כל הכבוד! 🎉',
    'מעולה! אתה גאון!',
    'נהדר! המשך כך!',
    'וואו! איזה חכם!',
    'אחלה! תמשיך!',
  ],
  sad: [
    'לא נורא, ננסה שוב!',
    'טעויות זה בסדר!',
    'אל תתייאש!',
    'פעם הבאה תצליח!',
  ],
  excited: [
    'וואו!! מדהים!!',
    'אתה סופר-גיבור!',
    'אין כמוך!!',
    'הצלחת!! 🌟🌟🌟',
  ],
  sleeping: [
    'zzz...',
    'נמנום קטן...',
    'zzz... כפל... zzz',
  ],
};

// SVG face expressions
const FoxFace: React.FC<{ state: MascotState }> = ({ state }) => {
  const isExcited = state === 'excited';
  const isHappy = state === 'happy' || isExcited;
  const isSad = state === 'sad';
  const isSleeping = state === 'sleeping';
  const isThinking = state === 'thinking';

  return (
    <svg
      viewBox="0 0 120 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%' }}
    >
      {/* Ears */}
      <polygon points="15,55 25,15 45,50" fill="#FF8C42" stroke="#2D2D44" strokeWidth="2.5" strokeLinejoin="round" />
      <polygon points="75,50 95,15 105,55" fill="#FF8C42" stroke="#2D2D44" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Inner ear */}
      <polygon points="22,50 30,24 40,48" fill="#FFB8A0" />
      <polygon points="80,48 90,24 98,50" fill="#FFB8A0" />

      {/* Head */}
      <ellipse cx="60" cy="78" rx="45" ry="42" fill="#FF8C42" stroke="#2D2D44" strokeWidth="2.5" />

      {/* Face white area */}
      <ellipse cx="60" cy="90" rx="28" ry="22" fill="#FFF0E0" stroke="#2D2D44" strokeWidth="1.5" />

      {/* Eyes */}
      {isSleeping ? (
        <>
          {/* Closed eyes */}
          <path d="M42 72 Q47 68 52 72" stroke="#2D2D44" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M68 72 Q73 68 78 72" stroke="#2D2D44" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </>
      ) : isThinking ? (
        <>
          {/* One eye squinting */}
          <circle cx="46" cy="72" r="6" fill="white" stroke="#2D2D44" strokeWidth="2" />
          <circle cx="47" cy="72" r="3.5" fill="#2D2D44" />
          <circle cx="48.5" cy="70.5" r="1" fill="white" />
          {/* Squinting eye */}
          <path d="M67 72 Q74 68 79 72" stroke="#2D2D44" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <circle cx="46" cy="72" r="6" fill="white" stroke="#2D2D44" strokeWidth="2" />
          <circle cx="74" cy="72" r="6" fill="white" stroke="#2D2D44" strokeWidth="2" />
          <circle cx={isHappy ? 47 : 46} cy={isHappy ? 73 : 72} r="3.5" fill="#2D2D44" />
          <circle cx={isHappy ? 75 : 74} cy={isHappy ? 73 : 72} r="3.5" fill="#2D2D44" />
          {/* Eye shine */}
          <circle cx="48" cy="70" r="1" fill="white" />
          <circle cx="76" cy="70" r="1" fill="white" />
        </>
      )}

      {/* Eyebrows */}
      {isThinking && (
        <path d="M40 66 Q46 62 52 65" stroke="#2D2D44" strokeWidth="2" strokeLinecap="round" fill="none" />
      )}
      {isSad && (
        <>
          <path d="M40 66 Q46 70 52 67" stroke="#2D2D44" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M68 67 Q74 70 80 66" stroke="#2D2D44" strokeWidth="2" strokeLinecap="round" fill="none" />
        </>
      )}

      {/* Nose */}
      <ellipse cx="60" cy="82" rx="5" ry="3.5" fill="#2D2D44" />

      {/* Mouth */}
      {isHappy ? (
        <path d="M47 90 Q60 102 73 90" stroke="#2D2D44" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      ) : isSad ? (
        <path d="M47 96 Q60 88 73 96" stroke="#2D2D44" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      ) : isSleeping ? (
        <path d="M52 93 Q60 97 68 93" stroke="#2D2D44" strokeWidth="2" strokeLinecap="round" fill="none" />
      ) : (
        <path d="M50 92 Q60 98 70 92" stroke="#2D2D44" strokeWidth="2" strokeLinecap="round" fill="none" />
      )}

      {/* Cheek blush */}
      {isHappy && (
        <>
          <ellipse cx="36" cy="82" rx="7" ry="4" fill="#FF6B9D" opacity="0.5" />
          <ellipse cx="84" cy="82" rx="7" ry="4" fill="#FF6B9D" opacity="0.5" />
        </>
      )}

      {/* Sleeping ZZZ */}
      {isSleeping && (
        <>
          <text x="88" y="55" fontSize="10" fill="#2D2D44" fontWeight="bold">z</text>
          <text x="96" y="44" fontSize="13" fill="#2D2D44" fontWeight="bold">z</text>
          <text x="106" y="30" fontSize="16" fill="#2D2D44" fontWeight="bold">Z</text>
        </>
      )}

      {/* Thinking bubble dots */}
      {isThinking && (
        <>
          <circle cx="88" cy="55" r="3" fill="#2D2D44" opacity="0.6" />
          <circle cx="96" cy="44" r="4" fill="#2D2D44" opacity="0.6" />
          <circle cx="106" cy="32" r="5" fill="#2D2D44" opacity="0.6" />
        </>
      )}

      {/* Tail hint at bottom */}
      <path
        d="M80 115 Q100 108 108 118 Q100 130 85 122 Z"
        fill="#FF8C42"
        stroke="#2D2D44"
        strokeWidth="2"
      />
      <path
        d="M83 118 Q98 113 104 120"
        fill="#FFF0E0"
        stroke="none"
      />

      {/* Body */}
      <ellipse cx="60" cy="125" rx="30" ry="20" fill="#FF8C42" stroke="#2D2D44" strokeWidth="2.5" />
      <ellipse cx="60" cy="130" rx="18" ry="12" fill="#FFF0E0" stroke="#2D2D44" strokeWidth="1.5" />
    </svg>
  );
};

export const MascotCharacter: React.FC<MascotCharacterProps> = ({
  state = 'idle',
  size = 120,
  className = '',
  showSpeech = false,
  speechText,
}) => {
  const [currentDialogue, setCurrentDialogue] = useState('');

  // Pick initial dialogue when state or speechText changes
  useEffect(() => {
    const options = dialogues[state];
    const pick = options[Math.floor(Math.random() * options.length)];
    setCurrentDialogue(speechText ?? pick);
  }, [state, speechText]);

  // Random dialogue rotation every 8–12 seconds (only when showing speech without override)
  useEffect(() => {
    if (!showSpeech || speechText) return;

    const scheduleNext = () => {
      const delay = 8000 + Math.random() * 4000; // 8–12 seconds
      return setTimeout(() => {
        const options = dialogues[state];
        const pick = options[Math.floor(Math.random() * options.length)];
        setCurrentDialogue(pick);
        timerRef.current = scheduleNext();
      }, delay);
    };

    const timerRef = { current: scheduleNext() };
    return () => clearTimeout(timerRef.current);
  }, [showSpeech, speechText, state]);

  const isExcited = state === 'excited';

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      {/* Speech bubble */}
      <AnimatePresence>
        {showSpeech && currentDialogue && (
          <motion.div
            key={currentDialogue}
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="mb-2 bg-white border-3 border-dark-ink rounded-2xl px-4 py-2
                       shadow-comic max-w-[200px] text-center font-fredoka font-semibold
                       text-dark-ink text-sm relative"
          >
            {currentDialogue}
            {/* Speech bubble tail */}
            <div
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0 h-0"
              style={{
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: '12px solid #2D2D44',
              }}
            />
            <div
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0"
              style={{
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: '10px solid white',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Character with animation */}
      <motion.div
        style={{ width: size, height: size * 1.2 }}
        animate={
          isExcited
            ? { y: [0, -12, 0, -8, 0], rotate: [-3, 3, -3, 3, 0] }
            : state === 'sleeping'
            ? { y: [0, 2, 0] }
            : { y: [0, -6, 0] }
        }
        transition={
          isExcited
            ? { duration: 0.6, repeat: 2, ease: 'easeInOut' }
            : {
                duration: state === 'sleeping' ? 3 : 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }
        }
      >
        <FoxFace state={state} />
      </motion.div>
    </div>
  );
};

export default MascotCharacter;
