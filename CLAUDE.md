# CLAUDE.md

This project's guidance for AI coding agents lives in **[AGENTS.md](./AGENTS.md)**.

The short version: this repository is a thin shell around the
[Lore](https://github.com/mccarjac/lore) engine. The only real code here is the
Afterworlds ruleset in `src/rulesets/afterworlds/`. Screens, storage, sync and
derived-stat computation are upstream — read Lore's AGENTS.md for those.

- **Before committing:** `npm run check-all` must pass.
- **`configureLore` runs in `index.ts`**, before `registerRootComponent` —
  storage migrations depend on it.
- **The 27-case parity suite** pins real players' derived stats. Moving one of
  those numbers is a rules change, not a refactor.
- **Not Afterworlds-specific? It belongs upstream in Lore.**
