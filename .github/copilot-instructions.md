# Junktown Intelligence - Copilot Instructions

## Purpose

This document provides comprehensive guidance for GitHub Copilot and other AI coding assistants working on the Junktown Intelligence project. It covers project structure, conventions, workflows, and best practices to ensure consistent, high-quality contributions.

**When to use AI assistance:**

- Well-defined bug fixes and feature additions
- Code refactoring following established patterns
- Documentation updates
- UI component creation matching existing design
- Data model extensions

**When to seek human review:**

- Major architectural changes
- Security-sensitive modifications
- Breaking changes to data storage
- Complex navigation restructuring
- New dependency additions

## Project Overview

Junktown Intelligence is a React Native mobile application built with Expo for managing tabletop RPG game data. The app helps users track characters, factions, locations, and events for their gaming campaigns.

**Primary Use Cases:**

- Tabletop RPG campaign management
- LARP event organization
- Character and faction tracking
- Timeline and event management
- Data sharing via GitHub integration

**Tech Stack:**

- React Native with Expo (v54)
- TypeScript (strict mode enabled)
- React Navigation for routing (drawer and stack navigators)
- AsyncStorage for data persistence
- React Native Gesture Handler & Reanimated for animations

## Project Structure

```
/
├── src/
│   ├── components/      # Reusable UI components (common, screens)
│   ├── models/          # Data models and types
│   ├── navigation/      # Navigation types and configuration
│   ├── screens/         # Screen components organized by feature
│   │   ├── character/   # Character management screens
│   │   ├── faction/     # Faction management screens
│   │   ├── location/    # Location management screens
│   │   └── events/      # Event timeline screens
│   ├── styles/          # Shared styles and theming
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Utility functions (storage, stats, export/import)
├── assets/              # Images and static assets
├── .github/             # GitHub configuration (including this file)
└── [config files]       # Root level configuration files
```

## Development Workflow

### Setup and Installation

```bash
npm install              # Install dependencies
npm run prepare          # Set up Husky git hooks
```

### Running the App

```bash
npm run android          # Run on Android device/emulator (preferred)
npm run web              # Run in web browser (localhost:8081)
npm run ios              # Run on iOS device/simulator
npm start                # Start Expo dev server
```

### Code Quality Commands

```bash
npm run lint             # Run ESLint on all files
npm run lint:fix         # Auto-fix ESLint issues
npm run lint:errors      # Show only critical errors (no warnings)
npm run format           # Format all files with Prettier
npm run format:check     # Check formatting without making changes
npm run type-check       # Run TypeScript type checking
npm run check-all        # Run all checks (type-check, lint, format-check)
```

### Building

```bash
eas build --platform android --profile preview    # Build APK for testing
eas build --platform android --profile production # Build AAB for Play Store
```

See `ANDROID_BUILD.md` for detailed Android build instructions using EAS CLI.

**Note**: Builds happen on Expo servers, not locally. GitHub Actions automates this for `master` branch.

## Coding Standards

### TypeScript

- **Strict mode enabled** - all TypeScript strict checks are enforced
- Use explicit types for function parameters and complex return types
- Avoid `any` type (warning level) - use proper types or `unknown`
- Prefix unused variables with underscore: `_unusedVar`
- Use path aliases:
  - `@/*` for `src/*`
  - `@components/*` for `src/components/*`
  - `@screens/*` for `src/screens/*`
  - `@models/*` for `src/models/*`
  - `@utils/*` for `src/utils/*`

### React & React Native

- **No PropTypes** - use TypeScript interfaces for prop validation
- **React 19** - React import not required in JSX files
- Follow React Hooks rules (enforced by eslint)
- Avoid inline styles (warning level) - use StyleSheet.create()
- Avoid color literals (warning level) - define colors in theme
- Use proper platform-specific components when needed

### Code Style (Prettier)

- **Single quotes** for strings
- **Semicolons required**
- **2-space indentation**
- **80 character line width**
- **Trailing commas** in ES5 compatible locations
- **LF line endings**
- Arrow function parens: avoid when single parameter

### Git Workflow

- **Pre-commit hooks** automatically run linting and formatting on staged files
- Ensure all checks pass before committing
- Husky enforces code quality at commit time

### Dependency Management

**Adding Dependencies:**

- Use `npm install <package>` for regular dependencies
- Use `npm install -D <package>` for dev dependencies
- **Always check Expo compatibility** before adding native modules
- For React Native libraries, verify they work with React Native 0.81.5
- Consider bundle size impact on mobile app

**Common Dependencies:**

