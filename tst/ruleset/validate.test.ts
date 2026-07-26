import { validateRuleset } from '@/ruleset/validate';
import { afterworldsRuleset } from '@/ruleset/defaultRuleset';
import type { RulesetDefinition } from '@/ruleset/types';

const baseRuleset = (): RulesetDefinition => ({
  id: 'fixture',
  name: 'Fixture Ruleset',
  version: '1.0.0',
  terminology: {},
  resources: [
    { id: 'health', label: 'Health', capped: true },
    { id: 'stamina', label: 'Stamina', capped: false },
  ],
  groups: [{ id: 'organic', label: 'Organic' }],
  capabilities: [{ id: 'flight', label: 'Can Fly' }],
  archetypes: [
    {
      id: 'human',
      label: 'Human',
      groups: ['organic'],
      baseValues: { health: 2, stamina: 1 },
      caps: { health: 5 },
      capabilities: { flight: false },
    },
  ],
  traitCategories: [{ id: 'strength', label: 'Strength' }],
  traits: [
    {
      id: 'trait_1',
      name: 'Brawler',
      description: '',
      categoryId: 'strength',
      allowedArchetypeIds: ['human'],
      recipeIds: ['recipe_1'],
      resourceModifiers: {
        values: { health: 1 },
        caps: { health: 1 },
        categoryModifiers: { strength: 1 },
      },
    },
  ],
  qualities: [
    {
      id: 'quality_1',
      name: 'Stoic',
      description: '',
      allowedArchetypeIds: ['human'],
    },
  ],
  recipes: [
    {
      id: 'recipe_1',
      name: 'Bandage',
      description: '',
      materials: ['Cloth'],
    },
  ],
  categoryBonuses: [
    { categoryId: 'strength', requiredScore: 3, grants: { health: 1 } },
  ],
  archetypeRules: [
    {
      archetypeId: 'human',
      kind: 'excludeCategoryScoreFromGroupRestrictedTraits',
      groupId: 'organic',
    },
  ],
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
  map: { imageKey: 'map', label: 'Map' },
  branding: { appName: 'Fixture App' },
});

