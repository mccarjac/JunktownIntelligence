# AGENTS.md

Guidance for AI coding agents working in this repository. Keep it accurate —
update it when conventions change.

## What this is

**Junktown Intelligence** is a React Native / Expo mobile app (TypeScript,
strict mode) for managing tabletop-RPG / LARP campaign data: characters,
factions, locations, events, plus Discord message ingestion and GitHub-backed
data sync. All data lives locally in AsyncStorage; there is no backend.

Stack: React Native 0.81 · Expo 54 · React Navigation 7 (drawer + stack) ·
AsyncStorage · Jest + @testing-library/react-native.

## Commands

```bash
npm install            # install deps
npm test               # Jest (tests live in tst/)
npm run type-check     # tsc --noEmit
npm run lint           # eslint (must have 0 errors; warnings are tolerated)
npm run format         # prettier --write
npm run check-all      # type-check + lint + format:check + test — run before every commit
npm run android        # run on device/emulator (web/ios also available)
```

**The gate is `npm run check-all`, and it must be green before you commit.**
CI (`.github/workflows/build-apk.yml`, on push to `master`) runs `type-check`,
`lint`, and `test` before building the APK, so a red gate fails the build — do
not rely on the pre-commit hook alone (it only checks staged files and is
bypassable).

## Layout

```
src/
  components/common/    reusable UI (Card, Section, Header*Button, ...)
  components/screens/   Base{List,Form,Detail}Screen — generic screen scaffolds
  screens/<feature>/    character/ faction/ location/ events/ discord/
  models/               types.ts (all domain types), gameData.ts, speciesTypes.ts
  navigation/types.ts   navigator + param-list types
  styles/               theme.ts (colors/spacing/typography), commonStyles.ts
  utils/                storage, export/import, discord, git, stats
tst/                    Jest tests, mirroring src/
```

Path aliases (tsconfig + babel-plugin-module-resolver): `@/*` → `src/*`, plus
`@components/*`, `@screens/*`, `@models/*`, `@utils/*`. Use them.

## Data & storage architecture

- All persistence goes through `SafeAsyncStorageJSONParser`
  (`src/utils/safeAsyncStorageJSONParser.ts`) — a crash-safe wrapper around
  AsyncStorage. Never call AsyncStorage directly.
- `src/utils/characterStorage.ts` is the storage layer for characters, factions,
  locations, and events. Storage keys: `gameCharacterManager`,
  `gameCharacterManager_factions`, `gameCharacterManager_locations`,
  `gameCharacterManager_events`. Discord data has its own module
  (`discordStorage.ts`).
- **Concurrency rule (important):** storage mutators use a read-modify-write
  pattern (`load...()` → mutate → `save...()`). To prevent lost updates from
  concurrent writes, every mutator is wrapped in `runExclusive(KEY, fn)` from
  `src/utils/storageQueue.ts`, which serializes operations per storage key.
  **When you add or edit a storage mutator, wrap its read-modify-write in
  `runExclusive` under the relevant key.** If an operation touches two keys
  (e.g. deleting a faction also edits characters), wrap each key's section
  separately — never nest `runExclusive` calls for the _same_ key (it
  deadlocks).

## Conventions & gotchas

- **Style:** single quotes, semicolons, 2-space indent, 80-col, trailing
  commas, arrow parens omitted for a single param. Prettier is authoritative —
  run `npm run format`.
- **No `console.log`.** Debug logging was removed from the storage/discord
  utils; keep it out. `console.error` in a catch for genuine failures is fine
  (it lints as a warning, which is acceptable).
- **No `any`** — use precise types or `unknown` (lints as a warning).
- **Unused catch bindings:** use bare `catch {}` rather than `catch (error)`
  when the error is unused (eslint errors otherwise).
- **Dates:** event/date strings are `YYYY-MM-DD`. Parse and format them with the
  helpers in `src/utils/dateUtils.ts` (`parseDateString`, `formatEventDate*`).
  Never do `new Date('YYYY-MM-DD')` — it parses as UTC and shifts the day in
  local time zones (this caused a real off-by-one display bug).
- **Discord messages:** downloaded image URIs are on `DiscordMessage.imageUris`
  (there is no `images` field).
- **Bidirectional faction relationships:** creating/updating/deleting a faction
  relationship must keep the reciprocal relationship on the other faction in
  sync, and renaming a faction must update its references on characters and on
  other factions' relationships. See `updateFaction` / `createFaction` in
  `characterStorage.ts` for the pattern.
