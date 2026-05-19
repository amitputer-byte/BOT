import React from 'react';
import { motion } from 'framer-motion';

interface CloudProps {
  x: number;
  y: number;
  scale: number;
  delay: number;
}

const Cloud: React.FC<CloudProps> = ({ x, y, scale, delay }) => (
  <motion.div
    className="absolute pointer-events-none"
    style={{ left: `${x}%`, top: `${y}%`, transform: `scale(${scale})` }}
    animate={{ y: [0, -8, 0] }}
    transition={{ duration: 6, delay, repeat: Infinity, ease: 'easeInOut' }}
  >
    <svg width="80" height="48" viewBox="0 0 80 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="40" cy="34" rx="30" ry="16" fill="white" />
      <ellipse cx="28" cy="28" rx="18" ry="16" fill="white" />
      <ellipse cx="52" cy="28" rx="16" ry="14" fill="white" />
      <ellipse cx="40" cy="22" rx="14" ry="14" fill="white" />
    </svg>
  </motion.div>
);

interface StarProps {
  x: number;
  y: number;
  delay: number;
  color: string;
  size: number;
}

const Star: React.FC<StarProps> = ({ x, y, delay, color, size }) => (
  <motion.div
    className="absolute pointer-events-none"
    style={{ left: `${x}%`, top: `${y}%` }}
    animate={{ rotate: [0, 360], scale: [1, 1.2, 1] }}
    transition={{ duration: 4 + delay, delay, repeat: Infinity, ease: 'linear' }}
  >
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <polygon
        points="12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9"
        fill={color}
        stroke="#2D2D44"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  </motion.div>
);

interface CircleProps {
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
}

const FloatingCircle: React.FC<CircleProps> = ({ x, y, size, color, delay }) => (
  <motion.div
    className="absolute pointer-events-none rounded-full border-3 border-dark-ink/30"
    style={{
      left: `${x}%`,
      top: `${y}%`,
      width: size,
      height: size,
      backgroundColor: color,
      opacity: 0.35,
    }}
    animate={{ y: [0, -10, 0], x: [0, 4, 0] }}
    transition={{ duration: 5 + delay, delay, repeat: Infinity, ease: 'easeInOut' }}
  />
);

interface NumberFloatProps {
  x: number;
  y: number;
  num: number;
  delay: number;
}

const FloatingNumber: React.FC<NumberFloatProps> = ({ x, y, num, delay }) => (
  <motion.div
    className="absolute pointer-events-none font-fredoka font-bold text-dark-ink/10 select-none"
    style={{ left: `${x}%`, top: `${y}%`, fontSize: '3rem' }}
    animate={{ y: [0, -12, 0], rotate: [-5, 5, -5] }}
    transition={{ duration: 7 + delay, delay, repeat: Infinity, ease: 'easeInOut' }}
  >
    {num}
  </motion.div>
);

interface EquationFloatProps {
  x: number;
  y: number;
  equation: string;
  delay: number;
  rotateDir: number; // 1 or -1
}

const FloatingEquation: React.FC<EquationFloatProps> = ({ x, y, equation, delay, rotateDir }) => (
  <motion.div
    className="absolute pointer-events-none font-fredoka font-bold select-none"
    style={{
      left: `${x}%`,
      top: `${y}%`,
      fontSize: '2.2rem',
      color: '#2D2D44',
      opacity: 0.06,
    }}
    animate={{
      y: [0, rotateDir * -14, 0],
      rotate: [rotateDir * -4, rotateDir * 4, rotateDir * -4],
    }}
    transition={{
      duration: 9 + delay * 1.3,
      delay,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
  >
    {equation}
  </motion.div>
);

export const BackgroundDecoration: React.FC = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Clouds */}
      <Cloud x={5} y={5} scale={1.2} delay={0} />
      <Cloud x={70} y={3} scale={0.9} delay={1.5} />
      <Cloud x={40} y={8} scale={0.7} delay={3} />
      <Cloud x={85} y={15} scale={1} delay={0.8} />
      <Cloud x={20} y={75} scale={0.8} delay={2} />
      <Cloud x={60} y={80} scale={1.1} delay={4} />

      {/* Stars */}
      <Star x={15} y={20} delay={0} color="#FFD93D" size={20} />
      <Star x={80} y={35} delay={1} color="#FF6B9D" size={16} />
      <Star x={50} y={15} delay={2} color="#4ECDC4" size={18} />
      <Star x={92} y={60} delay={0.5} color="#FFD93D" size={14} />
      <Star x={8} y={55} delay={3} color="#6BCB77" size={22} />
      <Star x={35} y={88} delay={1.5} color="#FF6B9D" size={15} />
      <Star x={75} y={88} delay={2.5} color="#4ECDC4" size={17} />
      <Star x={3} y={85} delay={1} color="#FFD93D" size={12} />

      {/* Floating circles */}
      <FloatingCircle x={90} y={5} size={40} color="#FFD93D" delay={0} />
      <FloatingCircle x={2} y={40} size={30} color="#4ECDC4" delay={1} />
      <FloatingCircle x={95} y={75} size={50} color="#FF6B9D" delay={2} />
      <FloatingCircle x={48} y={92} size={25} color="#6BCB77" delay={0.5} />

      {/* Floating numbers */}
      <FloatingNumber x={25} y={30} num={7} delay={0} />
      <FloatingNumber x={65} y={50} num={3} delay={1.2} />
      <FloatingNumber x={10} y={65} num={5} delay={2.4} />
      <FloatingNumber x={82} y={22} num={9} delay={0.7} />
      <FloatingNumber x={45} y={70} num={4} delay={3.1} />
      <FloatingNumber x={72} y={72} num={6} delay={1.8} />

      {/* Floating multiplication equations */}
      <FloatingEquation x={5}  y={10} equation="2×3"  delay={0}   rotateDir={1}  />
      <FloatingEquation x={55} y={6}  equation="5×7"  delay={1.4} rotateDir={-1} />
      <FloatingEquation x={80} y={45} equation="4×8"  delay={2.1} rotateDir={1}  />
      <FloatingEquation x={15} y={45} equation="9×6"  delay={0.6} rotateDir={-1} />
      <FloatingEquation x={38} y={55} equation="3×3"  delay={3.3} rotateDir={1}  />
      <FloatingEquation x={68} y={28} equation="7×8"  delay={1.0} rotateDir={-1} />
      <FloatingEquation x={30} y={80} equation="6×4"  delay={2.7} rotateDir={1}  />
      <FloatingEquation x={85} y={80} equation="2×9"  delay={0.3} rotateDir={-1} />
    </div>
  );
};

export default BackgroundDecoration;
