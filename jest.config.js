module.exports = {
  preset: 'react-native',
  testEnvironment: 'node',
  // `expo-.*` and `@octokit` are needed (not just bare `expo`) so packages
  // like expo-file-system and @octokit/rest, which ship ESM, get
  // transformed instead of failing to parse — this only matters once
  // coverage collection actually loads files like exportImport.ts and
  // gitIntegration.ts that were previously excluded from the report.
  // `uuid` ships ESM-only and must be transformed so test files can automock
  // modules that import it (e.g. `jest.mock('@utils/characterStorage')`).
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|expo|expo-.*|@expo|@unimodules|@octokit|react-native-.*|uuid)/)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@screens/(.*)$': '<rootDir>/src/screens/$1',
    '^@models/(.*)$': '<rootDir>/src/models/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    'src/utils/**/*.{ts,tsx}',
    'src/components/**/*.{ts,tsx}',
    'src/screens/**/*.{ts,tsx}',
    'src/ruleset/**/*.{ts,tsx}',
    '!src/utils/**/*.d.ts',
    '!src/utils/**/index.{ts,tsx}',
    '!src/components/**/index.{ts,tsx}',
    '!src/screens/**/index.{ts,tsx}',
    '!src/ruleset/index.{ts,tsx}',
  ],
  // No coverageThreshold for now — coverage reporting is informational only
  // (see .github/workflows/coverage.yml). Thresholds return once the gaps
  // tracked in AGENTS.md's "Test coverage gaps" section are closed: patch
  // coverage via the coverage action's `threshold` input, project coverage
  // via a `coverageThreshold` re-added here.
  coverageReporters: ['text', 'lcov', 'html', 'json', 'json-summary'],
  testMatch: ['<rootDir>/tst/**/*.(test|spec).(ts|tsx|js)'],
  // 'src' must be a root too (not just 'tst'), otherwise Jest's coverage
  // collector can't add zero-coverage entries for src files that aren't
  // imported by any test — collectCoverageFrom would silently show nothing
  // for genuinely untested files instead of a real 0% row.
  roots: ['<rootDir>/tst', '<rootDir>/src'],
};
