import { afterworldsRuleset } from '@/ruleset/defaultRuleset';
import { validateRuleset } from '@/ruleset/validate';
import { SPECIES_BASE_STATS } from '@models/speciesTypes';
import { AVAILABLE_PERKS, AVAILABLE_DISTINCTIONS } from '@models/gameData';

describe('afterworldsRuleset', () => {
  it('is valid', () => {
    expect(validateRuleset(afterworldsRuleset)).toEqual({
      valid: true,
      issues: [],
    });
  });

  it('is JSON-serializable', () => {
    const roundTripped = JSON.parse(JSON.stringify(afterworldsRuleset));
    expect(roundTripped).toEqual(afterworldsRuleset);
  });

  it('carries one archetype per species, in SPECIES_BASE_STATS order', () => {
    expect(afterworldsRuleset.archetypes.map(a => a.id)).toEqual(
      Object.keys(SPECIES_BASE_STATS)
    );
  });

  it('carries every perk as a trait and every distinction as a quality', () => {
    expect(afterworldsRuleset.traits).toHaveLength(AVAILABLE_PERKS.length);
    expect(afterworldsRuleset.qualities).toHaveLength(
      AVAILABLE_DISTINCTIONS.length
    );
  });

  it('carries 12 trait categories and 36 category bonus rules', () => {
    expect(afterworldsRuleset.traitCategories).toHaveLength(12);
    expect(afterworldsRuleset.categoryBonuses).toHaveLength(36);
  });

  it.each([
    ['Human', { health: 2, limit: 2 }, { health: 5, limit: 5 }],
    ['Unturned', { health: 0, limit: 3 }, { health: 0, limit: 10 }],
    ['Rad-Titan', { health: 3, limit: 0 }, { health: 10, limit: 0 }],
    ['Mutoid', { health: 2, limit: 1 }, { health: 5, limit: 5 }],
  ])('reproduces %s base values and caps exactly', (id, baseValues, caps) => {
    const archetype = afterworldsRuleset.archetypes.find(a => a.id === id);
    expect(archetype?.baseValues).toEqual(baseValues);
    expect(archetype?.caps).toEqual(caps);
  });

  it('carries the Perfect Mutant carve-out as an archetype rule', () => {
    expect(afterworldsRuleset.archetypeRules).toEqual([
      {
        archetypeId: 'Perfect Mutant',
        kind: 'excludeCategoryScoreFromGroupRestrictedTraits',
        groupId: 'mutant',
      },
    ]);
  });

  it('places Tech-Mutant in the organic, mutant, and android groups', () => {
    const archetype = afterworldsRuleset.archetypes.find(
      a => a.id === 'Tech-Mutant'
    );
    expect(archetype?.groups.sort()).toEqual(
      ['organic', 'mutant', 'android'].sort()
    );
  });

  it('places Unknown in no group', () => {
    const archetype = afterworldsRuleset.archetypes.find(
      a => a.id === 'Unknown'
    );
    expect(archetype?.groups).toEqual([]);
  });
});
