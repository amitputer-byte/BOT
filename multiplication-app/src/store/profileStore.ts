import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Profile, AvatarId } from '../types';

interface ProfileStore {
  profiles: Profile[];
  activeProfileId: string | null;
  /** Creates a new profile and returns its id */
  addProfile: (name: string, avatar: AvatarId) => string;
  deleteProfile: (id: string) => void;
  setActiveProfile: (id: string) => void;
  getActiveProfile: () => Profile | null;
  updateProfile: (id: string, updates: Partial<Pick<Profile, 'name' | 'avatar'>>) => void;
}

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set, get) => ({
      profiles: [],
      activeProfileId: null,

      addProfile: (name: string, avatar: AvatarId): string => {
        const newProfile: Profile = {
          id: `profile-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name,
          avatar,
          createdAt: Date.now(),
        };
        set((state) => ({
          profiles: [...state.profiles, newProfile],
          // Auto-activate first profile
          activeProfileId: state.activeProfileId ?? newProfile.id,
        }));
        return newProfile.id;
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

      updateProfile: (id: string, updates: Partial<Pick<Profile, 'name' | 'avatar'>>) => {
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }));
      },
    }),
    {
      name: 'multiplication-profiles',
    }
  )
);
