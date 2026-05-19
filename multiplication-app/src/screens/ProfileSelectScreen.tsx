import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfileStore } from '../store/profileStore';
import { useProgressStore } from '../store/progressStore';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { AvatarDisplay } from '../components/character/AvatarDisplay';
import { BackgroundDecoration } from '../components/layout/BackgroundDecoration';
import { useLongPress } from '../hooks/useLongPress';
import type { AvatarId } from '../types';

// ─── Avatar Options ────────────────────────────────────────────────────────────

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

// ─── New Profile Modal ─────────────────────────────────────────────────────────

interface NewProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const NewProfileModal: React.FC<NewProfileModalProps> = ({ isOpen, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarId | null>(null);
  const addProfile = useProfileStore((s) => s.addProfile);
  const setActiveProfile = useProfileStore((s) => s.setActiveProfile);
  const checkAndUpdateStreak = useProgressStore((s) => s.checkAndUpdateStreak);
  const initProgress = useProgressStore((s) => s.initProgress);

  const handleClose = () => {
    setName('');
    setSelectedAvatar(null);
    onClose();
  };

  const handleSubmit = () => {
    if (!name.trim() || !selectedAvatar) return;
    const newId = addProfile(name.trim(), selectedAvatar);
    setActiveProfile(newId);
    initProgress(newId);
    checkAndUpdateStreak(newId);
    setName('');
    setSelectedAvatar(null);
    onCreated();
  };

  const canSubmit = name.trim().length >= 1 && selectedAvatar !== null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="פרופיל חדש">
      {/* Name input */}
      <div className="mb-5">
        <label className="block text-dark-ink font-semibold mb-2 font-fredoka text-lg">
          מה השם שלך?
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 12))}
          placeholder="כתוב את שמך כאן..."
          maxLength={12}
          dir="rtl"
          autoFocus
          className="w-full border-3 border-dark-ink rounded-xl px-4 py-3
                     font-fredoka text-xl bg-white shadow-comic-sm
                     focus:outline-none focus:border-secondary transition-colors"
          onKeyDown={(e) => e.key === 'Enter' && canSubmit && handleSubmit()}
        />
        <p className="text-xs text-dark-ink/40 font-fredoka mt-1 text-left">
          {name.length}/12
        </p>
      </div>

      {/* Avatar picker */}
      <div className="mb-6">
        <label className="block text-dark-ink font-semibold mb-3 font-fredoka text-lg">
          בחר דמות:
        </label>
        <div className="grid grid-cols-4 gap-2">
          {AVATAR_OPTIONS.map((av) => {
            const isSelected = selectedAvatar === av.id;
            return (
              <motion.button
                key={av.id}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.93 }}
                onClick={() => setSelectedAvatar(av.id)}
                className={[
                  'flex flex-col items-center p-2 rounded-xl border-3 transition-all cursor-pointer',
                  isSelected
                    ? 'border-secondary bg-secondary/15 shadow-[0_0_12px_3px_rgba(255,215,0,0.6)]'
                    : 'border-dark-ink/25 bg-white hover:border-secondary/60',
                ].join(' ')}
                aria-label={av.label}
              >
                <AvatarDisplay id={av.id} size={48} />
                <span className="text-xs font-fredoka text-dark-ink mt-1 leading-tight">
                  {av.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="ghost" onClick={handleClose} className="flex-1">
          ביטול
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex-1 text-xl"
        >
          בוא נשחק! 🚀
        </Button>
      </div>
    </Modal>
  );
};

// ─── Delete Confirmation Modal ─────────────────────────────────────────────────

interface DeleteConfirmModalProps {
  profileName: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  profileName,
  isOpen,
  onClose,
  onConfirm,
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title={`למחוק את הפרופיל של ${profileName}?`}>
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

// ─── Profile Card ──────────────────────────────────────────────────────────────

interface ProfileCardProps {
  id: string;
  name: string;
  avatar: AvatarId;
  totalCorrect: number;
  stars: number;
  index: number;
  onSelect: () => void;
  onLongPress: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  id: _id,
  name,
  avatar,
  totalCorrect,
  stars,
  index,
  onSelect,
  onLongPress,
  onContextMenu,
}) => {
  const level = Math.floor(totalCorrect / 50) + 1;
  const longPressHandlers = useLongPress(onLongPress, 500);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        delay: index * 0.08,
        type: 'spring',
        stiffness: 300,
        damping: 22,
      }}
      style={{ display: 'inline-block' }}
    >
      <motion.button
        whileHover={{ scale: 1.05, y: -4 }}
        whileTap={{ scale: 0.95, x: 4, y: 4 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        onClick={onSelect}
        onContextMenu={onContextMenu}
        {...longPressHandlers}
        className="flex flex-col items-center justify-center
                   w-[150px] h-[180px] rounded-2xl border-3 border-dark-ink
                   bg-white shadow-[6px_6px_0_#FFD700] hover:shadow-[8px_8px_0_#FFD700]
                   cursor-pointer select-none transition-shadow p-3"
        aria-label={`בחר את ${name}`}
      >
        {/* Avatar */}
        <div className="mb-2">
          <AvatarDisplay id={avatar} size={80} />
        </div>

        {/* Name */}
        <p className="font-fredoka font-bold text-dark-ink text-lg leading-tight text-center w-full truncate px-1">
          {name}
        </p>

        {/* Level badge */}
        <div className="mt-1 px-3 py-0.5 bg-secondary rounded-full border-2 border-dark-ink">
          <span className="font-fredoka font-semibold text-white text-sm">
            רמה {level}
          </span>
        </div>

        {/* Stars */}
        <div className="mt-1 flex gap-0.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i} className={`text-lg ${i < stars ? 'text-primary' : 'text-dark-ink/20'}`}>
              ★
            </span>
          ))}
        </div>
      </motion.button>
    </motion.div>
  );
};

