# AGENTS.md

Guidance for AI coding agents working in this repository. Keep it accurate —
update it when conventions change.

## What this is

**Junktown Intelligence** is the Afterworlds flavor of
[Lore](https://github.com/mccarjac/lore), a genre-neutral React Native / Expo
engine for tabletop-RPG and LARP campaign data.

**Almost nothing lives here.** Characters, factions, locations, events, quests,
Discord ingestion, GitHub sync, every screen and all of the storage come from
the `lore` package. This repository is a shell around it: the ruleset that
makes the app say "Species", "Perks", "Distinctions" and "Junktown Office",
plus this app's identity, its icons, and its release cadence.

If you are looking for how a screen works, how storage is written, or how
derived stats are computed, the answer is upstream — read Lore's `AGENTS.md`,
not this file.

## Layout

```
index.ts                    configureLore(...) then registerRootComponent
App.tsx                     renders <LoreApp />
app.config.ts               app identity, env-driven, Junktown's defaults
.env.example                every variable, with its default
src/rulesets/afterworlds/   THE FLAVOR — the only real code here
  index.ts                  the RulesetDefinition, derived from content/
  terminology.ts            Species / Perks / Distinctions / Junktown Office
  categories.ts             the twelve trait categories and their colors
  assets.ts + assets/       the Junktown map
  content/                  gameData.ts, speciesTypes.ts — the source tables
tst/
  rulesets/afterworlds.test.ts     the ruleset itself
  utils/derivedStats.parity.test.ts  27 pre-generalization numbers
  fixtures/derivedStatsBaseline.ts   those numbers
assets/                     icon, adaptive icon, splash, favicon
```

## The engine dependency

`package.json` depends on `github:mccarjac/lore#main`. npm runs Lore's
`prepare` at install, so `npm ci` compiles the library — there is no build step
of your own.

**Bumping the engine** is an edit to that ref plus `npm install` and
`npm run check-all`. Read Lore's release notes for changes to
`RulesetDefinition`, to derived-stat computation, or to its peer set; those are
the three that can require work here.

**Peer dependencies:** every native module Lore needs is a direct dependency of
this app, because native modules cannot live in a nested `node_modules`. Add
them with `npx expo install`, never plain `npm install` — Expo picks the
version its SDK ships, and a `^` range on a native module can resolve to a
release whose own React Native peer excludes SDK 54's.

**Two entry points.** `lore` is the app (`LoreApp` and the whole screen tree
behind it); `lore/ruleset` is the engine without React Native. The ruleset and
its tests import the latter — loading the app entry under Jest would drag in
`react-native-gesture-handler`'s native module and require the full RN mock
surface for what are pure-computation tests.

## Rules that matter here

- **`configureLore` must run before anything touches storage**, which is why it
  is in `index.ts` above `registerRootComponent`. The engine's field migration
  normalizes stored data against the _ruleset's_ attribute table; running it
  against Lore's example ruleset would rewrite real characters incorrectly.
  Lore logs a `__DEV__` error if that happens — treat it as a bug here.
- **The parity suite is the contract.** `tst/utils/derivedStats.parity.test.ts`
  holds 27 derived-stat cases captured from the app _before_ it was
  generalized. Any change that moves one of those numbers is a rules change,
  not a refactor, and it changes what real players see.
- **Terminology overrides are content.** `terminology.ts` is the only reason
  the app still reads the way its users expect after the engine renamed its
  fields. Never "tidy" those values to match engine vocabulary.
- **Content is content.** `content/gameData.ts` and `content/speciesTypes.ts`
  are the authored tables, in the legacy Afterworlds vocabulary (`PerkTag`,
  `Species`, `Perk`); `index.ts` transforms them into ruleset shapes at module
  load. Data-entry work happens in `content/`, not in the transform.
- **Anything that is not Afterworlds-specific belongs upstream.** A bug in a
  screen, a storage fix, a new feature — those are Lore PRs. If you find
  yourself wanting to add a `src/screens/` directory here, stop.

## Commands

```bash
npm install
npm run check-all      # type-check + lint + format:check + test
npm run web            # or android / ios
```

## Identity

`app.config.ts` holds no literals it cannot get from the environment, with
Junktown's own values as the defaults. The EAS project id
(`885b4454-…`) belongs to this app — changing the slug or bundle identifier
orphans installed apps and EAS builds.
