import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Profile, AvatarId } from '../types';

interface ProfileStore {
  profiles: Profile[];
  activeProfileId: string | null;
  addProfile: (name: string, avatar: AvatarId) => void;
  deleteProfile: (id: string) => void;
  setActiveProfile: (id: string) => void;
  getActiveProfile: () => Profile | null;
}

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set, get) => ({
      profiles: [],
      activeProfileId: null,

      addProfile: (name: string, avatar: AvatarId) => {
        const newProfile: Profile = {
          id: `profile-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name,
          avatar,
          createdAt: Date.now(),
        };
        set((state) => ({
          profiles: [...state.profiles, newProfile],
          activeProfileId: state.activeProfileId ?? newProfile.id,
        }));
      },

      deleteProfile: (id: string) => {
        set((state) => {
          const remaining = state.profiles.filter((p) => p.id !== id);
          const newActive =
            state.activeProfileId === id
              ? (remaining[0]?.id ?? null)
              : state.activeProfileId;
          return { profiles: remaining, activeProfileId: newActive };
        });
      },

      setActiveProfile: (id: string) => {
        set({ activeProfileId: id });
      },

      getActiveProfile: () => {
        const { profiles, activeProfileId } = get();
        return profiles.find((p) => p.id === activeProfileId) ?? null;
      },
    }),
    {
      name: 'kfali-profiles',
    }
  )
);
