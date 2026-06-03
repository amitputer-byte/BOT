/**
 * Two-project setup:
 * - "engine": pure Node tests for the learning engine / lib (fast, no RN).
 * - "expo": jest-expo preset for component tests using RNTL.
 */
module.exports = {
  projects: [
    {
      displayName: 'engine',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
      transform: {
        '^.+\\.tsx?$': ['babel-jest', { presets: ['babel-preset-expo'] }],
      },
    },
    {
      displayName: 'component',
      preset: 'jest-expo',
      testMatch: ['<rootDir>/tests/component/**/*.test.tsx'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|zustand))',
      ],
    },
  ],
};
