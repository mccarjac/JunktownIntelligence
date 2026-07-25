import React from 'react';
import { render } from '@testing-library/react-native';
import { GraphLegend } from '@components/graph/GraphLegend';

describe('GraphLegend', () => {
  it('renders a label for every node type and every relationship standing', () => {
    const { getByText } = render(<GraphLegend />);

    expect(getByText('Character')).toBeTruthy();
    expect(getByText('Faction')).toBeTruthy();
    expect(getByText('Location')).toBeTruthy();

    expect(getByText('Ally')).toBeTruthy();
    expect(getByText('Friend')).toBeTruthy();
    expect(getByText('Neutral')).toBeTruthy();
    expect(getByText('Hostile')).toBeTruthy();
    expect(getByText('Enemy')).toBeTruthy();
  });
});