describe('validateRuleset', () => {
  it('accepts a well-formed fixture ruleset', () => {
    const result = validateRuleset(baseRuleset());
    expect(result).toEqual({ valid: true, issues: [] });
  });

  it('accepts the real afterworlds ruleset', () => {
    const result = validateRuleset(afterworldsRuleset);
    expect(result.issues).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('requires non-empty id/name/version', () => {
    const ruleset = { ...baseRuleset(), id: '', name: '', version: '' };
    const result = validateRuleset(ruleset);
    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        { path: 'id', message: expect.any(String) },
        { path: 'name', message: expect.any(String) },
        { path: 'version', message: expect.any(String) },
      ])
    );
  });

  it('flags duplicate ids within a collection', () => {
    const ruleset = baseRuleset();
    ruleset.traitCategories = [
      ...ruleset.traitCategories,
      { id: 'strength', label: 'Strength Again' },
    ];
    const result = validateRuleset(ruleset);
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      path: 'traitCategories[1].id',
      message: "Duplicate id 'strength' in traitCategories",
    });
  });

  it('flags a trait with an unresolvable categoryId', () => {
    const ruleset = baseRuleset();
    ruleset.traits[0].categoryId = 'nonexistent';
    const result = validateRuleset(ruleset);
    expect(result.issues).toContainEqual({
      path: 'traits[0].categoryId',
      message: "Unknown traitCategory id 'nonexistent'",
    });
  });

  it('flags a trait/quality with an unresolvable allowedArchetypeId', () => {
    const ruleset = baseRuleset();
    ruleset.traits[0].allowedArchetypeIds = ['nonexistent'];
    ruleset.qualities[0].allowedArchetypeIds = ['nonexistent'];
    const result = validateRuleset(ruleset);
    expect(result.issues).toContainEqual({
      path: 'traits[0].allowedArchetypeIds[0]',
      message: "Unknown archetype id 'nonexistent'",
    });
    expect(result.issues).toContainEqual({
      path: 'qualities[0].allowedArchetypeIds[0]',
      message: "Unknown archetype id 'nonexistent'",
    });
  });

  it('flags a trait with an unresolvable recipeId', () => {
    const ruleset = baseRuleset();
    ruleset.traits[0].recipeIds = ['nonexistent'];
    const result = validateRuleset(ruleset);
    expect(result.issues).toContainEqual({
      path: 'traits[0].recipeIds[0]',
      message: "Unknown recipe id 'nonexistent'",
    });
  });

  it('flags resourceModifiers keys that resolve to nothing', () => {
    const ruleset = baseRuleset();
    ruleset.traits[0].resourceModifiers = {
      values: { nonexistent: 1 },
      caps: { nonexistent: 1 },
      categoryModifiers: { nonexistent: 1 },
    };
    const result = validateRuleset(ruleset);
    expect(result.issues).toContainEqual({
      path: 'traits[0].resourceModifiers.values.nonexistent',
      message: "Unknown resource id 'nonexistent'",
    });
    expect(result.issues).toContainEqual({
      path: 'traits[0].resourceModifiers.caps.nonexistent',
      message: "Unknown resource id 'nonexistent'",
    });
    expect(result.issues).toContainEqual({
      path: 'traits[0].resourceModifiers.categoryModifiers.nonexistent',
      message: "Unknown traitCategory id 'nonexistent'",
    });
  });

  it('flags an archetype group that does not resolve', () => {
    const ruleset = baseRuleset();
    ruleset.archetypes[0].groups = ['nonexistent'];
    const result = validateRuleset(ruleset);
    expect(result.issues).toContainEqual({
      path: 'archetypes[0].groups[0]',
      message: "Unknown group id 'nonexistent'",
    });
  });

  it('flags a missing base value for a declared resource', () => {
    const ruleset = baseRuleset();
    delete ruleset.archetypes[0].baseValues.stamina;
    const result = validateRuleset(ruleset);
    expect(result.issues).toContainEqual({
      path: 'archetypes[0].baseValues.stamina',
      message: "Missing base value for resource 'stamina'",
    });
  });

  it('flags an unknown base value key', () => {
    const ruleset = baseRuleset();
    ruleset.archetypes[0].baseValues = {
      ...ruleset.archetypes[0].baseValues,
      nonexistent: 1,
    };
    const result = validateRuleset(ruleset);
    expect(result.issues).toContainEqual({
      path: 'archetypes[0].baseValues.nonexistent',
      message: "Unknown resource id 'nonexistent'",
    });
  });

  it('flags a missing cap for a capped resource', () => {
    const ruleset = baseRuleset();
    delete ruleset.archetypes[0].caps.health;
    const result = validateRuleset(ruleset);
    expect(result.issues).toContainEqual({
      path: 'archetypes[0].caps.health',
      message: "Missing cap for capped resource 'health'",
    });
  });

  it('flags a cap entry for a resource that is not capped', () => {
    const ruleset = baseRuleset();
    ruleset.archetypes[0].caps = {
      ...ruleset.archetypes[0].caps,
      stamina: 5,
    };
    const result = validateRuleset(ruleset);
    expect(result.issues).toContainEqual({
      path: 'archetypes[0].caps.stamina',
      message: "Resource 'stamina' is not capped; unexpected cap entry",
    });
  });

  it('flags a missing declared capability on an archetype', () => {
    const ruleset = baseRuleset();
    ruleset.archetypes[0].capabilities = {};
    const result = validateRuleset(ruleset);
    expect(result.issues).toContainEqual({
      path: 'archetypes[0].capabilities.flight',
      message: "Missing capability 'flight'",
    });
  });

  it('flags an undeclared capability on an archetype', () => {
    const ruleset = baseRuleset();
    ruleset.archetypes[0].capabilities = {
      flight: false,
      nonexistent: true,
    };
    const result = validateRuleset(ruleset);
    expect(result.issues).toContainEqual({
      path: 'archetypes[0].capabilities.nonexistent',
      message: "Unknown capability id 'nonexistent'",
    });
  });

  it('flags a category bonus with an unresolvable categoryId', () => {
    const ruleset = baseRuleset();
    ruleset.categoryBonuses[0].categoryId = 'nonexistent';
    const result = validateRuleset(ruleset);
    expect(result.issues).toContainEqual({
      path: 'categoryBonuses[0].categoryId',
      message: "Unknown traitCategory id 'nonexistent'",
    });
  });

  it('flags a non-positive-integer requiredScore', () => {
    const ruleset = baseRuleset();
    ruleset.categoryBonuses[0].requiredScore = 0;
    const result = validateRuleset(ruleset);
    expect(result.issues).toContainEqual({
      path: 'categoryBonuses[0].requiredScore',
      message: 'requiredScore must be a positive integer',
    });
  });

  it('flags a category bonus grant key that does not resolve', () => {
    const ruleset = baseRuleset();
    ruleset.categoryBonuses[0].grants = { nonexistent: 1 };
    const result = validateRuleset(ruleset);
    expect(result.issues).toContainEqual({
      path: 'categoryBonuses[0].grants.nonexistent',
      message: "Unknown resource id 'nonexistent'",
    });
  });

  it('flags an archetypeRule with unresolvable ids', () => {
    const ruleset = baseRuleset();
    ruleset.archetypeRules = [
      {
        archetypeId: 'nonexistent',
        kind: 'excludeCategoryScoreFromGroupRestrictedTraits',
        groupId: 'nonexistent',
      },
    ];
    const result = validateRuleset(ruleset);
    expect(result.issues).toContainEqual({
      path: 'archetypeRules[0].archetypeId',
      message: "Unknown archetype id 'nonexistent'",
    });
    expect(result.issues).toContainEqual({
      path: 'archetypeRules[0].groupId',
      message: "Unknown group id 'nonexistent'",
    });
  });

  it('flags an empty map.imageKey when map is present', () => {
    const ruleset = baseRuleset();
    ruleset.map = { imageKey: '', label: 'Map' };
    const result = validateRuleset(ruleset);
    expect(result.issues).toContainEqual({
      path: 'map.imageKey',
      message: 'imageKey must be non-empty when map is present',
    });
  });

  it('flags empty branding asset keys when present', () => {
    const ruleset = baseRuleset();
    ruleset.branding = { appName: 'Fixture', iconKey: '', splashKey: '' };
    const result = validateRuleset(ruleset);
    expect(result.issues).toContainEqual({
      path: 'branding.iconKey',
      message: 'iconKey must be non-empty when present',
    });
    expect(result.issues).toContainEqual({
      path: 'branding.splashKey',
      message: 'splashKey must be non-empty when present',
    });
  });

  it('flags a non-serializable value anywhere in the ruleset', () => {
    const ruleset = baseRuleset() as unknown as Record<string, unknown>;
    (ruleset.branding as Record<string, unknown>).onSave = () => undefined;
    const result = validateRuleset(ruleset as unknown as RulesetDefinition);
    expect(result.issues).toContainEqual({
      path: 'branding.onSave',
      message: expect.stringContaining('JSON-serializable'),
    });
  });

  it('flags a class instance embedded in the ruleset as non-serializable', () => {
    class Weird {
      value = 1;
    }
    const ruleset = baseRuleset() as unknown as Record<string, unknown>;
    (ruleset.archetypes as Array<Record<string, unknown>>)[0].weird =
      new Weird();
    const result = validateRuleset(ruleset as unknown as RulesetDefinition);
    expect(result.issues).toContainEqual({
      path: 'archetypes[0].weird',
      message: expect.stringContaining('JSON-serializable'),
    });
  });
});
