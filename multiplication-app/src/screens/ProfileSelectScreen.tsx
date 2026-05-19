import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfileStore } from '../store/profileStore';
import { useProgressStore } from '../store/progressStore';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { MascotCharacter } from '../components/character/MascotCharacter';
import { BackgroundDecoration } from '../components/layout/BackgroundDecoration';
import type { AvatarId } from '../types';

const AVATARS: { id: AvatarId; emoji: string; label: string }[] = [
  { id: 'fox', emoji: '🦊', label: 'שועל' },
  { id: 'cat', emoji: '🐱', label: 'חתול' },
  { id: 'bear', emoji: '🐻', label: 'דוב' },
  { id: 'rabbit', emoji: '🐰', label: 'ארנב' },
  { id: 'owl', emoji: '🦉', label: 'ינשוף' },
  { id: 'penguin', emoji: '🐧', label: 'פינגווין' },
  { id: 'dragon', emoji: '🐲', label: 'דרקון' },
  { id: 'unicorn', emoji: '🦄', label: 'חד-קרן' },
];

interface NewProfileFormProps {
  onCancel: () => void;
  onCreated: () => void;
}

const NewProfileForm: React.FC<NewProfileFormProps> = ({ onCancel, onCreated }) => {
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarId>('fox');
  const addProfile = useProfileStore((s) => s.addProfile);
  const checkAndUpdateStreak = useProgressStore((s) => s.checkAndUpdateStreak);

  const handleSubmit = () => {
    if (!name.trim()) return;
    addProfile(name.trim(), selectedAvatar);
    // Get the new profile id
    const profiles = useProfileStore.getState().profiles;
    const newest = profiles[profiles.length - 1];
    if (newest) {
      useProfileStore.getState().setActiveProfile(newest.id);
      checkAndUpdateStreak(newest.id);
    }
    onCreated();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-ink/50 backdrop-blur-sm"
    >
      <Card className="w-full max-w-md" padding="lg">
        <h2 className="text-2xl font-bold text-dark-ink mb-6 text-center font-fredoka">
          פרופיל חדש 🌟
        </h2>

        <div className="mb-4">
          <label className="block text-dark-ink font-semibold mb-2 font-fredoka">
            מה השם שלך?
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="הכנס את שמך..."
            maxLength={15}
            className="w-full border-3 border-dark-ink rounded-xl px-4 py-2
                       font-fredoka text-lg bg-white shadow-comic-sm
                       focus:outline-none focus:border-secondary transition-colors"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            dir="rtl"
          />
        </div>

        <div className="mb-6">
          <label className="block text-dark-ink font-semibold mb-2 font-fredoka">
            בחר דמות:
          </label>
          <div className="grid grid-cols-4 gap-2">
            {AVATARS.map((av) => (
              <motion.button
                key={av.id}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedAvatar(av.id)}
                className={[
                  'flex flex-col items-center p-2 rounded-xl border-3 transition-all',
                  selectedAvatar === av.id
                    ? 'border-secondary bg-secondary/20 shadow-comic-sm'
                    : 'border-dark-ink/30 bg-white hover:border-secondary',
                ].join(' ')}
              >
                <span className="text-3xl">{av.emoji}</span>
                <span className="text-xs font-fredoka text-dark-ink mt-1">{av.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" onClick={onCancel} className="flex-1">
            ביטול
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="flex-1"
          >
            יאללה! 🚀
          </Button>
        </div>
      </Card>
    </motion.div>
  );
};

export const ProfileSelectScreen: React.FC = () => {
  const navigate = useNavigate();
  const { profiles, setActiveProfile, deleteProfile } = useProfileStore();
  const checkAndUpdateStreak = useProgressStore((s) => s.checkAndUpdateStreak);
  const [showNewForm, setShowNewForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSelectProfile = (id: string) => {
    setActiveProfile(id);
    checkAndUpdateStreak(id);
    navigate('/home');
  };

  const handleDeleteProfile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deletingId === id) {
      deleteProfile(id);
      setDeletingId(null);
    } else {
      setDeletingId(id);
      setTimeout(() => setDeletingId(null), 3000);
    }
  };

  const getAvatarEmoji = (avatarId: AvatarId) =>
    AVATARS.find((a) => a.id === avatarId)?.emoji ?? '🦊';

  return (
    <div className="relative min-h-screen bg-bg flex flex-col items-center justify-center p-4">
      <BackgroundDecoration />

      <div className="relative z-10 w-full max-w-lg">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <MascotCharacter
            state={showNewForm ? 'excited' : 'idle'}
            size={100}
            showSpeech
            className="mb-4"
          />
          <h1 className="text-5xl font-bold text-dark-ink font-fredoka drop-shadow-sm">
            כפלי! 🦊
          </h1>
          <p className="text-xl text-dark-ink/70 font-fredoka mt-2">
            לומדים כפל בכיף!
          </p>
        </motion.div>

        {/* Profile list */}
        {profiles.length > 0 && (
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-xl font-bold text-dark-ink font-fredoka mb-3 text-center">
              בחר שחקן:
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {profiles.map((profile, i) => (
                <motion.div
                  key={profile.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * i }}
                >
                  <Card
                    hover
                    onClick={() => handleSelectProfile(profile.id)}
                    padding="sm"
                    className="flex items-center gap-4 cursor-pointer group"
                  >
                    <span className="text-4xl">{getAvatarEmoji(profile.avatar)}</span>
                    <div className="flex-1">
                      <p className="text-xl font-bold font-fredoka text-dark-ink">
                        {profile.name}
                      </p>
                    </div>
                    <motion.button
                      onClick={(e) => handleDeleteProfile(profile.id, e)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className={[
                        'px-3 py-1 rounded-lg border-2 text-sm font-fredoka font-semibold',
                        deletingId === profile.id
                          ? 'bg-error border-dark-ink text-white'
                          : 'bg-white border-dark-ink/30 text-dark-ink/50 hover:border-error hover:text-error',
                      ].join(' ')}
                    >
                      {deletingId === profile.id ? 'בטוח?' : '×'}
                    </motion.button>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Add new profile button */}
        {profiles.length < 4 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              variant={profiles.length === 0 ? 'primary' : 'secondary'}
              onClick={() => setShowNewForm(true)}
              fullWidth
              className="text-xl"
            >
              {profiles.length === 0 ? '🌟 בוא נתחיל!' : '+ שחקן חדש'}
            </Button>
          </motion.div>
        )}
      </div>

      {/* New profile form modal */}
      <AnimatePresence>
        {showNewForm && (
          <NewProfileForm
            onCancel={() => setShowNewForm(false)}
            onCreated={() => {
              setShowNewForm(false);
              navigate('/home');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfileSelectScreen;
