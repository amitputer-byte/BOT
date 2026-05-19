import React, { Suspense, lazy, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useProfileStore } from './store/profileStore';
import { SplashScreen } from './components/ui/SplashScreen';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { AchievementToast } from './components/ui/AchievementToast';

// Lazy-load screens
const ProfileSelectScreen = lazy(() => import('./screens/ProfileSelectScreen'));
const HomeScreen          = lazy(() => import('./screens/HomeScreen'));
const PracticeScreen      = lazy(() => import('./screens/PracticeScreen'));
const AdventureScreen     = lazy(() => import('./screens/AdventureScreen'));
const AchievementsScreen  = lazy(() => import('./screens/AchievementsScreen'));
const SettingsScreen      = lazy(() => import('./screens/SettingsScreen'));

// ─── Page transitions ─────────────────────────────────────────────────────────

const pageVariants = {
  initial:  { opacity: 0, x: 40 },
  animate:  { opacity: 1, x: 0 },
  exit:     { opacity: 0, x: -40 },
};

const pageTransition = { duration: 0.2, ease: 'easeInOut' as const };

// ─── Loading fallback ─────────────────────────────────────────────────────────

const LoadingFallback: React.FC = () => (
  <div className="min-h-screen bg-bg flex items-center justify-center">
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className="text-5xl"
    >
      🦊
    </motion.div>
  </div>
);

// ─── Root redirect ────────────────────────────────────────────────────────────

const RootRedirect: React.FC = () => {
  const activeProfileId = useProfileStore((s) => s.activeProfileId);
  return <Navigate to={activeProfileId ? '/home' : '/profile'} replace />;
};

// ─── Protected route ─────────────────────────────────────────────────────────

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const activeProfileId = useProfileStore((s) => s.activeProfileId);
  if (!activeProfileId) {
    return <Navigate to="/profile" replace />;
  }
  return <>{children}</>;
};

// ─── Animated routes ─────────────────────────────────────────────────────────

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={pageTransition}
        className="min-h-screen"
      >
        <Routes location={location}>
          {/* Root: redirect based on active profile */}
          <Route path="/" element={<RootRedirect />} />

          {/* Profile selection (public) */}
          <Route path="/profile" element={<ProfileSelectScreen />} />

          {/* Protected screens */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <HomeScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/practice"
            element={
              <ProtectedRoute>
                <PracticeScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/adventure"
            element={
              <ProtectedRoute>
                <AdventureScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/achievements"
            element={
              <ProtectedRoute>
                <AchievementsScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsScreen />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

// ─── App shell with splash ────────────────────────────────────────────────────

const AppShell: React.FC = () => {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <>
      {/* Achievement toast — non-blocking, sits above everything */}
      <AchievementToast />

      {/* Splash screen — hard 0.8s then fades out */}
      {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}

      {/* Main app (rendered underneath so it's ready instantly) */}
      <Suspense fallback={<LoadingFallback />}>
        <AnimatedRoutes />
      </Suspense>
    </>
  );
};

// ─── App ──────────────────────────────────────────────────────────────────────

const App: React.FC = () => (
  <ErrorBoundary>
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  </ErrorBoundary>
);

export default App;
