import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { GraphSettingsPanel } from '@components/graph/GraphSettingsPanel';
import { DEFAULT_GRAPH_PREFERENCES } from '@utils/graphPreferences';

describe('GraphSettingsPanel', () => {
  const renderPanel = () => {
    const onChange = jest.fn();
    const onCommit = jest.fn();
    const onReset = jest.fn();
    const utils = render(
      <GraphSettingsPanel
        preferences={DEFAULT_GRAPH_PREFERENCES}
        onChange={onChange}
        onCommit={onCommit}
        onReset={onReset}
      />
    );
    return { ...utils, onChange, onCommit, onReset };
  };

  it('starts collapsed and expands when the toggle is pressed', () => {
    const { getByLabelText, queryByTestId } = renderPanel();

    expect(queryByTestId('graph-spacing-slider')).toBeNull();

    fireEvent.press(getByLabelText('Layout settings'));

    expect(queryByTestId('graph-spacing-slider')).not.toBeNull();
    expect(queryByTestId('graph-standing-slider')).not.toBeNull();
  });

  it('reports live spacing changes through onChange', () => {
    const { getByLabelText, getByTestId, onChange } = renderPanel();
    fireEvent.press(getByLabelText('Layout settings'));

    fireEvent(getByTestId('graph-spacing-slider'), 'valueChange', 2);

    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_GRAPH_PREFERENCES,
      spacing: 2,
    });
  });

  it('reports released slider values through onCommit', () => {
    const { getByLabelText, getByTestId, onCommit } = renderPanel();
    fireEvent.press(getByLabelText('Layout settings'));

    fireEvent(getByTestId('graph-standing-slider'), 'slidingComplete', 1.5);

    expect(onCommit).toHaveBeenCalledWith({
      ...DEFAULT_GRAPH_PREFERENCES,
      standingSpread: 1.5,
    });
  });

  it('fires onReset from the reset button', () => {
    const { getByLabelText, onReset } = renderPanel();
    fireEvent.press(getByLabelText('Layout settings'));

    fireEvent.press(getByLabelText('Reset layout settings'));

    expect(onReset).toHaveBeenCalled();
  });
});
