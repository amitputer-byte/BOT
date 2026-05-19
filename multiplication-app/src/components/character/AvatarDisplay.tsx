import React from 'react';
import type { AvatarId } from '../../types';

interface AvatarDisplayProps {
  id: AvatarId;
  size?: number;
}

// ─── Individual SVG Avatars ───────────────────────────────────────────────────

const FoxAvatar: React.FC<{ s: number }> = ({ s }) => (
  <svg width={s} height={s} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Ears */}
    <polygon points="15,45 28,10 42,45" fill="#E8631A" stroke="#2D2D44" strokeWidth="2.5" strokeLinejoin="round" />
    <polygon points="58,45 72,10 85,45" fill="#E8631A" stroke="#2D2D44" strokeWidth="2.5" strokeLinejoin="round" />
    {/* Inner ears */}
    <polygon points="20,43 29,18 38,43" fill="#F4A261" />
    <polygon points="62,43 71,18 80,43" fill="#F4A261" />
    {/* Head */}
    <ellipse cx="50" cy="60" rx="35" ry="30" fill="#E8631A" stroke="#2D2D44" strokeWidth="2.5" />
    {/* Face white patch */}
    <ellipse cx="50" cy="68" rx="22" ry="18" fill="#FFF5E4" />
    {/* Eyes */}
    <ellipse cx="37" cy="52" rx="6" ry="6.5" fill="white" stroke="#2D2D44" strokeWidth="2" />
    <ellipse cx="63" cy="52" rx="6" ry="6.5" fill="white" stroke="#2D2D44" strokeWidth="2" />
    <circle cx="38.5" cy="53" r="3.5" fill="#2D2D44" />
    <circle cx="64.5" cy="53" r="3.5" fill="#2D2D44" />
    <circle cx="39.5" cy="51.5" r="1.2" fill="white" />
    <circle cx="65.5" cy="51.5" r="1.2" fill="white" />
    {/* Nose */}
    <ellipse cx="50" cy="66" rx="4" ry="2.5" fill="#2D2D44" />
    {/* Mouth */}
    <path d="M45 70 Q50 75 55 70" stroke="#2D2D44" strokeWidth="2" fill="none" strokeLinecap="round" />
    {/* Cheeks */}
    <ellipse cx="31" cy="63" rx="7" ry="4" fill="#F4826A" opacity="0.5" />
    <ellipse cx="69" cy="63" rx="7" ry="4" fill="#F4826A" opacity="0.5" />
  </svg>
);

const CatAvatar: React.FC<{ s: number }> = ({ s }) => (
  <svg width={s} height={s} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Ears */}
    <polygon points="20,50 28,20 44,48" fill="#9B9BA4" stroke="#2D2D44" strokeWidth="2.5" strokeLinejoin="round" />
    <polygon points="56,48 72,20 80,50" fill="#9B9BA4" stroke="#2D2D44" strokeWidth="2.5" strokeLinejoin="round" />
    <polygon points="25,47 29,25 40,46" fill="#D4A0A0" />
    <polygon points="60,46 71,25 75,47" fill="#D4A0A0" />
    {/* Head */}
    <ellipse cx="50" cy="60" rx="34" ry="29" fill="#B0B0BA" stroke="#2D2D44" strokeWidth="2.5" />
    {/* Face white */}
    <ellipse cx="50" cy="67" rx="20" ry="16" fill="#E8E8F0" />
    {/* Eyes */}
    <ellipse cx="37" cy="53" rx="6" ry="7" fill="#90EE90" stroke="#2D2D44" strokeWidth="2" />
    <ellipse cx="63" cy="53" rx="6" ry="7" fill="#90EE90" stroke="#2D2D44" strokeWidth="2" />
    <ellipse cx="37" cy="53" rx="2.5" ry="5.5" fill="#2D2D44" />
    <ellipse cx="63" cy="53" rx="2.5" ry="5.5" fill="#2D2D44" />
    <circle cx="36.5" cy="50" r="1.2" fill="white" />
    <circle cx="62.5" cy="50" r="1.2" fill="white" />
    {/* Nose */}
    <polygon points="50,64 47,68 53,68" fill="#FF9999" stroke="#2D2D44" strokeWidth="1.5" />
    {/* Mouth */}
    <path d="M47 68 Q50 73 53 68" stroke="#2D2D44" strokeWidth="1.5" fill="none" />
    {/* Whiskers */}
    <line x1="20" y1="65" x2="44" y2="67" stroke="#2D2D44" strokeWidth="1.5" opacity="0.5" />
    <line x1="20" y1="69" x2="44" y2="69" stroke="#2D2D44" strokeWidth="1.5" opacity="0.5" />
    <line x1="56" y1="67" x2="80" y2="65" stroke="#2D2D44" strokeWidth="1.5" opacity="0.5" />
    <line x1="56" y1="69" x2="80" y2="69" stroke="#2D2D44" strokeWidth="1.5" opacity="0.5" />
    {/* Cheeks */}
    <ellipse cx="31" cy="64" rx="6" ry="3.5" fill="#FFB6C1" opacity="0.5" />
    <ellipse cx="69" cy="64" rx="6" ry="3.5" fill="#FFB6C1" opacity="0.5" />
  </svg>
);

