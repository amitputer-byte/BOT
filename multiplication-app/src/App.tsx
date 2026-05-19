import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

// Lazy-load screens
const ProfileSelectScreen = lazy(() => import('./screens/ProfileSelectScreen'));
const HomeScreen = lazy(() => import('./screens/HomeScreen'));
const PracticeScreen = lazy(() => import('./screens/PracticeScreen'));
const AdventureScreen = lazy(() => import('./screens/AdventureScreen'));
const AchievementsScreen = lazy(() => import('./screens/AchievementsScreen'));
const SettingsScreen = lazy(() => import('./screens/SettingsScreen'));

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

const pageTransition = {
  duration: 0.25,
  ease: 'easeInOut',
};

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
          <Route path="/" element={<ProfileSelectScreen />} />
          <Route path="/home" element={<HomeScreen />} />
          <Route path="/practice" element={<PracticeScreen />} />
          <Route path="/adventure" element={<AdventureScreen />} />
          <Route path="/achievements" element={<AchievementsScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <AnimatedRoutes />
      </Suspense>
    </BrowserRouter>
  );
};

export default App;
