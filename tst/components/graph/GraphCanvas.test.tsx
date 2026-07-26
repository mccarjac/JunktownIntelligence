import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Gesture } from 'react-native-gesture-handler';
import { GraphCanvas } from '@components/graph/GraphCanvas';
import type { PositionedNode } from '@utils/relationshipGraph';

// The jest.setup.js gesture-handler mock records every chained callback on
// the stub each Gesture.X() call returns, so tests can drive the canvas-level
// tap/long-press hit-testing exactly as RNGH would on-device.

const SIZE = { width: 400, height: 400 };

const makeNode = (
  id: string,
  label: string,
  x: number,
  y: number
): PositionedNode => ({
  id,
  type: 'character',
  label,
  refId: id,
  degree: 0,
  x,
  y,
});

type GestureStub = {
  callbacks: Record<string, (...args: unknown[]) => void>;
};

// With container == content, scale 1, translate 0, container coordinates map
// 1:1 onto content coordinates.
const IDENTITY_TAP = (x: number, y: number) => ({ x, y });

describe('GraphCanvas', () => {
  const nodeAlice = makeNode('character:c-alice', 'Alice', 100, 100);
  const nodeBob = makeNode('character:c-bob', 'Bob', 300, 300);

  const renderCanvas = () => {
    const onPressNode = jest.fn();
    const onLongPressNode = jest.fn();
    const utils = render(
      <GraphCanvas
        containerSize={SIZE}
        contentSize={SIZE}
        nodes={[nodeAlice, nodeBob]}
        edges={[]}
        selectedNodeId={null}
        onPressNode={onPressNode}
        onLongPressNode={onLongPressNode}
      />
    );
    // Component creation order: Tap #1 = double-tap, Tap #2 = single tap.
    const tapStubs = (Gesture.Tap as jest.Mock).mock.results.map(
      result => result.value as GestureStub
    );
    const singleTap = tapStubs[tapStubs.length - 1];
    const longPressStubs = (Gesture.LongPress as jest.Mock).mock.results.map(
      result => result.value as GestureStub
    );
    const longPress = longPressStubs[longPressStubs.length - 1];
    return { ...utils, onPressNode, onLongPressNode, singleTap, longPress };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fires onPressNode for a canvas tap that lands on a node', () => {
    const { onPressNode, singleTap } = renderCanvas();

    singleTap.callbacks.onEnd(IDENTITY_TAP(102, 98), true);

    expect(onPressNode).toHaveBeenCalledWith(nodeAlice);
  });

  it('ignores canvas taps that land on empty space', () => {
    const { onPressNode, singleTap } = renderCanvas();

    singleTap.callbacks.onEnd(IDENTITY_TAP(200, 200), true);

    expect(onPressNode).not.toHaveBeenCalled();
  });

  it('fires onLongPressNode for a canvas long-press on a node', () => {
    const { onLongPressNode, longPress } = renderCanvas();

    longPress.callbacks.onStart(IDENTITY_TAP(295, 305));

    expect(onLongPressNode).toHaveBeenCalledWith(nodeBob);
  });

  it('swallows the duplicate when the SVG marker press fires alongside the gesture', () => {
    const { onPressNode, singleTap, getByLabelText } = renderCanvas();

    // On platforms where the SVG responder works, the marker press fires
    // first and the canvas tap arrives a beat later for the same node.
    fireEvent.press(getByLabelText('Alice'));
    singleTap.callbacks.onEnd(IDENTITY_TAP(100, 100), true);

    expect(onPressNode).toHaveBeenCalledTimes(1);
  });

  it('still delivers SVG marker presses (fallback path)', () => {
    const { onPressNode, getByLabelText } = renderCanvas();

    fireEvent.press(getByLabelText('Bob'));

    expect(onPressNode).toHaveBeenCalledWith(nodeBob);
  });
});
