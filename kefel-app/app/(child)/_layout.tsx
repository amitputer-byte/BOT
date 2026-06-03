import React from 'react';
import { Stack } from 'expo-router';

/** Child area stack — the safe, parent-gate-free zone the child lives in. */
export default function ChildLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
