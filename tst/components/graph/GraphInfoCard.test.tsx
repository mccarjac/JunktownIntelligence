import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GraphInfoCard } from '@components/graph/GraphInfoCard';
import type { GraphNode } from '@utils/relationshipGraph';

const characterNode: GraphNode = {
  id: 'character:c-1',
  type: 'character',
  label: 'Alice',
  refId: 'c-1',
  degree: 3,
};

describe('GraphInfoCard', () => {
  it('renders the node label, type, and degree', () => {
    const { getByText } = render(
      <GraphInfoCard
        node={characterNode}
        isFocused={false}
        onViewDetails={jest.fn()}
        onToggleFocus={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(getByText('Alice')).toBeTruthy();
    expect(getByText('Character')).toBeTruthy();
    expect(getByText('3 connections')).toBeTruthy();
  });

  it('singularizes the connection count for degree 1', () => {
    const { getByText } = render(
      <GraphInfoCard
        node={{ ...characterNode, degree: 1 }}
        isFocused={false}
        onViewDetails={jest.fn()}
        onToggleFocus={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(getByText('1 connection')).toBeTruthy();
  });

  it('calls onViewDetails with the node when "View details" is pressed', () => {
    const onViewDetails = jest.fn();
    const { getByText } = render(
      <GraphInfoCard
        node={characterNode}
        isFocused={false}
        onViewDetails={onViewDetails}
        onToggleFocus={jest.fn()}
        onClose={jest.fn()}
      />
    );

    fireEvent.press(getByText('View details'));

    expect(onViewDetails).toHaveBeenCalledWith(characterNode);
  });

  it('shows "Focus" when not focused and calls onToggleFocus when pressed', () => {
    const onToggleFocus = jest.fn();
    const { getByText } = render(
      <GraphInfoCard
        node={characterNode}
        isFocused={false}
        onViewDetails={jest.fn()}
        onToggleFocus={onToggleFocus}
        onClose={jest.fn()}
      />
    );

    fireEvent.press(getByText('Focus'));

    expect(onToggleFocus).toHaveBeenCalledWith(characterNode);
  });

  it('shows "Show full graph" when the node is focused', () => {
    const { getByText, queryByText } = render(
      <GraphInfoCard
        node={characterNode}
        isFocused={true}
        onViewDetails={jest.fn()}
        onToggleFocus={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(getByText('Show full graph')).toBeTruthy();
    expect(queryByText('Focus')).toBeNull();
  });

  it('calls onClose when the close button is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <GraphInfoCard
        node={characterNode}
        isFocused={false}
        onViewDetails={jest.fn()}
        onToggleFocus={jest.fn()}
        onClose={onClose}
      />
    );

    fireEvent.press(getByText('✕'));

    expect(onClose).toHaveBeenCalled();
  });
});