- React Navigation - already included, use for routing
- AsyncStorage - already included, use for storage
- Expo modules - prefer Expo equivalents over bare React Native
- Vector icons - use built-in Expo icon sets

**Updating Dependencies:**

- Test thoroughly after updates, especially for React Native/Expo
- Follow Expo SDK upgrade guides for major version bumps
- Update package-lock.json by running `npm install`

## Key Conventions

### Component Organization

- Screen components go in `src/screens/{feature}/`
- Reusable components go in `src/components/common/`
- Base/abstract components go in `src/components/screens/`
- Export components from `src/components/index.ts` for cleaner imports

### Navigation

- Navigation types defined in `src/navigation/types.ts`
- Uses drawer navigator for main screens
- Uses stack navigator for detail/form screens
- Dark theme applied consistently across navigation

### State Management

- AsyncStorage for data persistence
- Character, Faction, Location, and Event data stored locally
- Storage utilities in `src/utils/characterStorage.ts`
- Import/Export functionality in `src/utils/exportImport.ts`

### Styling

- Dark theme with consistent color palette:
  - Primary: `#6C5CE7` (purple)
  - Background: `#0F0F23` (dark blue)
  - Card: `#262647` (lighter dark blue)
  - Border: `#404066` (gray-blue)
- Use StyleSheet.create() for all styles
- Avoid inline styles and color literals when possible

## Files to NOT Modify

- `node_modules/` - Dependencies (automatically managed)
- `.expo/` - Expo build cache
- `dist/`, `build/` - Build outputs
- `.husky/` - Git hooks configuration (unless specifically working on git hooks)
- Config files unless specifically required for the task:
  - `babel.config.js`
  - `metro.config.js`
  - `tsconfig.json`
  - `eslint.config.js`
  - `.prettierrc`
- CSV test files (`test-factions*.csv`) - used for testing import functionality

## CI/CD Pipeline

### GitHub Actions

- **Automated APK builds** trigger on pushes to `master` branch
- Workflow uses Expo EAS to build Android APK
- Build takes ~10-20 minutes on EAS servers
- APK download URL posted to GitHub Releases
- See `.github/GITHUB_ACTIONS_SETUP.md` for setup details

### Build Verification

- Ensure `app.json` and `eas.json` remain valid
- Don't modify GitHub Actions workflow without testing
- Build errors usually indicate dependency or configuration issues

## Testing & Validation

- **Jest is configured** (`jest-expo`); tests live in `tst/`. Run `npm test`.
  Add tests for new storage behavior and bug fixes.
- Storage tests mock `SafeAsyncStorageJSONParser`; some assert on the order of
  `getItem` calls, so update mocks if you change a function's read sequence.
- Also test on Android device/emulator; web version may have limited functionality
- Always run `npm run check-all` before committing (type-check + lint +
  format:check + test — all must pass; CI enforces type-check, lint, and test)
- Verify changes with `npm run android` or `npm run web`

### Manual Testing Checklist

When making changes, test:

- Character CRUD operations (Create, Read, Update, Delete)
- Faction membership sync (changes reflect in both characters and factions)
- Location coordinate handling
- Event timeline ordering
- Import/Export functionality (JSON, CSV, ZIP)
- Navigation between screens
- Data persistence after app restart

## Important Notes

### Data Structure

- Characters have detailed stats, skills, and relationships
- Factions track members and character affiliations
- Locations can have coordinates for map display
- Events form a timeline with date tracking

### Performance Considerations

- Large character lists may need pagination (not yet implemented)
- Image handling uses Expo Image Picker
- Export/Import uses CSV and JSON formats
- AsyncStorage is used for all data persistence (has size limitations)

### Known Limitations

- Web platform may have reduced functionality
- Export/import feature benefits from manual testing on-device
- Type-check and lint are green and enforced in CI — keep them that way

## Security Considerations

### Secrets Management

- **Never commit secrets** to source code
- GitHub integration uses tokens stored securely
- `EXPO_TOKEN` is stored in GitHub Secrets for CI/CD
- Users manage their own GitHub tokens in-app

### Data Privacy

- All data stored locally on device (AsyncStorage)
- No telemetry or analytics collection
- GitHub integration is opt-in only
- Export functions should not expose sensitive data unintentionally

### Common Security Pitfalls to Avoid

- Don't log sensitive user data
- Validate all import data before processing
- Sanitize user input in character/faction names
- Handle AsyncStorage errors gracefully

## Common Pitfalls & Gotchas

### React Native / Expo Specific

