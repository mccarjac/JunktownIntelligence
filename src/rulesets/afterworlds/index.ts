import {
  SPECIES_BASE_STATS,
  ORGANIC_SPECIES,
  ROBOTIC_SPECIES,
  MUTANT_SPECIES,
  ANDROID_SPECIES,
  type Species,
} from './content/speciesTypes';
import {
  AVAILABLE_PERKS,
  AVAILABLE_DISTINCTIONS,
  AVAILABLE_RECIPES,
  TAG_SCORE_BONUSES,
  PerkTag,
} from './content/gameData';
import {
  flag,
  num,
  type AttributeDefinition,
  type RulesetDefinition,
  type FacetCollection,
  type FacetEntry,
  type FacetBonusRule,
  type Modifier,
  type RelationshipTypeCollection,
  type RelationshipTypeEntry,
  type ReportDefinition,
} from 'lore/ruleset';
import { afterworldsTerminology } from './terminology';
import { afterworldsTraitCategories } from './categories';

/**
 * Runtime display identity. In the engine this came from `src/branding.ts`;
 * here the app owns it, and `app.config.ts` reads the same variable, so the
 * name on the home screen and the name inside the app cannot drift.
 */
const APP_NAME = process.env.EXPO_PUBLIC_APP_NAME ?? 'Junktown Intelligence';

const GROUP_MEMBERSHIP: Record<string, Species[]> = {
  organic: ORGANIC_SPECIES,
  robotic: ROBOTIC_SPECIES,
  mutant: MUTANT_SPECIES,
  android: ANDROID_SPECIES,
};

const groupsFor = (species: Species): string[] =>
  Object.entries(GROUP_MEMBERSHIP)
    .filter(([, members]) => members.includes(species))
    .map(([groupId]) => groupId);

/**
 * Today's app grants no category-score bonus to Perfect Mutants from perks
 * restricted to exactly the MUTANT_SPECIES group (was derivedStats.ts:29-40).
 * Expressed declaratively so a ruleset with different archetypes/groups can
 * express (or omit) the same carve-out without touching derived-stats logic.
 */
const PERFECT_MUTANT_RULE: NonNullable<FacetCollection['scoreExclusions']> = [
  {
    whenCollectionId: 'archetypes',
    whenEntryId: 'Perfect Mutant',
    groupId: 'mutant',
  },
];

/**
 * Afterworlds' attribute vocabulary (#22).
 *
 * A cap is just another numeric attribute with `role: 'cap'`, linked from the
 * resource it bounds. That uniformity is what lets `derived.ts` state, rather
 * than special-case, the rule that traits may not raise caps while
 * modifications may.
 */
const attributes: AttributeDefinition[] = [
  {
    id: 'health',
    label: 'Health',
    type: 'number',
    role: 'resource',
    capAttributeId: 'healthCap',
  },
  {
    id: 'limit',
    label: 'Limit',
    type: 'number',
    role: 'resource',
    capAttributeId: 'limitCap',
  },
  { id: 'healthCap', label: 'Health Cap', type: 'number', role: 'cap' },
  { id: 'limitCap', label: 'Limit Cap', type: 'number', role: 'cap' },
  {
    id: 'cyberware',
    label: 'Can Use Cyberware',
    type: 'flag',
    role: 'capability',
  },
  { id: 'chems', label: 'Can Use Chems', type: 'flag', role: 'capability' },
  {
    id: 'injuries',
    label: 'Can Take Injuries',
    type: 'flag',
    role: 'capability',
  },
  {
    id: 'malfunctions',
    label: 'Can Take Malfunctions',
    type: 'flag',
    role: 'capability',
  },
];

const archetypeEntries: FacetEntry[] = Object.entries(SPECIES_BASE_STATS).map(
  ([id, stats]) => ({
    id,
    label: id,
    groups: groupsFor(id as Species),
    attributes: {
      health: num(stats.baseHealth),
      limit: num(stats.baseLimit),
      healthCap: num(stats.healthCap),
      limitCap: num(stats.limitCap),
      cyberware: flag(stats.canUseCyberware),
      chems: flag(stats.canUseChems),
      injuries: flag(stats.canTakeInjuries),
      malfunctions: flag(stats.canTakeMalfunctions),
    },
  })
);

