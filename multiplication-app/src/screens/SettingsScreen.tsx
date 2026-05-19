import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore } from '../store/settingsStore';
import { useProfileStore } from '../store/profileStore';
import { useProgressStore } from '../store/progressStore';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { AvatarDisplay } from '../components/character/AvatarDisplay';
import { BackgroundDecoration } from '../components/layout/BackgroundDecoration';
import type { AvatarId } from '../types';

// ─── Toggle / Difficulty helpers ──────────────────────────────────────────────

const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: () => void;
  label: string;
  emoji: string;
}> = ({ checked, onChange, label, emoji }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <span className="text-2xl">{emoji}</span>
      <span className="font-fredoka font-semibold text-dark-ink text-lg">{label}</span>
    </div>
    <motion.button
      onClick={onChange}
      className={[
        'relative w-14 h-7 rounded-full border-3 border-dark-ink transition-colors',
        checked ? 'bg-success' : 'bg-gray-200',
      ].join(' ')}
      aria-label={label}
    >
      <motion.div
        className="absolute top-0.5 w-5 h-5 bg-white rounded-full border-2 border-dark-ink shadow-sm"
        animate={{ x: checked ? 28 : 2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      />
    </motion.button>
  </div>
);

const DifficultyButton: React.FC<{
  value: 'easy' | 'medium' | 'hard';
  current: 'easy' | 'medium' | 'hard';
  label: string;
  emoji: string;
  onClick: () => void;
}> = ({ value, current, label, emoji, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={[
      'flex-1 flex flex-col items-center py-3 rounded-xl border-3 border-dark-ink',
      'font-fredoka font-semibold transition-all cursor-pointer',
      current === value
        ? 'bg-secondary text-white shadow-comic'
        : 'bg-white text-dark-ink hover:bg-secondary/10',
    ].join(' ')}
  >
    <span className="text-2xl mb-1">{emoji}</span>
    <span className="text-sm">{label}</span>
  </motion.button>
);

// ─── Edit Name Modal ──────────────────────────────────────────────────────────

interface EditNameModalProps {
  profileId: string;
  currentName: string;
  isOpen: boolean;
  onClose: () => void;
}

const EditNameModal: React.FC<EditNameModalProps> = ({
  profileId,
  currentName,
  isOpen,
  onClose,
}) => {
  const [name, setName] = useState(currentName);
  const updateProfile = useProfileStore((s) => s.updateProfile);

  const handleSave = () => {
    if (!name.trim()) return;
    updateProfile(profileId, { name: name.trim() });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="עריכת שם">
      <div className="mb-4">
        <label className="block text-dark-ink font-semibold mb-2 font-fredoka">
          שם חדש:
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 12))}
          maxLength={12}
          dir="rtl"
          autoFocus
          className="w-full border-3 border-dark-ink rounded-xl px-4 py-3
                     font-fredoka text-xl bg-white shadow-comic-sm
                     focus:outline-none focus:border-secondary transition-colors"
          onKeyDown={(e) => e.key === 'Enter' && name.trim() && handleSave()}
        />
      </div>
      <div className="flex gap-3">
        <Button variant="ghost" onClick={onClose} className="flex-1">
          ביטול
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={!name.trim()}
          className="flex-1"
        >
          שמור
        </Button>
      </div>
    </Modal>
  );
};

// ─── Add Profile Modal (minimal, reuses same pattern) ─────────────────────────

const AVATAR_OPTIONS: { id: AvatarId; label: string }[] = [
  { id: 'fox',     label: 'שועל' },
  { id: 'cat',     label: 'חתול' },
  { id: 'bear',    label: 'דוב' },
  { id: 'rabbit',  label: 'ארנב' },
  { id: 'owl',     label: 'ינשוף' },
  { id: 'penguin', label: 'פינגווין' },
  { id: 'dragon',  label: 'דרקון' },
  { id: 'unicorn', label: 'חד-קרן' },
];

