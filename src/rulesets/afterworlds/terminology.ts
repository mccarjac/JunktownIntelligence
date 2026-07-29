import type { RulesetDefinition } from 'lore/ruleset';

/**
 * What this ruleset calls the engine's generic nouns. **Content, not code** —
 * these override values are the only reason the Junktown app still reads the
 * way its users expect after the Phase 1 field renames. Renaming an engine
 * field must never drag these values along with it.
 */
export const afterworldsTerminology: RulesetDefinition['terminology'] = {
  'archetype.singular': 'Species',
  'archetype.plural': 'Species',
  'trait.singular': 'Perk',
  'trait.plural': 'Perks',
  'traitCategory.singular': 'Tag',
  'traitCategory.plural': 'Tags',
  'quality.singular': 'Distinction',
  'quality.plural': 'Distinctions',
  'modification.singular': 'Cyberware',
  'modification.plural': 'Cyberware',
  'resource.singular': 'Resource',
  'resource.plural': 'Resources',
  'recipe.singular': 'Recipe',
  'recipe.plural': 'Recipes',
  'questSponsor.singular': 'Junktown Office',
  'questSponsor.plural': 'Junktown Offices',
  'map.label': 'Junktown Map',
};