const BearAvatar: React.FC<{ s: number }> = ({ s }) => (
  <svg width={s} height={s} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Ears */}
    <circle cx="24" cy="36" r="13" fill="#8B5E3C" stroke="#2D2D44" strokeWidth="2.5" />
    <circle cx="76" cy="36" r="13" fill="#8B5E3C" stroke="#2D2D44" strokeWidth="2.5" />
    <circle cx="24" cy="36" r="7" fill="#C48B5E" />
    <circle cx="76" cy="36" r="7" fill="#C48B5E" />
    {/* Head */}
    <ellipse cx="50" cy="62" rx="36" ry="31" fill="#8B5E3C" stroke="#2D2D44" strokeWidth="2.5" />
    {/* Muzzle */}
    <ellipse cx="50" cy="72" rx="17" ry="12" fill="#C48B5E" />
    {/* Eyes */}
    <ellipse cx="37" cy="54" rx="6" ry="6.5" fill="white" stroke="#2D2D44" strokeWidth="2" />
    <ellipse cx="63" cy="54" rx="6" ry="6.5" fill="white" stroke="#2D2D44" strokeWidth="2" />
    <circle cx="38" cy="55" r="3.5" fill="#2D2D44" />
    <circle cx="64" cy="55" r="3.5" fill="#2D2D44" />
    <circle cx="39" cy="53.5" r="1.2" fill="white" />
    <circle cx="65" cy="53.5" r="1.2" fill="white" />
    {/* Nose */}
    <ellipse cx="50" cy="68" rx="5" ry="3.5" fill="#2D2D44" />
    {/* Mouth */}
    <path d="M44 73 Q50 79 56 73" stroke="#2D2D44" strokeWidth="2" fill="none" strokeLinecap="round" />
    {/* Cheeks */}
    <ellipse cx="31" cy="66" rx="7" ry="4" fill="#E07060" opacity="0.4" />
    <ellipse cx="69" cy="66" rx="7" ry="4" fill="#E07060" opacity="0.4" />
  </svg>
);

const RabbitAvatar: React.FC<{ s: number }> = ({ s }) => (
  <svg width={s} height={s} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Long ears */}
    <ellipse cx="34" cy="24" rx="9" ry="22" fill="#F0B4C8" stroke="#2D2D44" strokeWidth="2.5" />
    <ellipse cx="66" cy="24" rx="9" ry="22" fill="#F0B4C8" stroke="#2D2D44" strokeWidth="2.5" />
    <ellipse cx="34" cy="24" rx="5" ry="17" fill="#FFD6E3" />
    <ellipse cx="66" cy="24" rx="5" ry="17" fill="#FFD6E3" />
    {/* Head */}
    <ellipse cx="50" cy="63" rx="33" ry="29" fill="#F0B4C8" stroke="#2D2D44" strokeWidth="2.5" />
    {/* Face white */}
    <ellipse cx="50" cy="70" rx="21" ry="17" fill="#FFF0F5" />
    {/* Eyes */}
    <ellipse cx="37" cy="55" rx="6" ry="6.5" fill="#FFB3CC" stroke="#2D2D44" strokeWidth="2" />
    <ellipse cx="63" cy="55" rx="6" ry="6.5" fill="#FFB3CC" stroke="#2D2D44" strokeWidth="2" />
    <circle cx="38" cy="56" r="3.5" fill="#2D2D44" />
    <circle cx="64" cy="56" r="3.5" fill="#2D2D44" />
    <circle cx="39" cy="54.5" r="1.2" fill="white" />
    <circle cx="65" cy="54.5" r="1.2" fill="white" />
    {/* Nose */}
    <ellipse cx="50" cy="68" rx="3.5" ry="2.5" fill="#FF6B8A" />
    {/* Mouth */}
    <path d="M46 71 Q50 76 54 71" stroke="#2D2D44" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    {/* Cheeks */}
    <ellipse cx="30" cy="65" rx="6.5" ry="4" fill="#FF99B8" opacity="0.5" />
    <ellipse cx="70" cy="65" rx="6.5" ry="4" fill="#FF99B8" opacity="0.5" />
  </svg>
);