interface AddProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddProfileModal: React.FC<AddProfileModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarId | null>(null);
  const addProfile = useProfileStore((s) => s.addProfile);
  const initProgress = useProgressStore((s) => s.initProgress);

  const handleClose = () => {
    setName('');
    setSelectedAvatar(null);
    onClose();
  };

  const handleSubmit = () => {
    if (!name.trim() || !selectedAvatar) return;
    const newId = addProfile(name.trim(), selectedAvatar);
    initProgress(newId);
    handleClose();
  };

  const canSubmit = name.trim().length >= 1 && selectedAvatar !== null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="פרופיל חדש">
      <div className="mb-4">
        <label className="block text-dark-ink font-semibold mb-2 font-fredoka">
          מה השם?
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 12))}
          maxLength={12}
          dir="rtl"
          autoFocus
          placeholder="הכנס שם..."
          className="w-full border-3 border-dark-ink rounded-xl px-4 py-3
                     font-fredoka text-xl bg-white shadow-comic-sm
                     focus:outline-none focus:border-secondary transition-colors"
        />
      </div>
      <div className="mb-5">
        <label className="block text-dark-ink font-semibold mb-2 font-fredoka">
          בחר דמות:
        </label>
        <div className="grid grid-cols-4 gap-2">
          {AVATAR_OPTIONS.map((av) => (
            <motion.button
              key={av.id}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.93 }}
              onClick={() => setSelectedAvatar(av.id)}
              className={[
                'flex flex-col items-center p-2 rounded-xl border-3 transition-all cursor-pointer',
                selectedAvatar === av.id
                  ? 'border-secondary bg-secondary/15 shadow-[0_0_10px_2px_rgba(255,215,0,0.5)]'
                  : 'border-dark-ink/25 bg-white hover:border-secondary/60',
              ].join(' ')}
            >
              <AvatarDisplay id={av.id} size={40} />
              <span className="text-xs font-fredoka text-dark-ink mt-1">{av.label}</span>
            </motion.button>
          ))}
        </div>
      </div>
      <div className="flex gap-3">
        <Button variant="ghost" onClick={handleClose} className="flex-1">
          ביטול
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={!canSubmit} className="flex-1">
          הוסף
        </Button>
      </div>
    </Modal>
  );
};

// ─── Delete Profile Modal ─────────────────────────────────────────────────────

interface DeleteProfileModalProps {
  profileName: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteProfileModal: React.FC<DeleteProfileModalProps> = ({
  profileName,
  isOpen,
  onClose,
  onConfirm,
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title={`למחוק את ${profileName}?`}>
    <p className="font-fredoka text-error font-semibold text-center text-lg mb-6">
      כל ההתקדמות תימחק לצמיתות
    </p>
    <div className="flex gap-3">
      <Button variant="ghost" onClick={onClose} className="flex-1">
        ביטול
      </Button>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95, x: 4, y: 4 }}
        onClick={onConfirm}
        className="flex-1 min-h-[44px] px-6 py-2 font-fredoka font-semibold text-lg
                   rounded-2xl border-3 border-dark-ink bg-error text-white shadow-comic
                   cursor-pointer select-none transition-colors hover:bg-red-400"
      >
        מחק
      </motion.button>
    </div>
  </Modal>
);

// ─── Parental Zone ────────────────────────────────────────────────────────────

function generateChallenge() {
  const a = Math.floor(Math.random() * 40) + 10; // 10–49
  const b = Math.floor(Math.random() * 40) + 10; // 10–49
  return { a, b, answer: a + b };
}

