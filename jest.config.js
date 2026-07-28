module.exports = {
  preset: 'react-native',
  testEnvironment: 'node',
  // `lore` ships compiled JS but its dependencies are the same ESM-only
  // packages the engine has always had to allow-list; the suites here load
  // the engine, so the list has to match. `@react-native-community` needs its
  // own entry — the `@react-native` alternative requires a `/` right after
  // it, so it does not match `@react-native-community/slider`.
  transformIgnorePatterns: [
    'node_modules/(?!(lore|react-native|@react-native|@react-native-community|@react-navigation|expo|expo-.*|@expo|@unimodules|@octokit|react-native-.*|uuid|d3-force|d3-quadtree|d3-dispatch|d3-timer)/)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/index.ts'],
  coverageReporters: ['text', 'lcov', 'html', 'json', 'json-summary'],
  testMatch: ['<rootDir>/tst/**/*.(test|spec).(ts|tsx|js)'],
  roots: ['<rootDir>/tst', '<rootDir>/src'],
};
