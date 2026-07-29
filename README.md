![Logo](https://github.com/mccarjac/JunktownIntelligence/blob/master/assets/adaptive-icon.png)

<div align="center">

# Junktown Intelligence

**Campaign management for the Afterworlds setting — characters, factions,
locations, events and quests, on your phone**

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

## What this is

Junktown Intelligence tracks everything an Afterworlds campaign accumulates:
characters with their Species, Perks, Distinctions and Cyberware; factions and
the alliances between them; locations on the Junktown map; a timeline of
events; quests and their Junktown Office sponsors. It ingests Discord chat,
links it to characters, and shares a campaign through a GitHub repository.
Everything is stored on the device — no account, no backend.

**It is built on [Lore](https://github.com/mccarjac/lore)**, a genre-neutral
engine for exactly this kind of app. Lore supplies the screens, the storage,
the sync and the stat computation; this repository supplies the _ruleset_ — the
Afterworlds archetypes, traits, qualities and vocabulary that turn a generic
campaign manager into this one.

That split is why the app says Species and Perks while the engine underneath
says archetypes and traits: the names are data, not code.

## Features

- **Characters** — Species, Perks, Distinctions, Cyberware, derived Health and
  Limit with caps, images, relationships, faction standings, search
- **Factions** — membership, ally/enemy relationships, per-faction statistics,
  combined-force analysis, an influence report
- **Locations** — the Junktown map with placeable, tappable markers
- **Events and quests** — a dated timeline, quests with sponsors and
  objectives, linked to the events that resolved them
- **Relationship graph** — characters, factions and locations as a force-laid
  graph you can pan, zoom and tune
- **Discord** — pull messages from any number of servers and channels and link
  them to characters
- **GitHub sync** — share a campaign through a repository; exports open a pull
  request, imports do a real three-way merge

## Running it

```bash
git clone https://github.com/mccarjac/JunktownIntelligence.git
cd JunktownIntelligence
npm install
npm run check-all
npm run web        # or: npm run android / npm run ios
```

`npm install` also compiles the engine — Lore is a git dependency whose
`prepare` script builds it, so there is no separate build step.

For device builds see Lore's
[android-build guide](https://github.com/mccarjac/lore/blob/main/docs/android-build.md);
this app's EAS project and signing credentials are its own.

## What lives here

```
index.ts                    registers the ruleset, then the app
App.tsx                     renders Lore's <LoreApp />
app.config.ts               app identity (name, slug, bundle id, EAS project)
src/rulesets/afterworlds/   the ruleset — content, terminology, categories, map
tst/                        the ruleset's tests, and the derived-stat parity suite
assets/                     icon, adaptive icon, splash, favicon
```

Everything else comes from the `lore` package. A bug in a screen, a storage fix
or a new feature belongs [upstream](https://github.com/mccarjac/lore); anything
about Afterworlds content, rules or vocabulary belongs here.

## Updating the engine

```bash
# edit the `lore` ref in package.json, then
npm install
npm run check-all
```

The parity suite is what tells you an engine bump did not move any player's
numbers.

## Contributing

Issues and pull requests welcome. Run `npm run check-all` before committing.
Data-entry work — new perks, distinctions, species — happens in
`src/rulesets/afterworlds/content/`.

## Acknowledgments

- Built on [Lore](https://github.com/mccarjac/lore),
  [React Native](https://reactnative.dev/) and [Expo](https://expo.dev/)
- **[Jim Scanlan (calmninjas)](https://github.com/calmninjas)** — testing, bug
  reports and feature ideas

<div align="center">

**Developed with ❤️ by Jacob McCarthy**

[Report Bug](https://github.com/mccarjac/JunktownIntelligence/issues) •
[Request Feature](https://github.com/mccarjac/JunktownIntelligence/issues)

</div>
