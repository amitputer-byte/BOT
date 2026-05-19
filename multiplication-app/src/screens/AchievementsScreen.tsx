import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfileStore } from '../store/profileStore';
import { useProgressStore } from '../store/progressStore';
import { ACHIEVEMENTS } from '../lib/achievements';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { AchievementCard } from '../components/achievements/AchievementCard';
import { StatBar } from '../components/achievements/StatBar';
import { CertificateCard } from '../components/achievements/CertificateCard';
import { BackgroundDecoration } from '../components/layout/BackgroundDecoration';

// ─── Tab definitions ──────────────────────────────────────────────────────────

type Tab = 'medals' | 'stats' | 'certs';

const TABS: { id: Tab; label: string }[] = [
  { id: 'medals', label: 'מדליות' },
  { id: 'stats',  label: 'סטטיסטיקות' },
  { id: 'certs',  label: 'תעודות' },
];

// ─── Stagger helpers ──────────────────────────────────────────────────────────

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'tween', duration: 0.25 } },
};

// ─── Tab content panels ───────────────────────────────────────────────────────

const panelVariants = {
  enter: { opacity: 0, x: -18 },
  center: { opacity: 1, x: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit:  { opacity: 0, x: 18, transition: { duration: 0.18, ease: 'easeIn' } },
};

// ─── Medals tab ───────────────────────────────────────────────────────────────

interface MedalsTabProps {
  unlockedIds: Set<string>;
}

const MedalsTab: React.FC<MedalsTabProps> = ({ unlockedIds }) => {
  const total = ACHIEVEMENTS.length;
  const unlockedCount = unlockedIds.size;
  const unlocked = ACHIEVEMENTS.filter((a) => unlockedIds.has(a.id));
  const locked   = ACHIEVEMENTS.filter((a) => !unlockedIds.has(a.id));

  return (
    <div>
      {/* Progress counter */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="font-fredoka font-bold text-dark-ink text-base">
            {unlockedCount} מתוך {total} הישגים
          </span>
          <span className="font-fredoka text-sm text-dark-ink/60">
            {Math.round((unlockedCount / total) * 100)}%
          </span>
        </div>
        <div className="w-full bg-white border-2 border-dark-ink/20 rounded-full h-3 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-l from-secondary to-success rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(unlockedCount / total) * 100}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Unlocked section */}
      {unlocked.length > 0 && (
        <>
          <h2 className="text-base font-bold text-dark-ink font-fredoka mb-2">
            ✅ הישגים שלי
          </h2>
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-3 mb-5"
          >
            {unlocked.map((a) => (
              <motion.div key={a.id} variants={itemVariants}>
                <AchievementCard achievement={a} isUnlocked />
              </motion.div>
            ))}
          </motion.div>
        </>
      )}

      {/* Locked section */}
      {locked.length > 0 && (
        <>
          <h2 className="text-base font-bold text-dark-ink font-fredoka mb-2">
            🔒 עוד להשיג
          </h2>
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-3"
          >
            {locked.map((a) => (
              <motion.div key={a.id} variants={itemVariants}>
                <AchievementCard achievement={a} isUnlocked={false} />
              </motion.div>
            ))}
          </motion.div>
        </>
      )}
    </div>
  );
};

// ─── Stats tab ────────────────────────────────────────────────────────────────

interface StatsTabProps {
  profileId: string;
}

const TABLES = [2, 3, 4, 5, 6, 7, 8, 9, 10];

const StatsTab: React.FC<StatsTabProps> = ({ profileId }) => {
  const getProgress       = useProgressStore((s) => s.getProgress);
  const getMasteredTables = useProgressStore((s) => s.getMasteredTables);
  const getOverallAccuracy = useProgressStore((s) => s.getOverallAccuracy);
  const getBestStreak     = useProgressStore((s) => s.getBestStreak);

  const p = getProgress(profileId);
  const overallAcc = getOverallAccuracy(profileId);
  const bestStreak = getBestStreak(profileId);

  // Best / worst table (min 5 attempts)
  const qualified = TABLES.filter((t) => (p.byTable[t]?.attempted ?? 0) >= 5);
  const bestTable = qualified.length
    ? qualified.reduce((best, t) => {
        const accB = p.byTable[best] ? p.byTable[best].correct / p.byTable[best].attempted : 0;
        const accT = p.byTable[t]   ? p.byTable[t].correct   / p.byTable[t].attempted   : 0;
        return accT > accB ? t : best;
      })
    : null;
  const worstTable = qualified.length
    ? qualified.reduce((worst, t) => {
        const accW = p.byTable[worst] ? p.byTable[worst].correct / p.byTable[worst].attempted : 1;
        const accT = p.byTable[t]    ? p.byTable[t].correct    / p.byTable[t].attempted    : 1;
        return accT < accW ? t : worst;
      })
    : null;

  const masteredCount = getMasteredTables(profileId).length;

  const statCards = [
    { label: 'סה"כ תרגילים',  value: String(p.totalAttempted) },
    { label: 'תשובות נכונות', value: String(p.totalCorrect) },
    { label: 'דיוק כללי',     value: p.totalAttempted > 0 ? `${overallAcc}%` : '—' },
    { label: 'שיא רצף',       value: String(bestStreak) },
  ];

  return (
    <div>
      {/* 2×2 stat grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {statCards.map(({ label, value }) => (
          <Card key={label} padding="sm" className="flex flex-col items-center gap-1 text-center">
            <span className="font-fredoka font-bold text-2xl text-dark-ink">{value}</span>
            <span className="font-fredoka text-xs text-dark-ink/60">{label}</span>
          </Card>
        ))}
      </div>

      {/* Bar chart */}
      <h2 className="text-base font-bold text-dark-ink font-fredoka mb-3">
        📊 דיוק לפי לוח
      </h2>
      <Card padding="sm" className="mb-5">
        <div className="flex gap-1 items-end pt-2" style={{ minHeight: 160 }}>
          {TABLES.map((t) => (
            <StatBar
              key={t}
              table={t}
              correct={p.byTable[t]?.correct ?? 0}
              attempted={p.byTable[t]?.attempted ?? 0}
              maxHeight={120}
            />
          ))}
        </div>
      </Card>

      {/* Additional stats */}
      <h2 className="text-base font-bold text-dark-ink font-fredoka mb-3">
        📈 פרטים נוספים
      </h2>
      <motion.div
        variants={listVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-2"
      >
        {[
          {
            icon: '🔥',
            label: 'ימי משחק ברצף',
            value: `${p.dailyStreak} ימים`,
          },
          {
            icon: '🏆',
            label: 'לוחות שנשלטו',
            value: `${masteredCount} מתוך 9`,
          },
          {
            icon: '⭐',
            label: 'לוח הכי חזק',
            value: bestTable ? `×${bestTable}` : 'עוד לא מספיק נסיונות',
          },
          {
            icon: '📚',
            label: 'לוח שצריך תרגול',
            value: worstTable ? `×${worstTable}` : 'עוד לא מספיק נסיונות',
          },
          {
            icon: '🗺️',
            label: 'התקדמות בהרפתקה',
            value: `שלב ${p.adventureProgress.currentLevel} מתוך 15`,
          },
        ].map(({ icon, label, value }) => (
          <motion.div key={label} variants={itemVariants}>
            <Card padding="sm" className="flex items-center gap-3">
              <span className="text-2xl">{icon}</span>
              <span className="flex-1 font-fredoka text-dark-ink text-sm">{label}</span>
              <span className="font-fredoka font-bold text-dark-ink text-sm">{value}</span>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

// ─── Certificates tab ─────────────────────────────────────────────────────────

interface CertsTabProps {
  profileId: string;
  profileName: string;
}

const CertsTab: React.FC<CertsTabProps> = ({ profileId, profileName }) => {
  const getProgress = useProgressStore((s) => s.getProgress);
  const p = getProgress(profileId);

  const masteredCount = TABLES.filter((t) => {
    const entry = p.byTable[t];
    return entry && entry.attempted >= 10 && entry.correct / entry.attempted >= 0.9;
  }).length;

  return (
    <div>
      {/* Header summary */}
      <div className="mb-4 text-center">
        <p className="font-fredoka text-dark-ink/70 text-sm">
          {masteredCount} מתוך 9 לוחות הושלמו
        </p>
      </div>

      <motion.div
        variants={listVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-4"
      >
        {TABLES.map((t) => {
          const entry = p.byTable[t];
          const attempted = entry?.attempted ?? 0;
          const correct   = entry?.correct   ?? 0;
          const accuracy  = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
          const isUnlocked = attempted >= 10 && accuracy >= 90;

          return (
            <motion.div key={t} variants={itemVariants}>
              <CertificateCard
                table={t}
                profileName={profileName}
                accuracy={accuracy}
                isUnlocked={isUnlocked}
              />
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};

// ─── Main screen ──────────────────────────────────────────────────────────────

export const AchievementsScreen: React.FC = () => {
  const navigate = useNavigate();
  const getActiveProfile = useProfileStore((s) => s.getActiveProfile);
  const getProgress      = useProgressStore((s) => s.getProgress);

  const [activeTab, setActiveTab] = useState<Tab>('medals');

  const profile = getActiveProfile();
  if (!profile) {
    navigate('/');
    return null;
  }

  const progress    = getProgress(profile.id);
  const unlockedIds = new Set(progress.achievements);

  return (
    <div className="relative min-h-screen bg-bg overflow-hidden">
      <BackgroundDecoration />

      <div className="relative z-10 max-w-md mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/home')}
            className="text-sm py-1 px-3 min-h-[36px]"
          >
            ← חזרה
          </Button>
          <h1 className="text-2xl font-bold text-dark-ink font-fredoka">🏆 הישגים</h1>
          <div className="w-16" />
        </div>

        {/* Tab bar */}
        <div className="relative mb-5">
          <div className="flex border-b-2 border-dark-ink/10">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'relative flex-1 py-2 font-fredoka font-semibold text-base transition-colors duration-150',
                  activeTab === tab.id
                    ? 'text-dark-ink'
                    : 'text-dark-ink/40 hover:text-dark-ink/70',
                ].join(' ')}
              >
                {tab.label}

                {/* Animated sliding underline */}
                {activeTab === tab.id && (
                  <motion.span
                    layoutId="tab-underline"
                    className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full bg-primary"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab panels with AnimatePresence */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={panelVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            {activeTab === 'medals' && (
              <MedalsTab unlockedIds={unlockedIds} />
            )}
            {activeTab === 'stats' && (
              <StatsTab profileId={profile.id} />
            )}
            {activeTab === 'certs' && (
              <CertsTab profileId={profile.id} profileName={profile.name} />
            )}
          </motion.div>
        </AnimatePresence>

        <div className="h-8" />
      </div>
    </div>
  );
};

export default AchievementsScreen;
