import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  GraphFilterBar,
  type GraphFilters,
} from '@components/graph/GraphFilterBar';

const baseFilters: GraphFilters = {
  visibleTypes: new Set(['character', 'faction', 'location']),
  showRetired: false,
  hideIsolated: false,
};

describe('GraphFilterBar', () => {
  it('renders a chip for each node type plus retired and isolated toggles', () => {
    const { getByLabelText } = render(
      <GraphFilterBar
        filters={baseFilters}
        onToggleType={jest.fn()}
        onToggleRetired={jest.fn()}
        onToggleHideIsolated={jest.fn()}
      />
    );

    expect(getByLabelText('Character')).toBeTruthy();
    expect(getByLabelText('Faction')).toBeTruthy();
    expect(getByLabelText('Location')).toBeTruthy();
    expect(getByLabelText('Retired')).toBeTruthy();
    expect(getByLabelText('Hide isolated')).toBeTruthy();
  });

  it('calls onToggleType with the pressed node type', () => {
    const onToggleType = jest.fn();
    const { getByLabelText } = render(
      <GraphFilterBar
        filters={baseFilters}
        onToggleType={onToggleType}
        onToggleRetired={jest.fn()}
        onToggleHideIsolated={jest.fn()}
      />
    );

    fireEvent.press(getByLabelText('Faction'));

    expect(onToggleType).toHaveBeenCalledWith('faction');
  });

  it('calls onToggleRetired and onToggleHideIsolated when their chips are pressed', () => {
    const onToggleRetired = jest.fn();
    const onToggleHideIsolated = jest.fn();
    const { getByLabelText } = render(
      <GraphFilterBar
        filters={baseFilters}
        onToggleType={jest.fn()}
        onToggleRetired={onToggleRetired}
        onToggleHideIsolated={onToggleHideIsolated}
      />
    );

    fireEvent.press(getByLabelText('Retired'));
    fireEvent.press(getByLabelText('Hide isolated'));

    expect(onToggleRetired).toHaveBeenCalledTimes(1);
    expect(onToggleHideIsolated).toHaveBeenCalledTimes(1);
  });

  it('marks a chip selected when its filter is active', () => {
    const filters: GraphFilters = { ...baseFilters, showRetired: true };
    const { getByLabelText } = render(
      <GraphFilterBar
        filters={filters}
        onToggleType={jest.fn()}
        onToggleRetired={jest.fn()}
        onToggleHideIsolated={jest.fn()}
      />
    );

    expect(getByLabelText('Retired').props.accessibilityState).toMatchObject({
      selected: true,
    });
  });
});