const ParentalZone: React.FC = () => {
  const { activeProfileId } = useProfileStore();
  const resetProgress = useProgressStore((s) => s.resetProgress);

  const [challenge] = useState(generateChallenge);
  const [input, setInput] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [wrongAnim, setWrongAnim] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const checkAnswer = () => {
    if (parseInt(input, 10) === challenge.answer) {
      setUnlocked(true);
    } else {
      setWrongAnim(true);
      setTimeout(() => setWrongAnim(false), 600);
      setInput('');
    }
  };

  const handleReset = () => {
    if (!activeProfileId) return;
    resetProgress(activeProfileId);
    setResetDone(true);
  };

  return (
    <Card padding="md">
      <h2 className="text-xl font-bold text-dark-ink font-fredoka mb-3">
        🔒 אזור הורים
      </h2>

      {!unlocked ? (
        <div>
          <p className="font-fredoka text-dark-ink/70 text-sm mb-3">
            ענה נכון על השאלה כדי לפתוח:
          </p>
          <p className="font-fredoka text-2xl font-bold text-center mb-3">
            {challenge.a} + {challenge.b} = ?
          </p>
          <motion.div
            animate={wrongAnim ? { x: [-8, 8, -6, 6, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="flex gap-2"
          >
            <input
              type="number"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 border-3 border-dark-ink rounded-xl px-4 py-2
                         font-fredoka text-xl bg-white shadow-comic-sm text-center
                         focus:outline-none focus:border-secondary"
              onKeyDown={(e) => e.key === 'Enter' && checkAnswer()}
              dir="ltr"
              placeholder="?"
            />
            <Button variant="primary" onClick={checkAnswer}>
              אישור
            </Button>
          </motion.div>
          {wrongAnim && (
            <p className="text-error font-fredoka text-sm mt-2 text-center">
              תשובה שגויה, נסה שוב
            </p>
          )}
        </div>
      ) : (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="font-fredoka text-success font-semibold mb-4 text-center">
              ✅ פתוח!
            </p>
            {!resetDone ? (
              <div className="space-y-2">
                <p className="font-fredoka text-dark-ink/70 text-sm">
                  איפוס מחיקת כל ההתקדמות של הפרופיל הפעיל:
                </p>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96, x: 4, y: 4 }}
                  onClick={handleReset}
                  className="w-full min-h-[44px] px-6 py-2 font-fredoka font-semibold text-lg
                             rounded-2xl border-3 border-dark-ink bg-error text-white shadow-comic
                             cursor-pointer select-none transition-colors hover:bg-red-400"
                >
                  איפוס התקדמות
                </motion.button>
              </div>
            ) : (
              <p className="font-fredoka text-success font-bold text-center">
                ✅ ההתקדמות אופסה
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </Card>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const SettingsScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    soundEnabled, musicEnabled, volume, difficulty,
    toggleSound, toggleMusic, setVolume, setDifficulty,
  } = useSettingsStore();

  const { profiles, deleteProfile } = useProfileStore();

  const [editTarget, setEditTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Memoize profile list so it re-renders on changes
  const profileList = useMemo(() => profiles, [profiles]);

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteProfile(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="relative min-h-screen bg-bg overflow-hidden" dir="rtl">
      <BackgroundDecoration />

      <div className="relative z-10 max-w-md mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/home')}
            className="text-sm py-1 px-3 min-h-[36px]"
          >
            → חזרה
          </Button>
          <h1 className="text-2xl font-bold text-dark-ink font-fredoka">⚙️ הגדרות</h1>
          <div className="w-16" />
        </div>

        {/* ── Profile Management ───────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-4"
        >
          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-dark-ink font-fredoka">👤 ניהול פרופילים</h2>
              {profileList.length < 4 && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAddModal(true)}
                  className="text-sm font-fredoka font-semibold text-secondary border-2
                             border-secondary rounded-xl px-3 py-1 cursor-pointer hover:bg-secondary/10"
                >
                  + הוסף
                </motion.button>
              )}
            </div>

            {profileList.length === 0 ? (
              <p className="font-fredoka text-dark-ink/50 text-center py-2">
                אין פרופילים עדיין
              </p>
            ) : (
              <div className="space-y-3">
                {profileList.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center gap-3 p-2 rounded-xl bg-bg border-2 border-dark-ink/10"
                  >
                    <AvatarDisplay id={profile.avatar} size={40} />
                    <p className="flex-1 font-fredoka font-bold text-dark-ink text-lg truncate">
                      {profile.name}
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setEditTarget({ id: profile.id, name: profile.name })}
                      className="text-xs font-fredoka font-semibold text-dark-ink/60
                                 border-2 border-dark-ink/30 rounded-lg px-2 py-1 cursor-pointer
                                 hover:border-secondary hover:text-secondary"
                    >
                      עריכת שם
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setDeleteTarget({ id: profile.id, name: profile.name })}
                      className="text-xs font-fredoka font-semibold text-error
                                 border-2 border-error/40 rounded-lg px-2 py-1 cursor-pointer
                                 hover:bg-error/10"
                    >
                      מחיקה
                    </motion.button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* ── Sound Settings ───────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4"
        >
          <Card padding="md">
            <h2 className="text-xl font-bold text-dark-ink font-fredoka mb-4">🔊 צלילים</h2>
            <div className="space-y-4">
              <ToggleSwitch
                checked={soundEnabled}
                onChange={toggleSound}
                label="אפקטים קוליים"
                emoji="🔔"
              />
              <ToggleSwitch
                checked={musicEnabled}
                onChange={toggleMusic}
                label="מוזיקה"
                emoji="🎵"
              />
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🔉</span>
                  <span className="font-fredoka font-semibold text-dark-ink text-lg">
                    עוצמת שמע: {Math.round(volume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full accent-secondary h-3 rounded-full"
                  dir="ltr"
                />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ── Difficulty Settings ──────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-4"
        >
          <Card padding="md">
            <h2 className="text-xl font-bold text-dark-ink font-fredoka mb-4">
              🎯 רמת קושי
            </h2>
            <div className="flex gap-3">
              <DifficultyButton
                value="easy"
                current={difficulty}
                label="קל"
                emoji="🌱"
                onClick={() => setDifficulty('easy')}
              />
              <DifficultyButton
                value="medium"
                current={difficulty}
                label="בינוני"
                emoji="⚡"
                onClick={() => setDifficulty('medium')}
              />
              <DifficultyButton
                value="hard"
                current={difficulty}
                label="קשה"
                emoji="🔥"
                onClick={() => setDifficulty('hard')}
              />
            </div>
            <div className="mt-3 p-3 bg-bg rounded-xl border-2 border-dark-ink/10">
              <p className="font-fredoka text-dark-ink/70 text-sm text-center">
                {difficulty === 'easy'
                  ? '🌱 מספרים קטנים (1-5), תשובות ברורות'
                  : difficulty === 'medium'
                  ? '⚡ מספרים עד 7, מסיחים חכמים'
                  : '🔥 כל המספרים עד 10, אתגר אמיתי!'}
              </p>
            </div>
          </Card>
        </motion.div>

        {/* ── Parental Zone ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-4"
        >
          <ParentalZone />
        </motion.div>

        {/* ── About ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card padding="md" className="text-center">
            <p className="font-fredoka text-2xl font-bold text-dark-ink mb-1">כפלי 🦊</p>
            <p className="font-fredoka text-dark-ink/60 text-sm">
              אפליקציית לוח הכפל לילדים
            </p>
            <p className="font-fredoka text-dark-ink/40 text-xs mt-2">
              גרסה 1.0.0 — לומדים כפל בכיף!
            </p>
          </Card>
        </motion.div>

        <div className="h-8" />
      </div>

      {/* ── Modals ─────────────────────────────────────────────── */}
      {editTarget && (
        <EditNameModal
          profileId={editTarget.id}
          currentName={editTarget.name}
          isOpen
          onClose={() => setEditTarget(null)}
        />
      )}

      <AddProfileModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      <DeleteProfileModal
        profileName={deleteTarget?.name ?? ''}
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};

export default SettingsScreen;
