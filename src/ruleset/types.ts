/**
 * Typed, pluggable ruleset schema. A RulesetDefinition must stay fully
 * serializable (no functions, no require()'d assets) so it can round-trip
 * through JSON for a future in-app ruleset editor. Non-serializable assets
 * (images) are resolved separately through RulesetAssets in assets.ts.
 */

export type TermKey =
  | 'archetype.singular'
  | 'archetype.plural'
  | 'trait.singular'
  | 'trait.plural'
  | 'traitCategory.singular'
  | 'traitCategory.plural'
  | 'quality.singular'
  | 'quality.plural'
  | 'modification.singular'
  | 'modification.plural'
  | 'resource.singular'
  | 'resource.plural'
  | 'recipe.singular'
  | 'recipe.plural'
  | 'questSponsor.singular'
  | 'questSponsor.plural'
  | 'map.label';

export type TerminologyMap = Record<TermKey, string>;

/** Replaces the hardcoded health/limit pair. */
export interface ResourceDefinition {
  id: string;
  label: string;
  abbreviation?: string;
  /** When true, a per-archetype cap applies and derived values clamp to it. */
  capped: boolean;
}

/** A named group an archetype can belong to (e.g. organic, robotic). */
export interface ArchetypeGroup {
  id: string;
  label: string;
}

/** A capability flag an archetype can declare (e.g. canUseCyberware). */
export interface CapabilityDefinition {
  id: string;
  label: string;
}

/** Replaces Species + SPECIES_BASE_STATS. */
export interface Archetype {
  id: string;
  label: string;
  /** Group ids this archetype belongs to; membership may overlap. */
  groups: string[];
  /** resourceId -> starting value. Must cover every ruleset resource. */
  baseValues: Record<string, number>;
  /** resourceId -> ceiling. Must cover exactly the resources with capped: true. */
  caps: Record<string, number>;
  /** capabilityId -> flag. Must cover exactly the declared capabilities. */
  capabilities: Record<string, boolean>;
}

export interface TraitCategory {
  id: string;
  label: string;
  color?: string;
}

/** Replaces StatModifiers. Keyed by resource/category id instead of health/limit/tag. */
export interface ResourceModifiers {
  /** resourceId -> delta applied to the running value. */
  values?: Record<string, number>;
  /** resourceId -> delta applied to the cap. */
  caps?: Record<string, number>;
  /** traitCategoryId -> delta applied to the category score. */
  categoryModifiers?: Record<string, number>;
}

/** Replaces AVAILABLE_PERKS entries. */
export interface Trait {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  resourceModifiers?: ResourceModifiers;
  allowedArchetypeIds?: string[];
  recipeIds?: string[];
}

/** Replaces AVAILABLE_DISTINCTIONS entries. */
export interface Quality {
  id: string;
  name: string;
  description: string;
  allowedArchetypeIds?: string[];
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  materials: string[];
}

/** Replaces TAG_SCORE_BONUSES. Flat list rather than a Record keyed by an enum. */
export interface CategoryBonusRule {
  categoryId: string;
  requiredScore: number;
  /** resourceId -> bonus granted when the score threshold is met. */
  grants: Record<string, number>;
}

/** Declarative form of the 'Perfect Mutant' carve-out in derivedStats.ts. */
export interface ArchetypeRule {
  archetypeId: string;
  /**
   * This archetype accrues no category score from traits whose
   * allowedArchetypeIds is exactly the membership of this group.
   */
  kind: 'excludeCategoryScoreFromGroupRestrictedTraits';
  groupId: string;
}

export interface FeatureFlags {
  quests: boolean;
  recipes: boolean;
  discord: boolean;
  map: boolean;
  gitSync: boolean;
  modifications: boolean;
  influenceReport: boolean;
  relationshipGraph: boolean;
}

/** Ruleset-level numeric limits that today are magic numbers in screens. */
export interface RulesetLimits {
  maxQualities?: number;
}

export interface RulesetDefinition {
  id: string;
  name: string;
  version: string;
  terminology: Partial<TerminologyMap>;
  resources: ResourceDefinition[];
  groups: ArchetypeGroup[];
  capabilities: CapabilityDefinition[];
  archetypes: Archetype[];
  traitCategories: TraitCategory[];
  traits: Trait[];
  qualities: Quality[];
  recipes?: Recipe[];
  categoryBonuses: CategoryBonusRule[];
  archetypeRules?: ArchetypeRule[];
  features: FeatureFlags;
  limits?: RulesetLimits;
  /** Asset key resolved through RulesetAssets — never a require() result. */
  map?: { imageKey: string; label: string };
  branding: {
    appName: string;
    iconKey?: string;
    splashKey?: string;
  };
}