const OwlAvatar: React.FC<{ s: number }> = ({ s }) => (
  <svg width={s} height={s} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Ear tufts */}
    <polygon points="30,40 36,15 44,40" fill="#7B4FA6" stroke="#2D2D44" strokeWidth="2" strokeLinejoin="round" />
    <polygon points="56,40 64,15 70,40" fill="#7B4FA6" stroke="#2D2D44" strokeWidth="2" strokeLinejoin="round" />
    {/* Head */}
    <ellipse cx="50" cy="60" rx="35" ry="32" fill="#7B4FA6" stroke="#2D2D44" strokeWidth="2.5" />
    {/* Face disc */}
    <ellipse cx="50" cy="60" rx="27" ry="25" fill="#B388CC" />
    {/* Eye whites (large) */}
    <circle cx="37" cy="54" r="11" fill="white" stroke="#2D2D44" strokeWidth="2.5" />
    <circle cx="63" cy="54" r="11" fill="white" stroke="#2D2D44" strokeWidth="2.5" />
    {/* Iris */}
    <circle cx="37" cy="54" r="7" fill="#F5D042" />
    <circle cx="63" cy="54" r="7" fill="#F5D042" />
    {/* Pupil */}
    <circle cx="37" cy="54" r="4" fill="#2D2D44" />
    <circle cx="63" cy="54" r="4" fill="#2D2D44" />
    <circle cx="38.5" cy="52" r="1.5" fill="white" />
    <circle cx="64.5" cy="52" r="1.5" fill="white" />
    {/* Beak */}
    <polygon points="50,64 46,72 54,72" fill="#F5A623" stroke="#2D2D44" strokeWidth="1.5" />
    {/* Cheeks */}
    <ellipse cx="25" cy="65" rx="6" ry="4" fill="#9B6EC5" opacity="0.5" />
    <ellipse cx="75" cy="65" rx="6" ry="4" fill="#9B6EC5" opacity="0.5" />
  </svg>
);

const PenguinAvatar: React.FC<{ s: number }> = ({ s }) => (
  <svg width={s} height={s} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Head */}
    <ellipse cx="50" cy="55" rx="35" ry="34" fill="#2D2D44" stroke="#2D2D44" strokeWidth="2.5" />
    {/* White face */}
    <ellipse cx="50" cy="60" rx="24" ry="26" fill="white" />
    {/* Eyes */}
    <circle cx="38" cy="50" r="8" fill="white" stroke="#2D2D44" strokeWidth="2" />
    <circle cx="62" cy="50" r="8" fill="white" stroke="#2D2D44" strokeWidth="2" />
    <circle cx="39" cy="50" r="4.5" fill="#2D2D44" />
    <circle cx="63" cy="50" r="4.5" fill="#2D2D44" />
    <circle cx="38" cy="48.5" r="1.8" fill="white" />
    <circle cx="62" cy="48.5" r="1.8" fill="white" />
    {/* Beak */}
    <polygon points="50,61 46,67 54,67" fill="#F5A623" stroke="#2D2D44" strokeWidth="1.5" />
    {/* Belly patch */}
    <ellipse cx="50" cy="76" rx="16" ry="11" fill="#FFFDE7" />
    {/* Blush */}
    <ellipse cx="30" cy="62" rx="6" ry="3.5" fill="#FFB3C1" opacity="0.6" />
    <ellipse cx="70" cy="62" rx="6" ry="3.5" fill="#FFB3C1" opacity="0.6" />
  </svg>
);

const DragonAvatar: React.FC<{ s: number }> = ({ s }) => (
  <svg width={s} height={s} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Horns */}
    <polygon points="30,45 33,15 42,44" fill="#2EA844" stroke="#2D2D44" strokeWidth="2" strokeLinejoin="round" />
    <polygon points="58,44 67,15 70,45" fill="#2EA844" stroke="#2D2D44" strokeWidth="2" strokeLinejoin="round" />
    <polygon points="32,43 34,22 40,43" fill="#52C870" />
    <polygon points="60,43 66,22 68,43" fill="#52C870" />
    {/* Head */}
    <ellipse cx="50" cy="62" rx="35" ry="30" fill="#2EA844" stroke="#2D2D44" strokeWidth="2.5" />
    {/* Scales ridge */}
    <circle cx="50" cy="33" r="4" fill="#52C870" stroke="#2D2D44" strokeWidth="1.5" />
    {/* Muzzle */}
    <ellipse cx="50" cy="72" rx="18" ry="13" fill="#52C870" />
    {/* Eyes */}
    <ellipse cx="37" cy="54" rx="6.5" ry="7" fill="#F5D042" stroke="#2D2D44" strokeWidth="2" />
    <ellipse cx="63" cy="54" rx="6.5" ry="7" fill="#F5D042" stroke="#2D2D44" strokeWidth="2" />
    <ellipse cx="37" cy="54" rx="2.5" ry="5.5" fill="#2D2D44" />
    <ellipse cx="63" cy="54" rx="2.5" ry="5.5" fill="#2D2D44" />
    <circle cx="36.5" cy="51" r="1.3" fill="white" />
    <circle cx="62.5" cy="51" r="1.3" fill="white" />
    {/* Nostril */}
    <circle cx="46" cy="70" r="2.5" fill="#2D2D44" opacity="0.5" />
    <circle cx="54" cy="70" r="2.5" fill="#2D2D44" opacity="0.5" />
    {/* Mouth */}
    <path d="M40 76 Q50 83 60 76" stroke="#2D2D44" strokeWidth="2" fill="none" strokeLinecap="round" />
    {/* Cheeks */}
    <ellipse cx="28" cy="65" rx="7" ry="4" fill="#52C870" opacity="0.5" />
    <ellipse cx="72" cy="65" rx="7" ry="4" fill="#52C870" opacity="0.5" />
  </svg>
);

