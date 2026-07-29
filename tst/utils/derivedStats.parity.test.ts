/**
 * Parity guard for the Phase 1 data-model generalization (issues #3-#7).
 *
 * `DERIVED_STATS_BASELINE` was captured from the pre-generalization
 * implementation. Every rename commit and, most importantly, the data-driven
 * rewrite in #6 must keep these numbers identical for the Afterworlds
 * ruleset — if a case here moves, user-visible stat numbers moved with it.
 */
import {
  AVAILABLE_PERKS,
  PerkTag,
} from '../../src/rulesets/afterworlds/content/gameData';
import {
  SPECIES_BASE_STATS,
  type Species,
} from '../../src/rulesets/afterworlds/content/speciesTypes';
import {
  calculateDerivedStats,
  type Modification,
  type GameCharacter,
} from 'lore/ruleset';
import { afterworldsRuleset } from '../../src/rulesets/afterworlds';
import { DERIVED_STATS_BASELINE } from '../fixtures/derivedStatsBaseline';

const TS = '2026-01-01T00:00:00.000Z';

const make = (
  archetypeId: Species,
  traitIds: string[],
  modifications?: Modification[]
): GameCharacter =>
  ({
    id: 'c',
    name: 'c',
    archetypeId,
    traitIds,
    qualityIds: [],
    factions: [],
    relationships: [],
    modifications,
    createdAt: TS,
    updatedAt: TS,
  }) as GameCharacter;

/** Unrestricted perks of a tag, in declaration order. */
const openPerksByTag = (tag: PerkTag, n: number): string[] =>
  AVAILABLE_PERKS.filter(p => p.tag === tag && !p.allowedSpecies)
    .slice(0, n)
    .map(p => p.id);

const MUTANT_RESTRICTED = ['agility_15', 'charisma_17'];

const CAP_CYBERWARE: Modification[] = [
  {
    name: 'Reinforced Frame',
    description: '',
    modifier: {
      attributeDeltas: { health: 5, limit: 5, healthCap: 3, limitCap: 2 },
    },
  },
] as Modification[];

/** The full case matrix, keyed to match the baseline fixture. */
export const buildParityCases = (): Record<string, GameCharacter> => {
  const cases: Record<string, GameCharacter> = {};

  (Object.keys(SPECIES_BASE_STATS) as Species[]).forEach(s => {
    cases[`bare:${s}`] = make(s, []);
  });

  [3, 6, 10].forEach(n => {
    cases[`endurance${n}:Human`] = make(
      'Human',
      openPerksByTag(PerkTag.Endurance, n)
    );
  });

  const openAgility = openPerksByTag(PerkTag.Agility, 3);
  cases['pm:restricted'] = make('Perfect Mutant', [
    ...MUTANT_RESTRICTED,
    ...openAgility,
  ]);
  cases['mutant:restricted'] = make('Mutant', [
    ...MUTANT_RESTRICTED,
    ...openAgility,
  ]);

  cases['perkCaps:Human'] = make('Human', ['smarts_20']);
  cases['perkCapsDiscriminating'] = make('Human', [
    'smarts_20',
    ...openPerksByTag(PerkTag.Smarts, 10),
  ]);

  cases['cyberCaps:Human'] = make('Human', [], CAP_CYBERWARE);
  cases['afterCyber:Human'] = make('Human', []);
  cases['afterCyber:endurance10'] = make(
    'Human',
    openPerksByTag(PerkTag.Endurance, 10)
  );

  cases['cyberTags:Human'] = make('Human', [], [
    {
      name: 'Targeting Suite',
      description: '',
      modifier: { categoryDeltas: { [PerkTag.Agility]: 3 } },
    },
  ] as Modification[]);

  return cases;
};

describe('derived stats — Afterworlds parity', () => {
  const cases = buildParityCases();

  it('covers every baseline case', () => {
    expect(Object.keys(cases).sort()).toEqual(
      Object.keys(DERIVED_STATS_BASELINE).sort()
    );
  });

  Object.entries(cases).forEach(([label, character]) => {
    it(`matches the baseline for ${label}`, () => {
      const stats = calculateDerivedStats(character, afterworldsRuleset);
      const expected = DERIVED_STATS_BASELINE[label];

      // The old shape's maxHealth/maxLimit are now resource ids.
      expect(stats.values.health).toBe(expected.maxHealth);
      expect(stats.values.limit).toBe(expected.maxLimit);
      expect(Object.fromEntries(stats.categoryScores)).toEqual(
        expected.tagScores
      );
    });
  });
});

describe('derived stats — shared base-stat mutation (issue #6)', () => {
  /**
   * Regression guard for derivedStats.ts:79-83. Cap modifiers were applied
   * to `SPECIES_BASE_STATS[species]` directly, which is a shared reference,
   * so one character's modifications permanently raised the cap for every other
   * character of that species in the same process.
   *
   * Deliberately does NOT restore base stats between the two calls inside
   * the test — that leak is exactly what is being asserted against.
   *
   * #6 fixed it by copying base values and caps before applying modifiers.
   */
  it('does not leak a cap bonus onto other characters of the same archetype', () => {
    // A Human whose raw health (6) exceeds Human's real healthCap of 5.
    const plain = make('Human', openPerksByTag(PerkTag.Endurance, 10));
    const before = calculateDerivedStats(plain, afterworldsRuleset).values
      .health;

    calculateDerivedStats(make('Human', [], CAP_CYBERWARE), afterworldsRuleset);

    const after = calculateDerivedStats(plain, afterworldsRuleset).values
      .health;

    expect(before).toBe(5);
    expect(after).toBe(before);
  });
});
