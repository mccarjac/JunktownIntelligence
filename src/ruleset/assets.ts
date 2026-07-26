import type { ImageSourcePropType } from 'react-native';
import junktownMap from '../../assets/JunktownMap.png';

/**
 * Maps the asset keys referenced by a RulesetDefinition (map.imageKey,
 * branding.iconKey, branding.splashKey) to bundled images. Kept separate
 * from RulesetDefinition because bundled images cannot round-trip through
 * JSON, and the definition itself must stay serializable.
 */
export type RulesetAssets = Record<string, ImageSourcePropType>;

export const afterworldsAssets: RulesetAssets = {
  map: junktownMap,
};

export const resolveAsset = (
  assets: RulesetAssets,
  key: string | undefined
): ImageSourcePropType | undefined => (key ? assets[key] : undefined);