- **Screens:** list/form/detail screens are built on the generics in
  `src/components/screens/`. Follow the existing feature folders rather than
  hand-rolling new layouts, and keep the dark theme from `styles/theme.ts`.

## Testing

- Jest with `jest-expo`; tests live in `tst/` mirroring `src/`.
- Storage tests mock `SafeAsyncStorageJSONParser`
  (`jest.mock('@/utils/safeAsyncStorageJSONParser')`) and `uuid`. Many tests
  assert on an ordered sequence of `getItem` calls via `mockResolvedValueOnce`,
  so if you change the order/number of storage reads in a function, update the
  corresponding mocks.
- Add tests for new storage behavior and bug fixes. For concurrency-sensitive
  code, see `tst/utils/storageQueue.test.ts` and
  `tst/utils/characterStorage.concurrency.test.ts` for the stateful-store
  pattern that proves serialization.

### Coverage reporting

- `npm run test:coverage` runs Jest with coverage; `.github/workflows/coverage.yml`
  runs it on every PR and posts a sticky comment scoped to changed files. It is
  **informational only** — no threshold is enforced yet, so it never blocks a PR.
- `jest.config.js`'s `collectCoverageFrom` covers all of `src/utils`,
  `src/components`, and `src/screens` (index files excluded) — nothing is
  hidden from the report. Two config details matter for this to actually
  work: `roots` must include `<rootDir>/src` (not just `<rootDir>/tst`), or
  Jest silently omits zero-coverage rows for any file no test imports; and
  `transformIgnorePatterns` must allow-list `expo-.*` and `@octokit` (not
  just bare `expo`), since `expo-file-system` and `@octokit/rest` ship ESM
  and would otherwise fail to parse the moment coverage collection touches
  them.
- Real baseline as of this writing: **~26% statements / ~26% functions**
  (was ~21%; before that it was previously reported as ~75%, which only
  looked healthy because most of `src/screens` and several `src/utils`
  modules were invisible to the report — see the config details above).

### Test coverage gaps

Ranked by value if you're looking for where to add tests next (highest
blast-radius / lowest-effort first):

1. **`src/components/screens/BaseDetailScreen.tsx`** (~7%) and
   **`BaseFormScreen.tsx`** (~17%) — the generic scaffolds nearly every
   detail/form screen is built on; tests here have the highest leverage per
   line written.
2. **`src/utils/exportImport.ts`** (~11% covered) — the plain-JSON path of
   `importCharacterData`/`mergeCharacterData` is now tested (see
   `tst/utils/exportImport.test.ts`; note `jest.setup.js` mocks
   `expo-file-system/legacy`, the specifier this file actually imports, not
   bare `expo-file-system`). Still untested: `exportCharacterData` and the
   `.zip` branches of import/merge — all need `react-native-zip-archive` +
   directory-walking (`makeDirectoryAsync`/`copyAsync`/`getInfoAsync`/
   `readDirectoryAsync`) + `expo-sharing` mocked.
3. **`src/utils/gitIntegration.ts`** (~900 lines, untested) — GitHub-backed
   sync; highest blast radius, needs `@octokit` mocking.
4. ~~`src/utils/discordStorage.ts`~~ — **done.** Was untested and had the
   same unwrapped read-modify-write bug `characterStorage.ts` had (no
   `runExclusive`); both the bug and the test gap are fixed
   (`tst/utils/discordStorage.test.ts` +
   `tst/utils/discordStorage.concurrency.test.ts`, ~75% covered).
5. **`src/utils/influenceAnalysis.ts`** (~370 lines) and
   **`src/utils/factionStats.ts`** (~260 lines) — both pure computation,
   both untested; easy, high-signal unit tests.
6. **`src/utils/discordApi.ts`** and **`src/utils/discordCharacterExtraction.ts`**
   (untested) — parsing/ingesting external Discord data; boundary-parsing
   bugs are likely here.
7. **Every detail/form screen, and the whole `src/screens/discord/`,
   `src/screens/events/`, and `src/screens/location/` folders** — entirely
   untested (0%). Only the `*ListScreen` components have tests
   (`tst/screens/character/CharacterListScreen.test.tsx`,
   `tst/screens/faction/FactionListScreen.test.tsx`); use those as the
   template.

## Scope discipline

Prefer reusing existing utilities over adding new ones. Data-storage format
changes, navigation restructures, and new native dependencies are
higher-risk — call them out explicitly and keep them minimal. Always leave
`npm run check-all` green.
