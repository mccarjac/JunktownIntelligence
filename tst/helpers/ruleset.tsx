import React from 'react';
import { render, type RenderResult } from '@testing-library/react-native';
import {
  RulesetProvider,
  afterworldsRuleset,
  afterworldsAssets,
  type RulesetDefinition,
  type RulesetAssets,
} from '@/ruleset';

export const renderWithRuleset = (
  ui: React.ReactElement,
  overrides: {
    ruleset?: RulesetDefinition;
    assets?: RulesetAssets;
  } = {}
): RenderResult => {
  const { ruleset = afterworldsRuleset, assets = afterworldsAssets } =
    overrides;
  return render(ui, {
    wrapper: ({ children }) => (
      <RulesetProvider ruleset={ruleset} assets={assets}>
        {children}
      </RulesetProvider>
    ),
  });
};
