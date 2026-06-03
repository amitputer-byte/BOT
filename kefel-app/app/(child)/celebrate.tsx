import React from 'react';
import { useRouter } from 'expo-router';
import { Celebration } from '@/components';
import { useAppStore } from '@/features/store/appStore';
import { t } from '@/services/i18n';

/** Post-session celebration. Reads the latest stars/badge and returns home. */
export default function Celebrate() {
  const router = useRouter();
  const rewards = useAppStore((s) => s.rewards);
  const lastBadge = useAppStore((s) => s.lastBadge);
  const badgeLabel = lastBadge ? t(`badge.${lastBadge}`) : null;
  return (
    <Celebration
      stars={rewards?.stars ?? 0}
      badgeLabel={badgeLabel}
      onDone={() => router.replace('/(child)/home')}
    />
  );
}