// ─── Main Screen ───────────────────────────────────────────────────────────────

export const ProfileSelectScreen: React.FC = () => {
  const navigate = useNavigate();
  const { profiles, setActiveProfile, deleteProfile } = useProfileStore();
  const { checkAndUpdateStreak, getProgress } = useProgressStore();

  const [showNewModal, setShowNewModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleSelectProfile = useCallback(
    (id: string) => {
      setActiveProfile(id);
      checkAndUpdateStreak(id);
      navigate('/home');
    },
    [setActiveProfile, checkAndUpdateStreak, navigate]
  );

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteProfile(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleContextMenu = (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault();
    setDeleteTarget({ id, name });
  };

  // Compute total stars per profile (sum of table stars 0-3 across tables 2-10)
  const getProfileStars = (profileId: string) => {
    const p = getProgress(profileId);
    let total = 0;
    for (let t = 2; t <= 10; t++) {
      const entry = p.byTable[t];
      if (entry && entry.attempted > 0) {
        const acc = entry.correct / entry.attempted;
        if (acc >= 0.9) total += 3;
        else if (acc >= 0.7) total += 2;
        else if (acc >= 0.5) total += 1;
      }
    }
    return Math.min(total, 3); // cap displayed stars at 3 for the card
  };

  return (
    <div
      className="relative min-h-screen bg-bg flex flex-col items-center justify-center p-4"
      dir="rtl"
    >
      <BackgroundDecoration />

      {/* Settings gear — top right */}
      <motion.button
        whileHover={{ scale: 1.15, rotate: 25 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate('/settings')}
        className="absolute top-4 left-4 z-20 text-3xl cursor-pointer"
        aria-label="הגדרות"
      >
        ⚙️
      </motion.button>

      <div className="relative z-10 w-full max-w-lg flex flex-col items-center">
        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-5xl font-bold text-dark-ink font-fredoka drop-shadow-sm mb-2 text-center"
        >
          כפלי! 🦊
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-fredoka text-dark-ink/80 mb-8 text-center"
        >
          מי משחק היום?
        </motion.p>

        {/* Profile grid or empty state */}
        {profiles.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center mb-8 p-8 rounded-2xl border-3 border-dashed border-dark-ink/30 bg-white/60"
          >
            <p className="text-6xl mb-3">👋</p>
            <p className="font-fredoka text-xl text-dark-ink/70">
              אין עדיין פרופילים
            </p>
            <p className="font-fredoka text-dark-ink/50 mt-1">
              לחץ על "הוסף פרופיל" כדי להתחיל!
            </p>
          </motion.div>
        ) : (
          <motion.div
            className="flex flex-wrap justify-center gap-4 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <AnimatePresence>
              {profiles.map((profile, i) => {
                const progress = getProgress(profile.id);
                return (
                  <ProfileCard
                    key={profile.id}
                    id={profile.id}
                    name={profile.name}
                    avatar={profile.avatar}
                    totalCorrect={progress.totalCorrect}
                    stars={getProfileStars(profile.id)}
                    index={i}
                    onSelect={() => handleSelectProfile(profile.id)}
                    onLongPress={() => setDeleteTarget({ id: profile.id, name: profile.name })}
                    onContextMenu={(e) => handleContextMenu(e, profile.id, profile.name)}
                  />
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Add profile button */}
        {profiles.length < 4 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: profiles.length === 0 ? 0.5 : 0.4 }}
          >
            <Button
              variant={profiles.length === 0 ? 'primary' : 'secondary'}
              onClick={() => setShowNewModal(true)}
              className="text-xl px-8"
            >
              + הוסף פרופיל
            </Button>
          </motion.div>
        )}
      </div>

      {/* New profile modal */}
      <NewProfileModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreated={() => {
          setShowNewModal(false);
          navigate('/home');
        }}
      />

      {/* Delete confirmation modal */}
      <DeleteConfirmModal
        profileName={deleteTarget?.name ?? ''}
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};

export default ProfileSelectScreen;
