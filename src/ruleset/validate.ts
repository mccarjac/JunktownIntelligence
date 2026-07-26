import type { RulesetDefinition } from './types';

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

const SERIALIZABLE_MESSAGE =
  'must be JSON-serializable (no functions, class instances, or other non-plain values)';

const checkSerializable = (
  value: unknown,
  path: string,
  issues: ValidationIssue[]
): void => {
  if (value === null || value === undefined) return;
  const type = typeof value;
  if (type === 'string' || type === 'number' || type === 'boolean') return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      checkSerializable(item, `${path}[${index}]`, issues)
    );
    return;
  }
  if (type === 'object' && (value as object).constructor === Object) {
    Object.entries(value as Record<string, unknown>).forEach(([key, v]) =>
      checkSerializable(v, path ? `${path}.${key}` : key, issues)
    );
    return;
  }
  issues.push({ path, message: `Value at '${path}' ${SERIALIZABLE_MESSAGE}` });
};

const checkUniqueIds = (
  items: { id: string }[],
  collectionPath: string,
  issues: ValidationIssue[]
): void => {
  const seen = new Set<string>();
  items.forEach((item, index) => {
    if (seen.has(item.id)) {
      issues.push({
        path: `${collectionPath}[${index}].id`,
        message: `Duplicate id '${item.id}' in ${collectionPath}`,
      });
    }
    seen.add(item.id);
  });
};

