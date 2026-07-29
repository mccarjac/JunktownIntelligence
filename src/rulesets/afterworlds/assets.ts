import type { RulesetAssets } from 'lore/ruleset';
import junktownMap from './assets/JunktownMap.png';

/**
 * Bundled images this ruleset's `imageKey`s resolve to. Kept out of the
 * `RulesetDefinition` itself because a `require`d image cannot round-trip
 * through JSON and the definition must stay serializable.
 */
export const afterworldsAssets: RulesetAssets = {
  map: junktownMap,
};
