import {
  AVAILABLE_PERKS,
  AVAILABLE_RECIPES,
  AVAILABLE_DISTINCTIONS,
  TAG_SCORE_BONUSES,
  PerkTag,
} from '@/models/gameData';
import { SPECIES_BASE_STATS, Species } from '@/models/speciesTypes';

// Guardrails for the (currently placeholder) game-rules tables in gameData.ts.
// See issue #116: the real balance data still needs to come from the maintainer.
// These tests don't validate the *values* are correct — only that the tables are
// internally consistent, so real data can be dropped in without silently breaking
// IDs, tags, or references.

const validSpecies = new Set(Object.keys(SPECIES_BASE_STATS));

const tagPrefixFor = (tag: PerkTag): string => tag.toLowerCase();

const assertUniqueIds = (ids: string[]): void => {
  const seen = new Set<string>();
  const duplicates = ids.filter(id => {
    if (seen.has(id)) return true;
    seen.add(id);
    return false;
  });
  expect(duplicates).toEqual([]);
};

describe('gameData', () => {
  describe('AVAILABLE_PERKS', () => {
    it('has unique ids', () => {
      assertUniqueIds(AVAILABLE_PERKS.map(p => p.id));
    });

    it('ids are prefixed with their own tag', () => {
      const mismatched = AVAILABLE_PERKS.filter(
        p => !p.id.startsWith(`${tagPrefixFor(p.tag)}_`)
      ).map(p => `${p.id} (tag: ${p.tag})`);
      expect(mismatched).toEqual([]);
    });

    it('recipeIds reference recipes that exist', () => {
      const recipeIds = new Set(AVAILABLE_RECIPES.map(r => r.id));
      const dangling = AVAILABLE_PERKS.flatMap(p =>
        (p.recipeIds ?? []).filter(id => !recipeIds.has(id))
      );
      expect(dangling).toEqual([]);
    });

    it('allowedSpecies only reference known species', () => {
      const invalid = AVAILABLE_PERKS.flatMap(p =>
        (p.allowedSpecies ?? [])
          .filter(species => !validSpecies.has(species))
          .map(species => `${p.id}: ${species}`)
      );
      expect(invalid).toEqual([]);
    });

    // Ratchet: fails if this count goes UP (new perk landed undocumented) or
    // DOWN without updating the constant (progress toward #116 that isn't
    // reflected here). Update EXPECTED_UNDOCUMENTED_PERKS as descriptions land.
    it('tracks perks still missing a description (#116)', () => {
      const EXPECTED_UNDOCUMENTED_PERKS = 272;
      const undocumented = AVAILABLE_PERKS.filter(
        p => p.description.trim() === ''
      ).length;
      expect(undocumented).toBe(EXPECTED_UNDOCUMENTED_PERKS);
    });
  });

  describe('AVAILABLE_RECIPES', () => {
    it('has unique ids', () => {
      assertUniqueIds(AVAILABLE_RECIPES.map(r => r.id));
    });

    it('has at least one material per recipe', () => {
      const empty = AVAILABLE_RECIPES.filter(r => r.materials.length === 0).map(
        r => r.id
      );
      expect(empty).toEqual([]);
    });
  });

  describe('AVAILABLE_DISTINCTIONS', () => {
    it('has unique ids', () => {
      assertUniqueIds(AVAILABLE_DISTINCTIONS.map(d => d.id));
    });

    it('allowedSpecies only reference known species', () => {
      const invalid = AVAILABLE_DISTINCTIONS.flatMap(d =>
        (d.allowedSpecies ?? [])
          .filter(species => !validSpecies.has(species))
          .map(species => `${d.id}: ${species}`)
      );
      expect(invalid).toEqual([]);
    });
  });

  describe('TAG_SCORE_BONUSES', () => {
    it('has an entry for every PerkTag', () => {
      const tags = Object.values(PerkTag);
      const missing = tags.filter(tag => !TAG_SCORE_BONUSES[tag]);
      expect(missing).toEqual([]);
    });

    it('requiredScore is strictly ascending within each tag', () => {
      const outOfOrder = Object.entries(TAG_SCORE_BONUSES).filter(
        ([, bonuses]) =>
          bonuses.some(
            (bonus, i) =>
              i > 0 && bonus.requiredScore <= bonuses[i - 1].requiredScore
          )
      );
      expect(outOfOrder.map(([tag]) => tag)).toEqual([]);
    });

    it('every bonus grants at least one of health/limit', () => {
      const empty = Object.entries(TAG_SCORE_BONUSES).flatMap(
        ([tag, bonuses]) =>
          bonuses
            .filter(
              bonus => bonus.health === undefined && bonus.limit === undefined
            )
            .map(bonus => `${tag}@${bonus.requiredScore}`)
      );
      expect(empty).toEqual([]);
    });
  });

  describe('SPECIES_BASE_STATS', () => {
    it('caps are greater than or equal to their base values', () => {
      const invalid = (
        Object.entries(SPECIES_BASE_STATS) as [
          Species,
          (typeof SPECIES_BASE_STATS)[Species],
        ][]
      )
        .filter(
          ([, stats]) =>
            stats.healthCap < stats.baseHealth ||
            stats.limitCap < stats.baseLimit
        )
        .map(([species]) => species);
      expect(invalid).toEqual([]);
    });
  });
});