export function validateRuleset(ruleset: RulesetDefinition): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!ruleset.id) issues.push({ path: 'id', message: 'id must be non-empty' });
  if (!ruleset.name) {
    issues.push({ path: 'name', message: 'name must be non-empty' });
  }
  if (!ruleset.version) {
    issues.push({ path: 'version', message: 'version must be non-empty' });
  }

  checkUniqueIds(ruleset.resources, 'resources', issues);
  checkUniqueIds(ruleset.groups, 'groups', issues);
  checkUniqueIds(ruleset.capabilities, 'capabilities', issues);
  checkUniqueIds(ruleset.archetypes, 'archetypes', issues);
  checkUniqueIds(ruleset.traitCategories, 'traitCategories', issues);
  checkUniqueIds(ruleset.traits, 'traits', issues);
  checkUniqueIds(ruleset.qualities, 'qualities', issues);
  if (ruleset.recipes) checkUniqueIds(ruleset.recipes, 'recipes', issues);

  const resourceIds = new Set(ruleset.resources.map(r => r.id));
  const cappedResourceIds = new Set(
    ruleset.resources.filter(r => r.capped).map(r => r.id)
  );
  const groupIds = new Set(ruleset.groups.map(g => g.id));
  const capabilityIds = new Set(ruleset.capabilities.map(c => c.id));
  const categoryIds = new Set(ruleset.traitCategories.map(c => c.id));
  const archetypeIds = new Set(ruleset.archetypes.map(a => a.id));
  const recipeIds = new Set((ruleset.recipes ?? []).map(r => r.id));

  ruleset.traits.forEach((trait, index) => {
    if (!categoryIds.has(trait.categoryId)) {
      issues.push({
        path: `traits[${index}].categoryId`,
        message: `Unknown traitCategory id '${trait.categoryId}'`,
      });
    }
    trait.allowedArchetypeIds?.forEach((id, i) => {
      if (!archetypeIds.has(id)) {
        issues.push({
          path: `traits[${index}].allowedArchetypeIds[${i}]`,
          message: `Unknown archetype id '${id}'`,
        });
      }
    });
    trait.recipeIds?.forEach((id, i) => {
      if (!recipeIds.has(id)) {
        issues.push({
          path: `traits[${index}].recipeIds[${i}]`,
          message: `Unknown recipe id '${id}'`,
        });
      }
    });
    if (trait.resourceModifiers) {
      Object.keys(trait.resourceModifiers.values ?? {}).forEach(id => {
        if (!resourceIds.has(id)) {
          issues.push({
            path: `traits[${index}].resourceModifiers.values.${id}`,
            message: `Unknown resource id '${id}'`,
          });
        }
      });
      Object.keys(trait.resourceModifiers.caps ?? {}).forEach(id => {
        if (!resourceIds.has(id)) {
          issues.push({
            path: `traits[${index}].resourceModifiers.caps.${id}`,
            message: `Unknown resource id '${id}'`,
          });
        }
      });
      Object.keys(trait.resourceModifiers.categoryModifiers ?? {}).forEach(
        id => {
          if (!categoryIds.has(id)) {
            issues.push({
              path: `traits[${index}].resourceModifiers.categoryModifiers.${id}`,
              message: `Unknown traitCategory id '${id}'`,
            });
          }
        }
      );
    }
  });

  ruleset.qualities.forEach((quality, index) => {
    quality.allowedArchetypeIds?.forEach((id, i) => {
      if (!archetypeIds.has(id)) {
        issues.push({
          path: `qualities[${index}].allowedArchetypeIds[${i}]`,
          message: `Unknown archetype id '${id}'`,
        });
      }
    });
  });

  ruleset.archetypes.forEach((archetype, index) => {
    archetype.groups.forEach((groupId, i) => {
      if (!groupIds.has(groupId)) {
        issues.push({
          path: `archetypes[${index}].groups[${i}]`,
          message: `Unknown group id '${groupId}'`,
        });
      }
    });

    resourceIds.forEach(resourceId => {
      if (!(resourceId in archetype.baseValues)) {
        issues.push({
          path: `archetypes[${index}].baseValues.${resourceId}`,
          message: `Missing base value for resource '${resourceId}'`,
        });
      }
    });
    Object.keys(archetype.baseValues).forEach(resourceId => {
      if (!resourceIds.has(resourceId)) {
        issues.push({
          path: `archetypes[${index}].baseValues.${resourceId}`,
          message: `Unknown resource id '${resourceId}'`,
        });
      }
    });

    cappedResourceIds.forEach(resourceId => {
      if (!(resourceId in archetype.caps)) {
        issues.push({
          path: `archetypes[${index}].caps.${resourceId}`,
          message: `Missing cap for capped resource '${resourceId}'`,
        });
      }
    });
    Object.keys(archetype.caps).forEach(resourceId => {
      if (!cappedResourceIds.has(resourceId)) {
        issues.push({
          path: `archetypes[${index}].caps.${resourceId}`,
          message: `Resource '${resourceId}' is not capped; unexpected cap entry`,
        });
      }
    });

    capabilityIds.forEach(capabilityId => {
      if (!(capabilityId in archetype.capabilities)) {
        issues.push({
          path: `archetypes[${index}].capabilities.${capabilityId}`,
          message: `Missing capability '${capabilityId}'`,
        });
      }
    });
    Object.keys(archetype.capabilities).forEach(capabilityId => {
      if (!capabilityIds.has(capabilityId)) {
        issues.push({
          path: `archetypes[${index}].capabilities.${capabilityId}`,
          message: `Unknown capability id '${capabilityId}'`,
        });
      }
    });
  });

  ruleset.categoryBonuses.forEach((rule, index) => {
    if (!categoryIds.has(rule.categoryId)) {
      issues.push({
        path: `categoryBonuses[${index}].categoryId`,
        message: `Unknown traitCategory id '${rule.categoryId}'`,
      });
    }
    if (!Number.isInteger(rule.requiredScore) || rule.requiredScore <= 0) {
      issues.push({
        path: `categoryBonuses[${index}].requiredScore`,
        message: 'requiredScore must be a positive integer',
      });
    }
    Object.keys(rule.grants).forEach(resourceId => {
      if (!resourceIds.has(resourceId)) {
        issues.push({
          path: `categoryBonuses[${index}].grants.${resourceId}`,
          message: `Unknown resource id '${resourceId}'`,
        });
      }
    });
  });

  ruleset.archetypeRules?.forEach((rule, index) => {
    if (!archetypeIds.has(rule.archetypeId)) {
      issues.push({
        path: `archetypeRules[${index}].archetypeId`,
        message: `Unknown archetype id '${rule.archetypeId}'`,
      });
    }
    if (!groupIds.has(rule.groupId)) {
      issues.push({
        path: `archetypeRules[${index}].groupId`,
        message: `Unknown group id '${rule.groupId}'`,
      });
    }
  });

  if (ruleset.map && !ruleset.map.imageKey) {
    issues.push({
      path: 'map.imageKey',
      message: 'imageKey must be non-empty when map is present',
    });
  }
  if (ruleset.branding.iconKey === '') {
    issues.push({
      path: 'branding.iconKey',
      message: 'iconKey must be non-empty when present',
    });
  }
  if (ruleset.branding.splashKey === '') {
    issues.push({
      path: 'branding.splashKey',
      message: 'splashKey must be non-empty when present',
    });
  }

  checkSerializable(ruleset, '', issues);

  return { valid: issues.length === 0, issues };
}
