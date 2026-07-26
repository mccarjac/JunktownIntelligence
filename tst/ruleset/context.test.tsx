import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { RulesetProvider, useRuleset } from '@/ruleset/context';
import { afterworldsRuleset } from '@/ruleset/defaultRuleset';
import type { RulesetDefinition } from '@/ruleset/types';

const Probe: React.FC = () => {
  const { ruleset } = useRuleset();
  return <Text>{ruleset.id}</Text>;
};

describe('useRuleset', () => {
  it('falls back to the default ruleset outside a provider', () => {
    render(<Probe />);
    expect(screen.getByText('afterworlds')).toBeTruthy();
  });

  it('provides the ruleset passed to RulesetProvider', () => {
    const custom: RulesetDefinition = {
      ...afterworldsRuleset,
      id: 'custom-ruleset',
    };
    render(
      <RulesetProvider ruleset={custom}>
        <Probe />
      </RulesetProvider>
    );
    expect(screen.getByText('custom-ruleset')).toBeTruthy();
  });

  it('throws in dev when the provided ruleset is invalid', () => {
    const invalid: RulesetDefinition = {
      ...afterworldsRuleset,
      id: '',
    };
    const previousDev = global.__DEV__;
    global.__DEV__ = true;
    // Silence the expected React error-boundary console noise for this case.
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    expect(() =>
      render(
        <RulesetProvider ruleset={invalid}>
          <Probe />
        </RulesetProvider>
      )
    ).toThrow(/Invalid ruleset/);
    consoleError.mockRestore();
    global.__DEV__ = previousDev;
  });

  it('logs and still renders when the provided ruleset is invalid outside dev', () => {
    const invalid: RulesetDefinition = {
      ...afterworldsRuleset,
      id: '',
    };
    const previousDev = global.__DEV__;
    global.__DEV__ = false;
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    render(
      <RulesetProvider ruleset={invalid}>
        <Probe />
      </RulesetProvider>
    );
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('Invalid ruleset')
    );
    consoleError.mockRestore();
    global.__DEV__ = previousDev;
  });
});