/** The old `archetypes` collection: single-select, seeds base attributes. */
const archetypes: FacetCollection = {
  id: 'archetypes',
  singular: 'Species',
  plural: 'Species',
  selection: 'single',
  defaultEntryId: 'Human',
  legacyField: 'archetypeId',
  groups: [
    { id: 'organic', label: 'Organic' },
    { id: 'robotic', label: 'Robotic' },
    { id: 'mutant', label: 'Mutant' },
    { id: 'android', label: 'Android' },
  ],
  contributes: { stage: 'base' },
  entries: archetypeEntries,
};

/**
 * Flat StatModifiers -> Modifier. Cap entries map onto the *cap attribute*
 * (`healthCap`), not the resource it bounds.
 *
 * This faithfully carries a trait's cap delta even though `derived.ts` does
 * not apply trait cap deltas — the transform says what the source data says,
 * and the engine states separately what it honors. Dropping it here would
 * quietly discard real data from `gameData.ts`.
 */
const toModifier = (statModifiers: {
  health?: number;
  limit?: number;
  healthCap?: number;
  limitCap?: number;
  tagModifiers?: Partial<Record<PerkTag, number>>;
}): Modifier => {
  const attributeDeltas: Record<string, number> = {};
  if (statModifiers.health !== undefined) {
    attributeDeltas.health = statModifiers.health;
  }
  if (statModifiers.limit !== undefined) {
    attributeDeltas.limit = statModifiers.limit;
  }
  if (statModifiers.healthCap !== undefined) {
    attributeDeltas.healthCap = statModifiers.healthCap;
  }
  if (statModifiers.limitCap !== undefined) {
    attributeDeltas.limitCap = statModifiers.limitCap;
  }

  return {
    ...(Object.keys(attributeDeltas).length > 0 && { attributeDeltas }),
    ...(statModifiers.tagModifiers && {
      categoryDeltas: {
        traits: statModifiers.tagModifiers as Record<string, number>,
      },
    }),
  };
};

const traitEntries: FacetEntry[] = AVAILABLE_PERKS.map(perk => ({
  id: perk.id,
  label: perk.name,
  description: perk.description,
  categoryId: perk.tag,
  requires: perk.allowedSpecies
    ? { archetypes: perk.allowedSpecies }
    : undefined,
  links: perk.recipeIds ? { recipes: perk.recipeIds } : undefined,
  modifier: perk.statModifiers ? toModifier(perk.statModifiers) : undefined,
}));

const categoryBonuses: FacetBonusRule[] = Object.entries(
  TAG_SCORE_BONUSES
).flatMap(([categoryId, bonuses]) =>
  bonuses.map(bonus => ({
    categoryId,
    requiredScore: bonus.requiredScore,
    grants: toModifier(bonus),
  }))
);

/**
 * The old `traits` collection: multi-select, categorized, contributes
 * resource deltas and category score, and grants category bonuses. Carries
 * the Perfect Mutant carve-out as a `scoreExclusions` entry (was
 * `archetypeRules`).
 */
const traits: FacetCollection = {
  id: 'traits',
  singular: 'Perk',
  plural: 'Perks',
  categorySingular: 'Tag',
  categoryPlural: 'Tags',
  selection: 'multi',
  legacyField: 'traitIds',
  categories: afterworldsTraitCategories,
  contributes: { deltaRoles: ['resource'], categoryScore: true },
  categoryBonuses,
  scoreExclusions: PERFECT_MUTANT_RULE,
  entries: traitEntries,
};

/** The old `qualities` collection: multi-select, purely descriptive. */
const qualities: FacetCollection = {
  id: 'qualities',
  singular: 'Distinction',
  plural: 'Distinctions',
  selection: 'multi',
  maxSelections: 3,
  legacyField: 'qualityIds',
  entries: AVAILABLE_DISTINCTIONS.map(distinction => ({
    id: distinction.id,
    label: distinction.name,
    description: distinction.description,
    requires: distinction.allowedSpecies
      ? { archetypes: distinction.allowedSpecies }
      : undefined,
  })),
};

/**
 * The old `modifications` field: authored per character rather than picked
 * from a catalog, contributing after category bonuses so a cyberware's
 * category deltas never retroactively unlock one. Unlike the other four
 * collections, v1 had no ruleset-declared content for this — it was purely
 * a feature flag plus a terminology override — so this collection exists
 * now only to carry that terminology and the migration's `legacyField`.
 */
