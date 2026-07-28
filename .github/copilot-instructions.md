# Copilot instructions

**Junktown Intelligence** is the Afterworlds flavor of
[Lore](https://github.com/mccarjac/lore), a genre-neutral React Native / Expo
engine for campaign data.

Almost nothing lives in this repository. Screens, storage, sync, navigation and
derived-stat computation all come from the `lore` package. What is here is the
**ruleset** — the Afterworlds content and the vocabulary that makes the app say
"Species", "Perks", "Distinctions" and "Junktown Office" — plus this app's
identity and icons.

## Read this first

The conventions live in **[AGENTS.md](../AGENTS.md)**. For anything about how a
screen, a storage mutator or a stat calculation works, read
[Lore's AGENTS.md](https://github.com/mccarjac/lore/blob/main/AGENTS.md) — that
is where the code is.

The short version:

- `npm run check-all` must pass before every commit.
- **`configureLore` runs in `index.ts`**, before `registerRootComponent`. The
  engine's field migration normalizes stored data against the ruleset's
  attribute table, so running it unconfigured would rewrite real characters
  against the wrong one.
- **The parity suite pins 27 real derived-stat numbers.** Moving one is a rules
  change, not a refactor.
- **Two import paths:** `lore/ruleset` for the engine without React Native
  (what the ruleset and its tests use), `lore` for the app itself.
- **Not Afterworlds-specific? It belongs upstream in Lore**, not here.

## Where things are

- Conventions — [AGENTS.md](../AGENTS.md)
- The ruleset — `src/rulesets/afterworlds/`, content in `content/`
- Engine docs — <https://github.com/mccarjac/lore/tree/main/docs>
- Consuming the engine — <https://github.com/mccarjac/lore/blob/main/docs/consuming-lore.md>
