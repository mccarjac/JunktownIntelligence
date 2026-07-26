import {
  SPECIES_BASE_STATS,
  ORGANIC_SPECIES,
  ROBOTIC_SPECIES,
  MUTANT_SPECIES,
  ANDROID_SPECIES,
  type Species,
} from '@models/speciesTypes';
import {
  AVAILABLE_PERKS,
  AVAILABLE_DISTINCTIONS,
  AVAILABLE_RECIPES,
  TAG_SCORE_BONUSES,
  PerkTag,
} from '@models/gameData';
import type {
  RulesetDefinition,
  Archetype,
  Trait,
  Quality,
  CategoryBonusRule,
} from './types';

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
 * restricted to exactly the MUTANT_SPECIES group (derivedStats.ts:29-40).
 * Expressed declaratively so a ruleset with different archetypes/groups can
 * express (or omit) the same carve-out without touching derived-stats logic.
 */
const PERFECT_MUTANT_RULE: RulesetDefinition['archetypeRules'] = [
  {
    archetypeId: 'Perfect Mutant',
    kind: 'excludeCategoryScoreFromGroupRestrictedTraits',
    groupId: 'mutant',
  },
];

const archetypes: Archetype[] = Object.entries(SPECIES_BASE_STATS).map(
  ([id, stats]) => ({
    id,
    label: id,
    groups: groupsFor(id as Species),
    baseValues: { health: stats.baseHealth, limit: stats.baseLimit },
    caps: { health: stats.healthCap, limit: stats.limitCap },
    capabilities: {
      cyberware: stats.canUseCyberware,
      chems: stats.canUseChems,
      injuries: stats.canTakeInjuries,
      malfunctions: stats.canTakeMalfunctions,
    },
  })
);

const traits: Trait[] = AVAILABLE_PERKS.map(perk => ({
  id: perk.id,
  name: perk.name,
  description: perk.description,
  categoryId: perk.tag,
  allowedArchetypeIds: perk.allowedSpecies,
  recipeIds: perk.recipeIds,
  resourceModifiers: perk.statModifiers
    ? {
        values: {
          ...(perk.statModifiers.health !== undefined && {
            health: perk.statModifiers.health,
          }),
          ...(perk.statModifiers.limit !== undefined && {
            limit: perk.statModifiers.limit,
          }),
        },
        caps: {
          ...(perk.statModifiers.healthCap !== undefined && {
            health: perk.statModifiers.healthCap,
          }),
          ...(perk.statModifiers.limitCap !== undefined && {
            limit: perk.statModifiers.limitCap,
          }),
        },
        categoryModifiers: perk.statModifiers.tagModifiers,
      }
    : undefined,
}));

const qualities: Quality[] = AVAILABLE_DISTINCTIONS.map(distinction => ({
  id: distinction.id,
  name: distinction.name,
  description: distinction.description,
  allowedArchetypeIds: distinction.allowedSpecies,
}));

const categoryBonuses: CategoryBonusRule[] = Object.entries(
  TAG_SCORE_BONUSES
).flatMap(([categoryId, bonuses]) =>
  bonuses.map(bonus => ({
    categoryId,
    requiredScore: bonus.requiredScore,
    grants: {
      ...(bonus.health !== undefined && { health: bonus.health }),
      ...(bonus.limit !== undefined && { limit: bonus.limit }),
    },
  }))
);

export const afterworldsRuleset: RulesetDefinition = {
  id: 'afterworlds',
  name: 'Junktown Intelligence',
  version: '1.0.0',
  terminology: {
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
  },
  resources: [
    { id: 'health', label: 'Health', capped: true },
    { id: 'limit', label: 'Limit', capped: true },
  ],
  groups: [
    { id: 'organic', label: 'Organic' },
    { id: 'robotic', label: 'Robotic' },
    { id: 'mutant', label: 'Mutant' },
    { id: 'android', label: 'Android' },
  ],
  capabilities: [
    { id: 'cyberware', label: 'Can Use Cyberware' },
    { id: 'chems', label: 'Can Use Chems' },
    { id: 'injuries', label: 'Can Take Injuries' },
    { id: 'malfunctions', label: 'Can Take Malfunctions' },
  ],
  archetypes,
  traitCategories: Object.values(PerkTag).map(tag => ({
    id: tag,
    label: tag,
  })),
  traits,
  qualities,
  recipes: AVAILABLE_RECIPES.map(recipe => ({ ...recipe })),
  categoryBonuses,
  archetypeRules: PERFECT_MUTANT_RULE,
  features: {
    quests: true,
    recipes: true,
    discord: true,
    map: true,
    gitSync: true,
    modifications: true,
    influenceReport: true,
    relationshipGraph: true,
  },
  limits: { maxQualities: 3 },
  map: { imageKey: 'map', label: 'Junktown Map' },
  branding: { appName: 'Junktown Intelligence' },
};
