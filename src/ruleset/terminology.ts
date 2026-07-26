import { useCallback } from 'react';
import { useRuleset } from './context';
import type { RulesetDefinition, TermKey, TerminologyMap } from './types';

export const DEFAULT_TERMINOLOGY: TerminologyMap = {
  'archetype.singular': 'Archetype',
  'archetype.plural': 'Archetypes',
  'trait.singular': 'Trait',
  'trait.plural': 'Traits',
  'traitCategory.singular': 'Category',
  'traitCategory.plural': 'Categories',
  'quality.singular': 'Quality',
  'quality.plural': 'Qualities',
  'modification.singular': 'Modification',
  'modification.plural': 'Modifications',
  'resource.singular': 'Resource',
  'resource.plural': 'Resources',
  'recipe.singular': 'Recipe',
  'recipe.plural': 'Recipes',
  'questSponsor.singular': 'Sponsor',
  'questSponsor.plural': 'Sponsors',
  'map.label': 'Map',
};

export type LabelCasing = 'lower' | 'title';

const applyCasing = (value: string, casing?: LabelCasing): string => {
  if (!casing) return value;
  if (casing === 'lower') return value.toLowerCase();
  return value.replace(
    /\S+/g,
    word => word[0].toUpperCase() + word.slice(1).toLowerCase()
  );
};

/** Non-hook form, for use outside components (e.g. App.tsx navigator options). */
export function getLabel(
  ruleset: RulesetDefinition,
  key: TermKey,
  casing?: LabelCasing
): string {
  const value = ruleset.terminology[key] ?? DEFAULT_TERMINOLOGY[key];
  return applyCasing(value, casing);
}

/**
 * Returns a stable label-lookup function bound to the current ruleset, so a
 * single template literal can pull several nouns without one hook call each.
 */
export function useLabels(): (key: TermKey, casing?: LabelCasing) => string {
  const { ruleset } = useRuleset();
  return useCallback(
    (key: TermKey, casing?: LabelCasing) => getLabel(ruleset, key, casing),
    [ruleset]
  );
}
