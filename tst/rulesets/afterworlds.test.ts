import {
  getNumber,
  validateRuleset,
  findFacetCollection,
  type FacetCollection,
} from 'lore/ruleset';
import { afterworldsRuleset } from '../../src/rulesets/afterworlds';
import { SPECIES_BASE_STATS } from '../../src/rulesets/afterworlds/content/speciesTypes';
import {
  AVAILABLE_PERKS,
  AVAILABLE_DISTINCTIONS,
} from '../../src/rulesets/afterworlds/content/gameData';

const collection = (id: string): FacetCollection => {
  const found = findFacetCollection(afterworldsRuleset, id);
  if (!found) {
    throw new Error(`No facet collection with id ${id}`);
  }
  return found;
};

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
    expect(collection('archetypes').entries.map(a => a.id)).toEqual(
      Object.keys(SPECIES_BASE_STATS)
    );
  });

  it('carries every perk as a trait and every distinction as a quality', () => {
    expect(collection('traits').entries).toHaveLength(AVAILABLE_PERKS.length);
    expect(collection('qualities').entries).toHaveLength(
      AVAILABLE_DISTINCTIONS.length
    );
  });

  it('carries 12 trait categories and 36 category bonus rules', () => {
    expect(collection('traits').categories).toHaveLength(12);
    expect(collection('traits').categoryBonuses).toHaveLength(36);
  });

  it('gives every trait category a color, so charts need no fallback', () => {
    (collection('traits').categories ?? []).forEach(category => {
      expect(category.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it('preserves the palette FactionStatsScreen used to hardcode', () => {
    const colorOf = (id: string) =>
      collection('traits').categories?.find(c => c.id === id)?.color;

    expect(colorOf('Agility')).toBe('#3498DB');
    expect(colorOf('Medical')).toBe('#F44336');
    expect(colorOf('Technical')).toBe('#607D8B');
  });

  it('defaults new characters to Human, as the form screen used to', () => {
    expect(collection('archetypes').defaultEntryId).toBe('Human');
    expect(
      collection('archetypes').entries.some(
        a => a.id === collection('archetypes').defaultEntryId
      )
    ).toBe(true);
  });

  it('keeps saying Species, Perks, Distinctions, Cyberware and Junktown Office on screen', () => {
    // The Phase 1 renames moved the *fields* to neutral names; the #51
    // generalization moved the facet nouns onto each collection's own
    // singular/plural. Terminology assertions belong here with the flavor,
    // not in the engine's own suites.
    expect(collection('archetypes').singular).toBe('Species');
    expect(collection('traits').plural).toBe('Perks');
    expect(collection('qualities').plural).toBe('Distinctions');
    expect(collection('modifications').singular).toBe('Cyberware');
  });

  it('enables every feature — Junktown uses all of them', () => {
    expect(Object.values(afterworldsRuleset.features)).toHaveLength(7);
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
      const attributes = collection('archetypes').entries.find(
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
    const smarts20 = collection('traits').entries.find(
      t => t.id === 'smarts_20'
    );
    expect(smarts20?.modifier?.attributeDeltas?.limitCap).toBe(1);
  });

  it('carries the Perfect Mutant carve-out as a score exclusion', () => {
    expect(collection('traits').scoreExclusions).toEqual([
      {
        whenCollectionId: 'archetypes',
        whenEntryId: 'Perfect Mutant',
        groupId: 'mutant',
      },
    ]);
  });

  it('places Tech-Mutant in the organic, mutant, and android groups', () => {
    const archetype = collection('archetypes').entries.find(
      a => a.id === 'Tech-Mutant'
    );
    expect(archetype?.groups?.slice().sort()).toEqual(
      ['organic', 'mutant', 'android'].sort()
    );
  });

  it('places Unknown in no group', () => {
    const archetype = collection('archetypes').entries.find(
      a => a.id === 'Unknown'
    );
    expect(archetype?.groups).toEqual([]);
  });
});
