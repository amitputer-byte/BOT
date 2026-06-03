import React from 'react';
import { Redirect } from 'expo-router';
import { useAppStore } from '@/features/store/appStore';

/** Boot router: existing child -> home; otherwise -> onboarding (parent gate). */
export default function Index() {
  const child = useAppStore((s) => s.child);
  return child ? <Redirect href="/(child)/home" /> : <Redirect href="/onboarding" />;
}
