/* Jest setup for component tests (jest-expo project). */
import '@testing-library/jest-native/extend-expect';

// Default __DEV__ for code paths that branch on it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).__DEV__ = true;

// expo-speech is a native module; stub it for component tests.
jest.mock('expo-speech', () => ({ speak: jest.fn() }));

// Reanimated mock (recommended by the library for tests).
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);
