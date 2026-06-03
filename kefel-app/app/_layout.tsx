import React, { useEffect, useState } from 'react';
import { I18nManager, View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { useAppStore } from '@/features/store/appStore';
import { createRuntime } from '@/services/runtime';
import { palette } from '@/theme/tokens';

// Force RTL globally and permanently — the entire app is Hebrew-first.
// This runs at module load so layout is correct from the first frame.
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60_000, retry: 1 } },
});

export default function RootLayout() {
  const bootstrap = useAppStore((s) => s.bootstrap);
  const ready = useAppStore((s) => s.ready);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const { repo, analytics } = createRuntime();
    bootstrap(repo, analytics).finally(() => setBooting(false));
  }, [bootstrap]);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          {booting || !ready ? (
            <View style={{ flex: 1, justifyContent: 'center', backgroundColor: palette.paper }}>
              <ActivityIndicator size="large" color={palette.sky} />
            </View>
          ) : (
            <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
          )}
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
