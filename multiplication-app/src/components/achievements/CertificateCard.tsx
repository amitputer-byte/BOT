import React from 'react';
import { motion } from 'framer-motion';

interface CertificateCardProps {
  table: number;
  profileName: string;
  accuracy: number;
  isUnlocked: boolean;
  achievedDate?: string;
}

export const CertificateCard: React.FC<CertificateCardProps> = ({
  table,
  profileName,
  accuracy,
  isUnlocked,
  achievedDate,
}) => {
  const handlePrint = () => {
    // Store the target table so @media print CSS can isolate it
    document.body.setAttribute('data-print-cert', String(table));
    window.print();
    setTimeout(() => {
      document.body.removeAttribute('data-print-cert');
    }, 1500);
  };

  if (!isUnlocked) {
    return (
      <div className="relative rounded-2xl border-3 border-dark-ink/20 p-4 bg-white/40 flex flex-col items-center gap-2 opacity-50 select-none">
        <div className="text-4xl grayscale">🏅</div>
        <div className="text-center">
          <p className="font-bold font-fredoka text-dark-ink/50 text-base">×{table}</p>
          <p className="font-fredoka text-dark-ink/40 text-sm">לוח ×{table} עוד לא הושג</p>
          <p className="font-fredoka text-dark-ink/30 text-xs mt-1">דרוש: 90%+ דיוק, 10+ ניסיונות</p>
        </div>
        <span className="text-2xl">🔒</span>
      </div>
    );
  }

  const dateStr = achievedDate ?? new Date().toLocaleDateString('he-IL');

  return (
    <>
      {/* Certificate — id is used for print targeting */}
      <motion.div
        id={`certificate-${table}`}
        className={`print-certificate print-certificate-${table} relative rounded-2xl overflow-hidden`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        style={{
          background: 'linear-gradient(135deg, #fffdf0 0%, #fff9d6 50%, #fffdf0 100%)',
          border: '4px double #B8860B',
          boxShadow: '0 0 0 2px #FFD700, 0 0 0 6px #B8860B, 4px 4px 16px rgba(0,0,0,0.12)',
        }}
      >
        {/* Inner decorative border */}
        <div
          className="m-2 rounded-xl p-4 flex flex-col items-center gap-2"
          style={{ border: '2px solid #DAA520' }}
        >
          {/* Stars top */}
          <div className="flex gap-2 text-xl">
            <span>⭐</span><span>✨</span><span>⭐</span>
          </div>

          {/* Header */}
          <div className="text-center">
            <h3 className="font-fredoka font-bold text-xl leading-tight" style={{ color: '#B8860B' }}>
              תעודת שליטה
            </h3>
            <p className="text-xs font-fredoka" style={{ color: '#8B6914' }}>
              לוח הכפל
            </p>
          </div>

          <div className="w-full border-t border-yellow-400/60" />

          {/* Recipient */}
          <p className="font-fredoka text-base text-dark-ink text-center">מוענק בגאווה ל</p>
          <p className="font-fredoka font-bold text-2xl text-center" style={{ color: '#B8860B' }}>
            {profileName}
          </p>

          {/* Table number large */}
          <div className="text-center my-1">
            <p className="font-fredoka text-sm text-dark-ink/70">שלט ב</p>
            <div
              className="text-6xl font-bold font-fredoka"
              style={{ color: '#B8860B', textShadow: '2px 2px 0 rgba(0,0,0,0.1)' }}
            >
              ×{table}
            </div>
          </div>

          {/* Accuracy badge */}
          <div
            className="px-3 py-1 rounded-full text-sm font-fredoka font-bold"
            style={{ backgroundColor: '#FFD700', color: '#5B4000', border: '2px solid #B8860B' }}
          >
            דיוק: {accuracy}%
          </div>

          <div className="w-full border-t border-yellow-400/60" />

          {/* Date */}
          <p className="font-fredoka text-xs text-dark-ink/50 text-center">{dateStr}</p>

          {/* Stars bottom */}
          <div className="flex gap-2 text-xl">
            <span>⭐</span><span>🏆</span><span>⭐</span>
          </div>
        </div>
      </motion.div>

      {/* Print button */}
      <motion.button
        onClick={handlePrint}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-full mt-2 py-2 px-4 rounded-xl border-2 border-dark-ink bg-yellow-300 font-fredoka font-semibold text-dark-ink text-sm shadow-comic"
      >
        🖨️ הורד תעודה
      </motion.button>
    </>
  );
};

export default CertificateCard;
