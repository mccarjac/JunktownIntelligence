import { renderHook } from '@testing-library/react-native';
import React from 'react';
import {
  getLabel,
  useLabels,
  DEFAULT_TERMINOLOGY,
} from '@/ruleset/terminology';
import { RulesetProvider } from '@/ruleset/context';
import { afterworldsRuleset } from '@/ruleset/defaultRuleset';
import type { RulesetDefinition } from '@/ruleset/types';

const rulesetWithoutOverrides: RulesetDefinition = {
  ...afterworldsRuleset,
  terminology: {},
};

describe('getLabel', () => {
  it('falls back to the neutral default when a ruleset has no override', () => {
    expect(getLabel(rulesetWithoutOverrides, 'trait.plural')).toBe('Traits');
  });

  it('uses the ruleset override when present', () => {
    expect(getLabel(afterworldsRuleset, 'trait.plural')).toBe('Perks');
    expect(getLabel(afterworldsRuleset, 'archetype.singular')).toBe('Species');
    expect(getLabel(afterworldsRuleset, 'questSponsor.singular')).toBe(
      'Junktown Office'
    );
  });

  it('applies lower casing', () => {
    expect(getLabel(afterworldsRuleset, 'trait.plural', 'lower')).toBe('perks');
  });

  it('applies title casing', () => {
    expect(
      getLabel(rulesetWithoutOverrides, 'traitCategory.plural', 'title')
    ).toBe('Categories');
  });

  it('covers every declared term key with a neutral default', () => {
    Object.values(DEFAULT_TERMINOLOGY).forEach(value => {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    });
  });
});

describe('useLabels', () => {
  it('reads from the nearest RulesetProvider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RulesetProvider ruleset={afterworldsRuleset}>{children}</RulesetProvider>
    );
    const { result } = renderHook(() => useLabels(), { wrapper });
    expect(result.current('trait.plural')).toBe('Perks');
  });

  it('falls back to the default ruleset outside a provider', () => {
    const { result } = renderHook(() => useLabels());
    expect(result.current('trait.plural')).toBe('Perks');
  });
});