const UnicornAvatar: React.FC<{ s: number }> = ({ s }) => (
  <svg width={s} height={s} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Horn */}
    <polygon points="50,5 44,38 56,38" fill="url(#hornGrad)" stroke="#2D2D44" strokeWidth="2" strokeLinejoin="round" />
    <defs>
      <linearGradient id="hornGrad" x1="50" y1="5" x2="50" y2="38" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FF6FCF" />
        <stop offset="50%" stopColor="#A78BFA" />
        <stop offset="100%" stopColor="#60D4F0" />
      </linearGradient>
    </defs>
    {/* Horn stripes */}
    <line x1="47" y1="20" x2="53" y2="22" stroke="white" strokeWidth="1.5" opacity="0.7" />
    <line x1="46" y1="28" x2="54" y2="30" stroke="white" strokeWidth="1.5" opacity="0.7" />
    {/* Ears */}
    <polygon points="22,52 30,28 42,50" fill="#F8C8E8" stroke="#2D2D44" strokeWidth="2" strokeLinejoin="round" />
    <polygon points="58,50 70,28 78,52" fill="#F8C8E8" stroke="#2D2D44" strokeWidth="2" strokeLinejoin="round" />
    <polygon points="26,50 30,33 39,49" fill="#FFD6F0" />
    <polygon points="61,49 70,33 74,50" fill="#FFD6F0" />
    {/* Head */}
    <ellipse cx="50" cy="63" rx="34" ry="30" fill="#FFF0F8" stroke="#2D2D44" strokeWidth="2.5" />
    {/* Eyes */}
    <ellipse cx="37" cy="55" rx="6.5" ry="7" fill="white" stroke="#2D2D44" strokeWidth="2" />
    <ellipse cx="63" cy="55" rx="6.5" ry="7" fill="white" stroke="#2D2D44" strokeWidth="2" />
    <circle cx="37.5" cy="55.5" r="4" fill="#7B5EA7" />
    <circle cx="63.5" cy="55.5" r="4" fill="#7B5EA7" />
    <circle cx="36.5" cy="53.5" r="1.5" fill="white" />
    <circle cx="62.5" cy="53.5" r="1.5" fill="white" />
    {/* Eyelashes */}
    <line x1="31" y1="50" x2="33" y2="48" stroke="#2D2D44" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="37" y1="48" x2="37" y2="46" stroke="#2D2D44" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="43" y1="50" x2="45" y2="48" stroke="#2D2D44" strokeWidth="1.5" strokeLinecap="round" />
    {/* Nose */}
    <ellipse cx="50" cy="69" rx="3.5" ry="2.5" fill="#FFB3D6" />
    {/* Mouth */}
    <path d="M45 73 Q50 78 55 73" stroke="#2D2D44" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    {/* Rainbow cheeks */}
    <ellipse cx="28" cy="65" rx="7.5" ry="4.5" fill="#FFB3D6" opacity="0.6" />
    <ellipse cx="72" cy="65" rx="7.5" ry="4.5" fill="#FFB3D6" opacity="0.6" />
  </svg>
);

// ─── AvatarDisplay ────────────────────────────────────────────────────────────

const avatarMap: Record<AvatarId, React.FC<{ s: number }>> = {
  fox: FoxAvatar,
  cat: CatAvatar,
  bear: BearAvatar,
  rabbit: RabbitAvatar,
  owl: OwlAvatar,
  penguin: PenguinAvatar,
  dragon: DragonAvatar,
  unicorn: UnicornAvatar,
};

export const AvatarDisplay: React.FC<AvatarDisplayProps> = ({ id, size = 60 }) => {
  const AvatarComponent = avatarMap[id] ?? FoxAvatar;
  return <AvatarComponent s={size} />;
};

export default AvatarDisplay;
