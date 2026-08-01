import type { RulesetDefinition } from 'lore/ruleset';

/**
 * What this ruleset calls the engine's generic nouns. **Content, not code** —
 * these override values are the only reason the Junktown app still reads the
 * way its users expect after the Phase 1 field renames. Renaming an engine
 * field must never drag these values along with it.
 *
 * Since Lore's facet-collection generalization (#51), the facet nouns
 * ("Species", "Perks", "Tags", "Distinctions", "Cyberware", "Recipes") no
 * longer live here — they moved onto each `FacetCollection`'s own
 * `singular`/`plural`/`categorySingular`/`categoryPlural` in `./index.ts`.
 * `TermKey` now covers only the engine's own core nouns.
 */
export const afterworldsTerminology: RulesetDefinition['terminology'] = {
  'resource.singular': 'Resource',
  'resource.plural': 'Resources',
  'questSponsor.singular': 'Junktown Office',
  'questSponsor.plural': 'Junktown Offices',
  'map.label': 'Junktown Map',
};
