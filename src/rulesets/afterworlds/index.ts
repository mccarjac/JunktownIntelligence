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
  type Archetype,
  type Trait,
  type Quality,
  type CategoryBonusRule,
  type Modifier,
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
const PERFECT_MUTANT_RULE: RulesetDefinition['archetypeRules'] = [
  {
    archetypeId: 'Perfect Mutant',
    kind: 'excludeCategoryScoreFromGroupRestrictedTraits',
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

const archetypes: Archetype[] = Object.entries(SPECIES_BASE_STATS).map(
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
      categoryDeltas: statModifiers.tagModifiers as Record<string, number>,
    }),
  };
};

const traits: Trait[] = AVAILABLE_PERKS.map(perk => ({
  id: perk.id,
  name: perk.name,
  description: perk.description,
  categoryId: perk.tag,
  allowedArchetypeIds: perk.allowedSpecies,
  recipeIds: perk.recipeIds,
  modifier: perk.statModifiers ? toModifier(perk.statModifiers) : undefined,
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
    grants: toModifier(bonus),
  }))
);

export const afterworldsRuleset: RulesetDefinition = {
  id: 'afterworlds',
  name: 'Junktown Intelligence',
  version: '1.0.0',
  terminology: afterworldsTerminology,
  attributes,
  groups: [
    { id: 'organic', label: 'Organic' },
    { id: 'robotic', label: 'Robotic' },
    { id: 'mutant', label: 'Mutant' },
    { id: 'android', label: 'Android' },
  ],
  archetypes,
  defaultArchetypeId: 'Human',
  traitCategories: afterworldsTraitCategories,
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
  map: { imageKey: 'map' },
  branding: { appName: APP_NAME },
};
