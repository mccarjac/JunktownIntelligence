/**
 * Derived-stat numbers produced by the PRE-generalization implementation
 * (src/utils/derivedStats.ts, before issues #3-#7). This is the parity oracle
 * for the data-driven rewrite in #6: the new engine must reproduce every one
 * of these exactly for the Afterworlds ruleset.
 *
 * Captured with a fresh module registry per case. That matters: the old
 * implementation mutated the shared SPECIES_BASE_STATS objects when applying
 * modifications cap modifiers, so a single-process capture would have baked
 * cross-character cap leakage into these numbers.
 */
export interface BaselineEntry {
  maxHealth: number;
  maxLimit: number;
  tagScores: Record<string, number>;
}

export const DERIVED_STATS_BASELINE: Record<string, BaselineEntry> = {
  'bare:Android': {
    maxHealth: 2,
    maxLimit: 1,
    tagScores: {},
  },
  'bare:Drone': {
    maxHealth: 2,
    maxLimit: 1,
    tagScores: {},
  },
  'bare:Human': {
    maxHealth: 2,
    maxLimit: 2,
    tagScores: {},
  },
  'bare:Mutant': {
    maxHealth: 2,
    maxLimit: 1,
    tagScores: {},
  },
  'bare:Nomad': {
    maxHealth: 2,
    maxLimit: 1,
    tagScores: {},
  },
  'bare:Stray': {
    maxHealth: 2,
    maxLimit: 1,
    tagScores: {},
  },
  'bare:Unturned': {
    maxHealth: 0,
    maxLimit: 3,
    tagScores: {},
  },
  'bare:Unknown': {
    maxHealth: 2,
    maxLimit: 1,
    tagScores: {},
  },
  'bare:Cyborg': {
    maxHealth: 2,
    maxLimit: 1,
    tagScores: {},
  },
  'bare:Mook': {
    maxHealth: 2,
    maxLimit: 1,
    tagScores: {},
  },
  'bare:Mutoid': {
    maxHealth: 2,
    maxLimit: 1,
    tagScores: {},
  },
  'bare:Perfect Mutant': {
    maxHealth: 2,
    maxLimit: 1,
    tagScores: {},
  },
  'bare:Rad-Titan': {
    maxHealth: 3,
    maxLimit: 0,
    tagScores: {},
  },
  'bare:Roadkill': {
    maxHealth: 2,
    maxLimit: 1,
    tagScores: {},
  },
  'bare:Tech-Mutant': {
    maxHealth: 2,
    maxLimit: 1,
    tagScores: {},
  },
  'endurance3:Human': {
    maxHealth: 3,
    maxLimit: 2,
    tagScores: { Endurance: 3 },
  },
  'endurance6:Human': {
    maxHealth: 4,
    maxLimit: 2,
    tagScores: { Endurance: 6 },
  },
  'endurance10:Human': {
    maxHealth: 5,
    maxLimit: 2,
    tagScores: { Endurance: 10 },
  },
  'pm:restricted': {
    maxHealth: 2,
    maxLimit: 2,
    tagScores: { Agility: 3 },
  },
  'mutant:restricted': {
    maxHealth: 2,
    maxLimit: 2,
    tagScores: { Agility: 4, Charisma: 1 },
  },
  'perkCaps:Human': {
    maxHealth: 1,
    maxLimit: 3,
    tagScores: { Smarts: 1 },
  },
  'cyberCaps:Human': {
    maxHealth: 7,
    maxLimit: 7,
    tagScores: {},
  },
  'afterCyber:Human': {
    maxHealth: 2,
    maxLimit: 2,
    tagScores: {},
  },
  'afterCyber:endurance10': {
    maxHealth: 5,
    maxLimit: 2,
    tagScores: { Endurance: 10 },
  },
  perkCapsDiscriminating: {
    maxHealth: 1,
    maxLimit: 5,
    tagScores: { Smarts: 11 },
  },
  'cyberTags:Human': {
    maxHealth: 2,
    maxLimit: 2,
    tagScores: { Agility: 3 },
  },
};
