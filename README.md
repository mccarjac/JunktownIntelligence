![Logo](https://github.com/mccarjac/JunktownIntelligence/blob/master/assets/adaptive-icon.png)

<div align="center">

**A comprehensive React Native mobile application for managing tabletop RPGs, LARPs, worldbuilding, and storytelling**

[![React Native](https://img.shields.io/badge/React%20Native-0.81.5-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-54.0.23-000020.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

**Support the Project:**

[![Support on Patreon](https://img.shields.io/badge/Support-Patreon-orange.svg)](https://www.patreon.com/cw/MugatuCreations)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-mugatucreations-FFDD00.svg?logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/mugatucreations)
[![PayPal](https://img.shields.io/badge/PayPal-@mccarjac-00457C.svg?logo=paypal)](https://paypal.me/mccarjac)
[![Venmo](https://img.shields.io/badge/Venmo-@mccarjac-3D95CE.svg?logo=venmo)](https://venmo.com/mccarjac)
[![Cash App](https://img.shields.io/badge/Cash%20App-$mccarjac-00C244.svg?logo=cash-app)](https://cash.app/$mccarjac)

_Developed by Jacob McCarthy ([mccarjac](https://github.com/mccarjac))_

</div>

---

## 📖 Table of Contents

- [About the Project](#-about-the-project)
- [Use Case](#-use-case)
- [Key Features](#-key-features)
- [Technology Stack](#-technology-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the App](#running-the-app)
  - [Testing on a Physical Device](#-testing-on-a-physical-device)
- [Available Scripts](#-available-scripts)
- [Building for Android](#-building-for-android)
- [Project Structure](#-project-structure)
- [Documentation](#-documentation)
- [Development Workflow](#-development-workflow)
- [Contributing](#-contributing)
- [Contributors](#-contributors)
- [Acknowledgments](#-acknowledgments)

---

## 🎯 About the Project

**Junktown Intelligence** is a powerful mobile application designed to help game masters, players, storytellers, and worldbuilders organize, track, and manage their creative projects. Built with React Native and Expo, this cross-platform solution provides a comprehensive suite of tools for managing complex game worlds, character relationships, faction dynamics, and timelines across multiple formats including tabletop RPGs, live action role-playing (LARPs), worldbuilding projects, and collaborative storytelling.

Whether you're running a sprawling post-apocalyptic campaign, organizing a LARP event, building an intricate fantasy world, or crafting an epic narrative, Junktown Intelligence helps you keep track of every detail that matters.

---

## 🎲 Use Case

### Target Audience

- **Tabletop RPG Game Masters**: Organize NPCs, factions, locations, and campaign events
- **LARP Organizers**: Manage characters, plots, and event logistics for live action events
- **Players**: Track character progression, relationships, and important story beats
- **Worldbuilders**: Document and organize fictional worlds, cultures, and histories
- **Storytellers & Writers**: Plan narratives, character arcs, and plot threads
- **Creative Groups**: Share and synchronize project data across multiple collaborators

### Ideal For

- **Tabletop RPG Campaigns**: Managing dozens of NPCs, factions, and interconnected storylines
- **LARP Events**: Organizing character sheets, faction politics, and event timelines
- **Long-Running Games**: Tracking character evolution and campaign history over time
- **Worldbuilding Projects**: Creating detailed, interconnected fictional worlds with rich faction dynamics
- **Collaborative Storytelling**: Sharing narrative elements and character data with co-creators
- **Creative Writing**: Planning complex narratives with multiple characters and plot threads

---

## ✨ Key Features

### 📝 Character Management

- **Comprehensive Profiles**: Track detailed character information including stats, skills, perks, and distinctions
- **Relationships**: Manage character relationships and faction affiliations with detailed standing levels
- **Species System**: Support for base species (Human, Android, Mutant, etc.) and prestige classes
- **Search & Filter**: Quickly find characters using advanced search capabilities
- **Occupation Tracking**: Record character roles and occupations within your game world

### 🏛️ Faction System

- **Faction Management**: Create and manage factions with descriptions, member lists, and influence tracking
- **Relationship Standings**: Track character-faction relationships (Enemy, Neutral, Ally, etc.)
- **Member Tracking**: Automatic syncing of faction membership with character data
- **Influence Reports**: Visualize faction influence and power dynamics

### 📍 Location Management

- **Location Library**: Create and manage locations across your game world
- **Coordinate System**: Optional coordinate mapping for spatial tracking
- **Character Assignments**: Link characters to their frequent locations
- **Interactive Maps**: View locations on a map interface (Junktown map included)

### 📅 Event Timeline

- **Campaign History**: Track important events with dates and participant lists
- **Chronological View**: View events in timeline format
- **Participant Tracking**: Link events to specific characters and locations
- **Notes & Details**: Add detailed descriptions and outcomes for each event

### 💾 Data Management

- **Import/Export**: Share data via JSON, ZIP, or CSV formats
- **Merge Functionality**: Merge imported data with existing campaign data
- **CSV Bulk Import**: Import multiple characters at once from CSV files
- **Data Backup**: Export complete campaign data for backup purposes

### 🔄 GitHub Integration

- **Collaborative Sync**: Share campaign data through GitHub repositories
- **Pull Request Workflow**: Export creates PRs for review before merging
- **Import from Repository**: Pull latest campaign data from shared repositories
- **Version Control**: Leverage Git for campaign data versioning

### 📊 Analytics & Reports

- **Character Statistics**: View aggregate stats across your character roster
- **Influence Reports**: Analyze faction power dynamics and relationships
- **Visualization**: Charts and graphs for data analysis

---

## 🛠️ Technology Stack

### Core Framework

- **React Native** (v0.81.5) - Cross-platform mobile framework
- **Expo** (v54) - Development platform and build tools
- **TypeScript** (v5.9.2) - Type-safe development

### UI & Navigation

- **React Navigation** (v7) - Navigation system (Drawer + Stack)
- **React Native Gesture Handler** - Touch gesture management
- **React Native Reanimated** - Smooth animations
- **React Native Gifted Charts** - Data visualization

### State & Storage

- **AsyncStorage** - Local data persistence
- **Expo File System** - File management and storage

### Additional Features

- **Expo Image Picker** - Character image uploads
- **Expo Document Picker** - Import file selection
- **React Native Zip Archive** - ZIP file handling
- **Octokit** - GitHub API integration

### Development Tools

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Husky** - Git hooks for code quality
- **TypeScript Strict Mode** - Enhanced type safety

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v16 or higher) and **npm**
- **Expo CLI**: Install globally with `npm install -g expo-cli`
- **Android Studio** (for Android development) or **Xcode** (for iOS development)
- **Linux-based terminal** (Linux, macOS, or WSL on Windows)
- **Git** and **GitHub CLI** (optional, for repository cloning)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/mccarjac/JunktownIntelligence.git
   cd JunktownIntelligence
   ```

   Or using GitHub CLI:

   ```bash
   gh repo clone mccarjac/JunktownIntelligence
   cd JunktownIntelligence
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up git hooks** (optional, for development)
   ```bash
   npm run prepare
   ```

### Running the App

#### Android (Recommended)

1. **Connect your Android device** via USB and enable USB debugging ([see official docs](https://developer.android.com/studio/run/device))

   Or start an Android emulator from Android Studio

2. **Run the app**

   ```bash
   npm run android
   ```

3. **Development tips**:
   - Press `a` in the terminal to reload the app
   - Shake your device to open the developer menu
   - Press `r` to reload the JavaScript bundle

#### Web (Limited Features)

```bash
npm run web
```

Then open your browser to `http://localhost:8081`

**Note**: Some features may not work as expected on web due to native module dependencies.

#### iOS

```bash
npm run ios
```

**Note**: Requires macOS and Xcode. iOS simulator will launch automatically.

---

## 📱 Testing on a Physical Device

Handy when you want to try out a branch or PR without doing a full build.

### Android

**USB (recommended, most reliable):**

1. Enable Developer Options and USB debugging on the device ([see official docs](https://developer.android.com/studio/run/device))
2. Connect the device via USB and accept the "Allow USB debugging" prompt on the device
3. Verify the device is detected:
   ```bash
   adb devices
   ```
4. Run the app:
   ```bash
   npm run android
   ```

**Wireless (device and computer on the same Wi-Fi network):**

1. Start the dev server:
   ```bash
   npx expo start
   ```
2. Open the **Expo Go** app on the device and scan the QR code shown in the terminal

### iOS

Testing on a physical iPhone/iPad doesn't require a Mac or Xcode — only the
Expo Go app:

1. Install **Expo Go** from the App Store
2. Make sure the device and computer are on the same Wi-Fi network
3. Start the dev server:
   ```bash
   npx expo start
   ```
4. Scan the QR code with the iOS Camera app (it opens automatically in Expo Go)

### Troubleshooting

- Device/computer can't reach the Metro bundler (e.g. different networks,
  corporate/guest Wi-Fi that blocks device-to-device traffic): restart with
  `npx expo start --tunnel`
- `adb devices` shows nothing: recheck USB debugging is authorized and that
  the cable supports data (not charge-only)
- Shake the device to open the in-app developer menu; press `r` in the
  terminal to reload the JS bundle without restarting the server

---

## 📜 Available Scripts

### Development

- `npm start` - Start Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS simulator
- `npm run web` - Run in web browser

### Code Quality

- `npm run lint` - Run ESLint on all files
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run lint:errors` - Show only critical errors
- `npm run format` - Format all files with Prettier
- `npm run format:check` - Check formatting without changes
- `npm run type-check` - Run TypeScript type checking
- `npm run check-all` - Run all checks (type-check, lint, format-check)

### Setup

- `npm run prepare` - Set up Husky git hooks

---

## 📦 Building for Android

### Automated Builds (GitHub Actions)

APK builds are automatically created when code is pushed to the `master` branch via GitHub Actions. The built APK can be downloaded from your [Expo builds page](https://expo.dev).

**Setup Required**: Add an `EXPO_TOKEN` secret to your GitHub repository. See [.github/GITHUB_ACTIONS_SETUP.md](./.github/GITHUB_ACTIONS_SETUP.md) for complete setup instructions.

### Manual Builds (Local)

To build a standalone Android APK or AAB manually:

1. **Install EAS CLI**

   ```bash
   npm install -g eas-cli
   ```

2. **Configure EAS**

   ```bash
   eas login
   eas build:configure
   ```

3. **Build APK** (for testing/distribution outside Play Store)

   ```bash
   eas build --platform android --profile preview
   ```

4. **Build AAB** (for Google Play Store)
   ```bash
   eas build --platform android --profile production
   ```

For detailed build instructions, see [ANDROID_BUILD.md](./ANDROID_BUILD.md)

---

## 📁 Project Structure

```
JunktownIntelligence/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── common/         # Shared components (Button, Card, etc.)
│   │   └── screens/        # Base/abstract screen components
│   ├── models/             # Data models and type definitions
│   ├── navigation/         # Navigation types and configuration
│   ├── screens/            # Screen components by feature
│   │   ├── character/      # Character management screens
│   │   ├── faction/        # Faction management screens
│   │   ├── location/       # Location management screens
│   │   └── events/         # Event timeline screens
│   ├── styles/             # Shared styles and theming
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Utility functions
│       ├── characterStorage.ts  # Data persistence
│       ├── exportImport.ts      # Import/export functionality
│       ├── gitIntegration.ts    # GitHub sync
│       └── statsUtils.ts        # Statistics calculations
├── assets/                 # Images, icons, and static assets
├── .github/               # GitHub configuration
├── App.tsx                # Main application component
├── package.json           # Dependencies and scripts
└── [config files]         # ESLint, Prettier, TypeScript configs
```

---

## 📚 Documentation

- **[LINTING.md](./LINTING.md)** - ESLint configuration and coding standards
- **[ANDROID_BUILD.md](./ANDROID_BUILD.md)** - Detailed Android build instructions
- **[.github/GITHUB_ACTIONS_SETUP.md](./.github/GITHUB_ACTIONS_SETUP.md)** - Automated APK build setup
- **[GITHUB_INTEGRATION.md](./GITHUB_INTEGRATION.md)** - GitHub sync setup and usage
- **[CSV_Import_Format.md](./CSV_Import_Format.md)** - CSV import format specification
- **[DATA_REPOSITORY_TEMPLATE.md](./DATA_REPOSITORY_TEMPLATE.md)** - Data repository setup guide

---

## 🔧 Development Workflow

### Code Style

- **TypeScript Strict Mode** enabled - all strict checks enforced
- **Single quotes** for strings
- **Semicolons required**
- **2-space indentation**
- **80 character line width**
- Use path aliases: `@/*`, `@components/*`, `@screens/*`, `@models/*`, `@utils/*`

### Git Workflow

- **Pre-commit hooks** automatically run linting and formatting
- **Husky** enforces code quality at commit time
- Always run `npm run check-all` before committing

### Best Practices

- Use explicit types for function parameters
- Avoid `any` type - use proper types or `unknown`
- Prefix unused variables with underscore: `_unusedVar`
- Use `StyleSheet.create()` for all styles
- Follow React Hooks rules

---

## 🤝 Contributing

This is currently a private project, but contributions are welcome through the standard GitHub workflow:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes** following the code style guidelines
4. **Run code quality checks** (`npm run check-all`)
5. **Commit your changes** (`git commit -m 'Add amazing feature'`)
6. **Push to the branch** (`git push origin feature/amazing-feature`)
7. **Open a Pull Request**

### Development Guidelines

- Ensure all TypeScript type checks pass
- Follow the existing code style and conventions
- Add comments for complex logic
- Test on Android device/emulator before submitting
- Update documentation for significant changes

---

## 👥 Contributors

Special thanks to those who have contributed to making Junktown Intelligence better:

- **[Jim Scanlan (calmninjas)](https://github.com/calmninjas)** - Testing, bug reports, and feature ideas

---

## 🙏 Acknowledgments

- Built with [React Native](https://reactnative.dev/) and [Expo](https://expo.dev/)
- Navigation powered by [React Navigation](https://reactnavigation.org/)
- Charts and visualizations by [React Native Gifted Charts](https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts)
- Designed for tabletop RPGs, LARPs, worldbuilding, and storytelling across all genres

---

<div align="center">

**Developed with ❤️ by Jacob McCarthy**

[GitHub](https://github.com/mccarjac) • [Report Bug](https://github.com/mccarjac/JunktownIntelligence/issues) • [Request Feature](https://github.com/mccarjac/JunktownIntelligence/issues)

**Support the Project:** [Patreon](https://www.patreon.com/cw/MugatuCreations) • [Buy Me a Coffee](https://buymeacoffee.com/mugatucreations) • [PayPal](https://paypal.me/mccarjac) • [Venmo](https://venmo.com/mccarjac) • [Cash App](https://cash.app/$mccarjac)

</div>
