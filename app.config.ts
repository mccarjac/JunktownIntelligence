import type { ExpoConfig } from 'expo/config';

/**
 * App identity, read from the environment with Junktown's own values as the
 * defaults. `.env` overrides any of them; `.env.example` documents the set.
 *
 * Static `process.env` access on purpose — Expo inlines `EXPO_PUBLIC_*` by
 * text substitution and would not see a computed lookup.
 *
 * `cli.appVersionSource` is read by EAS CLI and is not part of `ExpoConfig`,
 * hence the intersection.
 */
const APP_NAME = process.env.EXPO_PUBLIC_APP_NAME ?? 'Junktown Intelligence';
const APP_SLUG = process.env.EXPO_PUBLIC_APP_SLUG ?? 'GameCharacterManager';
const APP_VERSION = process.env.EXPO_PUBLIC_APP_VERSION ?? '1.0.0';
const BUNDLE_IDENTIFIER =
  process.env.EXPO_PUBLIC_BUNDLE_IDENTIFIER ?? 'com.junktownintelligence.app';
const SPLASH_BACKGROUND_COLOR =
  process.env.EXPO_PUBLIC_SPLASH_BACKGROUND_COLOR ?? '#ffffff';
const EAS_PROJECT_ID =
  process.env.EAS_PROJECT_ID ?? '885b4454-9ce8-4aeb-b316-e62c0b669199';
const EXPO_OWNER = process.env.EXPO_OWNER ?? 'mccarjac';

const config: ExpoConfig & { cli?: { appVersionSource?: string } } = {
  name: APP_NAME,
  slug: APP_SLUG,
  version: APP_VERSION,
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: SPLASH_BACKGROUND_COLOR,
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: BUNDLE_IDENTIFIER,
  },
  android: {
    package: BUNDLE_IDENTIFIER,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: SPLASH_BACKGROUND_COLOR,
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  cli: {
    appVersionSource: 'remote',
  },
  extra: {
    eas: {
      projectId: EAS_PROJECT_ID,
    },
  },
  owner: EXPO_OWNER,
};

export default config;
