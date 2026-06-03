/** Detox configuration for end-to-end tests against a dev build. */
module.exports = {
  testRunner: {
    args: { $0: 'jest', config: 'tests/e2e/jest.config.js' },
    jest: { setupTimeout: 120000 },
  },
  apps: {
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build:
        'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
    },
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/KefelKesem.app',
      build:
        'xcodebuild -workspace ios/KefelKesem.xcworkspace -scheme KefelKesem -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build',
    },
  },
  devices: {
    emulator: { type: 'android.emulator', device: { avdName: 'Pixel_5_API_34' } },
    simulator: { type: 'ios.simulator', device: { type: 'iPhone 15' } },
  },
  configurations: {
    'android.emu.debug': { device: 'emulator', app: 'android.debug' },
    'ios.sim.debug': { device: 'simulator', app: 'ios.debug' },
  },
};