- **AsyncStorage is asynchronous** - always await operations
- **Navigation state** - use `useFocusEffect` for screen-specific logic
- **Image URIs** - handle both local and remote image sources
- **Platform differences** - test Android-specific features on Android
- **Expo Go limitations** - some features require custom dev builds

### TypeScript Issues

- Path aliases require proper tsconfig.json configuration
- Strict mode catches many runtime errors at compile time
- Some TypeScript errors exist but don't prevent builds
- Use proper types instead of `any` to catch bugs early

### Data Management

- **Faction sync** - character changes must update faction member lists
- **Relationship bidirectionality** - ensure relationships update both ways
- **AsyncStorage size limits** - large datasets may need chunking
- **Import/Export edge cases** - handle malformed CSV/JSON gracefully
- **Date handling** - be consistent with date formats across the app

### Development Workflow

- **Pre-commit hooks** can fail silently - check output
- **Metro bundler cache** - clear cache if strange errors occur: `npx expo start -c`
- **Node modules** - occasionally need to delete and reinstall
- **Husky hooks** - require `npm run prepare` after fresh clone

## For AI Coding Assistants

### General Guidelines

When making changes to this codebase:

1. **Always** run linting and type-checking before committing
2. **Maintain** the existing dark theme and design patterns
3. **Follow** the established project structure
4. **Use** existing utility functions rather than duplicating logic
5. **Test** changes on Android (preferred) or web
6. **Document** any new features or significant changes
7. **Keep** component files focused and single-responsibility
8. **Respect** the path alias system defined in tsconfig.json
9. **Avoid** breaking changes to data storage format
10. **Check** that pre-commit hooks pass

### Best Task Types for AI Assistance

**Well-suited tasks:**

- Bug fixes in specific components or utilities
- Adding new UI components following existing patterns
- Refactoring code to improve readability or performance
- Adding or updating documentation
- Implementing new screens following existing screen patterns
- Data model updates and storage migrations
- CSV import/export enhancements
- Analytics and reporting features

**Challenging tasks (approach with caution):**

- Major navigation restructuring
- Core data storage architecture changes
- Complex state management refactoring
- Platform-specific native module integration
- Performance optimization requiring profiling
- Security-sensitive authentication/authorization changes

### Code Review Expectations

**Before submitting changes:**

- Run `npm run check-all` and fix all errors
- Test on Android device or emulator
- Verify no breaking changes to existing features
- Check that data persists correctly
- Ensure navigation flows work as expected
- Review diffs to confirm only intended changes

**Quality standards:**

- All TypeScript code must type-check (use `npm run type-check`)
- ESLint must pass without errors (warnings acceptable)
- Code must be formatted with Prettier
- Follow existing code patterns and conventions
- Add comments for complex logic only
- Keep functions small and focused

## Troubleshooting Common Issues

### Build Errors

**"Cannot find module" errors:**

```bash
rm -rf node_modules package-lock.json
npm install
```

**Metro bundler issues:**

```bash
npx expo start -c  # Clear cache
```

**TypeScript errors after changes:**

```bash
npm run type-check  # Check all errors
npx tsc --noEmit    # Alternative checker
```

### Runtime Errors

**AsyncStorage errors:**

- Check device storage space
- Verify JSON serialization of data
- Ensure all async operations are awaited

**Navigation errors:**

- Verify screen names match navigation types
- Check that navigation params are properly typed
- Ensure React Navigation is properly configured

**Image loading failures:**

- Verify image URIs are valid
- Check Expo Image Picker permissions
- Handle both local and remote image sources

### Development Environment

**Expo Go won't connect:**

- Ensure device and computer are on same network
- Check firewall settings
- Try `npx expo start --tunnel` for alternative connection

**Android build fails:**

- Verify `eas.json` configuration
- Check Expo account has build quota
- Review EAS build logs for specific errors

**Pre-commit hooks not running:**

```bash
npm run prepare      # Reinstall Husky hooks
chmod +x .husky/*    # Ensure hooks are executable
```

## Additional Resources

- Main README: `README.md` - Setup and running instructions
- Linting Guide: `LINTING.md` - Detailed linting configuration and rules
- Android Build: `ANDROID_BUILD.md` - APK build instructions
- GitHub Actions Setup: `.github/GITHUB_ACTIONS_SETUP.md` - CI/CD configuration
- GitHub Integration: `GITHUB_INTEGRATION.md` - Sync setup and usage
- CSV Import Format: `CSV_Import_Format.md` - Import data format specification
- Data Repository Template: `DATA_REPOSITORY_TEMPLATE.md` - Shared data repo setup
