import { getNumber, validateRuleset, getLabel } from 'lore/ruleset';
import { afterworldsRuleset } from '../../src/rulesets/afterworlds';
import { SPECIES_BASE_STATS } from '../../src/rulesets/afterworlds/content/speciesTypes';
import {
  AVAILABLE_PERKS,
  AVAILABLE_DISTINCTIONS,
} from '../../src/rulesets/afterworlds/content/gameData';

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

  it('gives every trait category a color, so charts need no fallback', () => {
    afterworldsRuleset.traitCategories.forEach(category => {
      expect(category.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it('preserves the palette FactionStatsScreen used to hardcode', () => {
    const colorOf = (id: string) =>
      afterworldsRuleset.traitCategories.find(c => c.id === id)?.color;

    expect(colorOf('Agility')).toBe('#3498DB');
    expect(colorOf('Medical')).toBe('#F44336');
    expect(colorOf('Technical')).toBe('#607D8B');
  });

  it('defaults new characters to Human, as the form screen used to', () => {
    expect(afterworldsRuleset.defaultArchetypeId).toBe('Human');
    expect(
      afterworldsRuleset.archetypes.some(
        a => a.id === afterworldsRuleset.defaultArchetypeId
      )
    ).toBe(true);
  });

  it('keeps saying Species, Perks and Junktown Office on screen', () => {
    // The Phase 1 renames moved the *fields* to neutral names; these overrides
    // are the only reason the app still reads the way its players expect.
    // Terminology assertions belong here with the flavor, not in the engine's
    // own suites.
    expect(getLabel(afterworldsRuleset, 'archetype.singular')).toBe('Species');
    expect(getLabel(afterworldsRuleset, 'trait.plural')).toBe('Perks');
    expect(getLabel(afterworldsRuleset, 'quality.plural')).toBe('Distinctions');
    expect(getLabel(afterworldsRuleset, 'modification.singular')).toBe(
      'Cyberware'
    );
    expect(getLabel(afterworldsRuleset, 'questSponsor.singular')).toBe(
      'Junktown Office'
    );
  });

  it('enables every feature — Junktown uses all of them', () => {
    expect(Object.values(afterworldsRuleset.features)).toHaveLength(8);
    Object.values(afterworldsRuleset.features).forEach(enabled => {
      expect(enabled).toBe(true);
    });
  });

  it.each([
    ['Human', 2, 2, 5, 5],
    ['Unturned', 0, 3, 0, 10],
    ['Rad-Titan', 3, 0, 10, 0],
    ['Mutoid', 2, 1, 5, 5],
  ])(
    'reproduces %s base values and caps exactly',
    (id, health, limit, healthCap, limitCap) => {
      const attributes = afterworldsRuleset.archetypes.find(
        a => a.id === id
      )?.attributes;

      expect(getNumber(attributes, 'health')).toBe(health);
      expect(getNumber(attributes, 'limit')).toBe(limit);
      expect(getNumber(attributes, 'healthCap')).toBe(healthCap);
      expect(getNumber(attributes, 'limitCap')).toBe(limitCap);
    }
  );

  it('declares caps as their own attributes, linked from the resource', () => {
    const health = afterworldsRuleset.attributes.find(a => a.id === 'health');
    const healthCap = afterworldsRuleset.attributes.find(
      a => a.id === 'healthCap'
    );

    expect(health?.role).toBe('resource');
    expect(health?.capAttributeId).toBe('healthCap');
    expect(healthCap?.role).toBe('cap');
  });

  it('carries a trait cap delta faithfully even though the engine ignores it', () => {
    // smarts_20 declares limitCap +1 in gameData. The transform must not
    // silently drop real source data — derived.ts is where the decision not
    // to apply trait cap deltas lives, and the parity suite proves it holds.
    const smarts20 = afterworldsRuleset.traits.find(t => t.id === 'smarts_20');
    expect(smarts20?.modifier?.attributeDeltas?.limitCap).toBe(1);
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