const modifications: FacetCollection = {
  id: 'modifications',
  singular: 'Cyberware',
  plural: 'Cyberware',
  selection: 'multi',
  authored: true,
  legacyField: 'modifications',
  contributes: { stage: 'postBonus', deltaRoles: ['resource', 'cap'] },
  entries: [],
};

/**
 * The old builtin `GameCharacter.present` boolean (#56), reproduced as a
 * `single` collection so out-of-the-box behavior — a new character starting
 * absent, presence editable per character — is unchanged from before
 * attendance was ruleset-declared. No custom terminology: this app never
 * overrode it.
 */
const attendance: FacetCollection = {
  id: 'attendance',
  singular: 'Attendance',
  plural: 'Attendance',
  selection: 'single',
  defaultEntryId: 'absent',
  legacyField: 'present',
  entries: [
    { id: 'present', label: 'Present', legacyValue: true },
    { id: 'absent', label: 'Absent', legacyValue: false },
  ],
};

/** The old `recipes` collection: a catalog, only ever reached via `links`. */
const recipes: FacetCollection = {
  id: 'recipes',
  singular: 'Recipe',
  plural: 'Recipes',
  selection: 'catalog',
  entries: AVAILABLE_RECIPES.map(recipe => ({
    id: recipe.id,
    label: recipe.name,
    description: recipe.description,
    materials: [...recipe.materials],
  })),
};

/**
 * The old `RelationshipStanding` enum (#50), reproduced as one entry list
 * shared by all three legacy pairs so out-of-the-box behavior — values,
 * polarity, and default color — is unchanged from before relationship types
 * were ruleset-declared. No custom terminology: this app never overrode it.
 */
const STANDING_ENTRIES: RelationshipTypeEntry[] = [
  { id: 'ally', label: 'Ally', role: 'positive', legacyValue: 'Ally' },
  { id: 'friend', label: 'Friend', role: 'positive', legacyValue: 'Friend' },
  {
    id: 'neutral',
    label: 'Neutral',
    role: 'neutral',
    legacyValue: 'Neutral',
  },
  {
    id: 'hostile',
    label: 'Hostile',
    role: 'negative',
    legacyValue: 'Hostile',
  },
  { id: 'enemy', label: 'Enemy', role: 'negative', legacyValue: 'Enemy' },
];

const characterStanding: RelationshipTypeCollection = {
  id: 'characterStanding',
  singular: 'Relationship',
  plural: 'Relationships',
  appliesTo: ['character', 'character'],
  legacyField: 'characterStanding',
  defaultEntryId: 'neutral',
  entries: STANDING_ENTRIES,
};

const characterFactionStanding: RelationshipTypeCollection = {
  id: 'characterFactionStanding',
  singular: 'Standing',
  plural: 'Standings',
  appliesTo: ['character', 'faction'],
  legacyField: 'characterFactionStanding',
  defaultEntryId: 'neutral',
  entries: STANDING_ENTRIES,
};

const factionStanding: RelationshipTypeCollection = {
  id: 'factionStanding',
  singular: 'Relationship',
  plural: 'Relationships',
  appliesTo: ['faction', 'faction'],
  legacyField: 'factionStanding',
  defaultEntryId: 'neutral',
  entries: STANDING_ENTRIES,
};

/**
 * The old fixed `FeatureFlags` booleans (`influenceReport`,
 * `relationshipGraph`, `characterStats`, `factionStats`) generalized into a
 * ruleset-ordered list (#56-#58). All four were on before; keeping all four,
 * in the same order, preserves the drawer as players know it.
 */
const reports: ReportDefinition[] = [
  { kind: 'influenceReport' },
  { kind: 'relationshipGraph' },
  { kind: 'characterStats' },
  { kind: 'factionStats' },
];

export const afterworldsRuleset: RulesetDefinition = {
  id: 'afterworlds',
  name: 'Junktown Intelligence',
  version: '1.0.0',
  terminology: afterworldsTerminology,
  attributes,
  facets: [archetypes, traits, qualities, modifications, attendance, recipes],
  relationshipTypes: [
    characterStanding,
    characterFactionStanding,
    factionStanding,
  ],
  features: {
    quests: true,
    discord: true,
    map: true,
  },
  reports,
  map: { imageKey: 'map' },
  branding: { appName: APP_NAME },
};
