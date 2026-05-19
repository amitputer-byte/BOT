import React from 'react';
import { motion } from 'framer-motion';

interface BossCharacterProps {
  worldId: number;
}

const BOSS_DATA: Record<number, { emoji: string; name: string; taunt: string }> = {
  1: {
    emoji: '🐺',
    name: 'זאב הכפלים',
    taunt: 'האם אתה מוכן לאתגר? אני אנצח אותך!',
  },
  2: {
    emoji: '🦈',
    name: 'כריש הים',
    taunt: 'גלים גדולים לא מפחידים אותי! ואותך?',
  },
  3: {
    emoji: '🦇',
    name: 'ראש המערה',
    taunt: 'החושך לא ייבהל אותי — אבל האם הכפל יבהיל אותך?',
  },
  4: {
    emoji: '🐉',
    name: 'דרקון האש',
    taunt: 'האש שלי חמה כמו הכפל! האם אתה חזק מספיק?',
  },
  5: {
    emoji: '👑',
    name: 'מלך הכפלים',
    taunt: 'רק אלוף אמיתי יכול לנצח אותי! האם זה אתה?',
  },
};

export const BossCharacter: React.FC<BossCharacterProps> = ({ worldId }) => {
  const boss = BOSS_DATA[worldId] ?? BOSS_DATA[1];

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Boss emoji — big, animated */}
      <motion.div
        animate={{ y: [0, -10, 0], rotate: [-3, 3, -3] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="text-7xl select-none"
        aria-hidden="true"
      >
        {boss.emoji}
      </motion.div>

      {/* Boss name */}
      <div className="font-fredoka font-bold text-2xl text-dark-ink">{boss.name}</div>

      {/* Speech bubble taunt */}
      <div className="relative bg-white border-3 border-dark-ink rounded-2xl shadow-comic px-5 py-3 max-w-[260px] text-center">
        <p className="font-fredoka text-dark-ink text-sm leading-snug">{boss.taunt}</p>
        {/* bubble tail pointing up toward boss */}
        <div
          className="absolute -top-4 left-1/2 -translate-x-1/2 w-0 h-0"
          style={{
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: '14px solid #2D2D44',
          }}
        />
        <div
          className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-0 h-0"
          style={{
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderBottom: '12px solid white',
          }}
        />
      </div>
    </div>
  );
};

export default BossCharacter;
