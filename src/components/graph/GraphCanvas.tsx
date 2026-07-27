import React, { useRef } from 'react';
import { StyleSheet } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';
import {
  clampTranslation,
  containerPointToNormalized,
  normalizedToImagePoint,
  Size,
} from '@utils/mapCoordinates';
import type { GraphEdge, PositionedNode } from '@utils/relationshipGraph';
import { standingEdgeColor } from './graphColors';
import { GraphNodeMarker } from './GraphNodeMarker';

interface GraphCanvasProps {
  /** Visible viewport size. */
  containerSize: Size;
  /**
   * Size of the layout canvas the nodes were positioned on. May be larger
   * than `containerSize` (spread-out layouts); pan/zoom navigates it.
   */
  contentSize: Size;
  nodes: PositionedNode[];
  edges: GraphEdge[];
  selectedNodeId: string | null;
  /** Tap on a node: navigate straight to its detail screen. */
  onPressNode: (node: PositionedNode) => void;
  /** Long-press on a node: open the info card (focus / details). */
  onLongPressNode: (node: PositionedNode) => void;
}

const MAX_SCALE = 3;
/** How close (in content px) a tap must land to a node's center to hit it. */
const NODE_HIT_RADIUS = 30;
/**
 * Node presses are detected twice: canvas-level gestures (below) and the
 * SVG markers' own onPress/onLongPress. The SVG path doesn't fire reliably
 * on-device inside a GestureDetector (notably Android / New Architecture),
 * so the gestures are the primary mechanism — but where both DO fire, this
 * window swallows the duplicate.
 */
const DUPLICATE_PRESS_WINDOW_MS = 600;

interface LastPress {
  id: string;
  time: number;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  containerSize,
  contentSize,
  nodes,
  edges,
  selectedNodeId,
  onPressNode,
  onLongPressNode,
}) => {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const lastPress = useRef<LastPress>({ id: '', time: 0 });
  const lastLongPress = useRef<LastPress>({ id: '', time: 0 });

  // Zooming out to minScale fits the whole (possibly oversized) content in
  // the viewport; never above 1 so a small graph isn't blown up.
  const minScale =
    contentSize.width > 0 && contentSize.height > 0
      ? Math.min(
          1,
          containerSize.width / contentSize.width,
          containerSize.height / contentSize.height
        )
      : 1;

  const shouldHandle = (
    ref: React.MutableRefObject<LastPress>,
    node: PositionedNode
  ): boolean => {
    const now = Date.now();
    if (
      ref.current.id === node.id &&
      now - ref.current.time < DUPLICATE_PRESS_WINDOW_MS
    ) {
      return false;
    }
    ref.current = { id: node.id, time: now };
    return true;
  };

  const handleMarkerPress = (node: PositionedNode) => {
    if (shouldHandle(lastPress, node)) {
      onPressNode(node);
    }
  };

  const handleMarkerLongPress = (node: PositionedNode) => {
    if (shouldHandle(lastLongPress, node)) {
      onLongPressNode(node);
    }
  };

  /**
   * Maps a touch point in container coordinates to content coordinates
   * (inverting the centered pan/zoom transform) and returns the node whose
   * center is nearest, if within NODE_HIT_RADIUS.
   */
  const nodeAtContainerPoint = (
    x: number,
    y: number,
    currentScale: number,
    currentTranslateX: number,
    currentTranslateY: number
  ): PositionedNode | null => {
    const normalized = containerPointToNormalized(
      { x, y },
      containerSize,
      contentSize,
      {
        scale: currentScale,
        translateX: currentTranslateX,
        translateY: currentTranslateY,
      }
    );
    if (!normalized) {
      return null;
    }
    const point = normalizedToImagePoint(normalized, contentSize);
    let nearest: PositionedNode | null = null;
    let nearestDist = Infinity;
    nodes.forEach(node => {
      const dist = Math.hypot(node.x - point.x, node.y - point.y);
      if (dist < nearestDist) {
        nearest = node;
        nearestDist = dist;
      }
    });
    return nearest && nearestDist <= NODE_HIT_RADIUS ? nearest : null;
  };

  const handleCanvasTap = (
    x: number,
    y: number,
    currentScale: number,
    currentTranslateX: number,
    currentTranslateY: number
  ) => {
    const node = nodeAtContainerPoint(
      x,
      y,
      currentScale,
      currentTranslateX,
      currentTranslateY
    );
    if (node) {
      handleMarkerPress(node);
    }
  };

  const handleCanvasLongPress = (
    x: number,
    y: number,
    currentScale: number,
    currentTranslateX: number,
    currentTranslateY: number
  ) => {
    const node = nodeAtContainerPoint(
      x,
      y,
      currentScale,
      currentTranslateX,
      currentTranslateY
    );
    if (node) {
      handleMarkerLongPress(node);
    }
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate(e => {
      scale.value = savedScale.value * e.scale;
      const clamped = clampTranslation(
        translateX.value,
        translateY.value,
        scale.value,
        contentSize,
        containerSize
      );
      translateX.value = clamped.x;
      translateY.value = clamped.y;
    })
    .onEnd(() => {
      let targetScale = scale.value;
      if (targetScale < minScale) {
        targetScale = minScale;
      } else if (targetScale > MAX_SCALE) {
        targetScale = MAX_SCALE;
      }
      const clamped = clampTranslation(
        translateX.value,
        translateY.value,
        targetScale,
        contentSize,
        containerSize
      );
      scale.value = withTiming(targetScale);
      translateX.value = withTiming(clamped.x);
      translateY.value = withTiming(clamped.y);
      savedScale.value = targetScale;
      savedTranslateX.value = clamped.x;
      savedTranslateY.value = clamped.y;
    });

  const panGesture = Gesture.Pan()
    .onUpdate(e => {
      const clamped = clampTranslation(
        savedTranslateX.value + e.translationX,
        savedTranslateY.value + e.translationY,
        scale.value,
        contentSize,
        containerSize
      );
      translateX.value = clamped.x;
      translateY.value = clamped.y;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > minScale) {
        // Zoom out to fit the whole graph.
        scale.value = withTiming(minScale);
        savedScale.value = minScale;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        const targetScale = 2;
        const clamped = clampTranslation(
          translateX.value,
          translateY.value,
          targetScale,
          contentSize,
          containerSize
        );
        scale.value = withTiming(targetScale);
        savedScale.value = targetScale;
        translateX.value = withTiming(clamped.x);
        translateY.value = withTiming(clamped.y);
        savedTranslateX.value = clamped.x;
        savedTranslateY.value = clamped.y;
      }
    });

  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd((e, success) => {
      if (!success) {
        return;
      }
      runOnJS(handleCanvasTap)(
        e.x,
        e.y,
        scale.value,
        translateX.value,
        translateY.value
      );
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(400)
    .onStart(e => {
      runOnJS(handleCanvasLongPress)(
        e.x,
        e.y,
        scale.value,
        translateX.value,
        translateY.value
      );
    });

  const composedGesture = Gesture.Simultaneous(
    // Single tap must wait for double-tap to fail, or it fires on the first
    // tap of a double-tap zoom.
    Gesture.Exclusive(doubleTap, singleTap),
    longPressGesture,
    Gesture.Simultaneous(pinchGesture, panGesture)
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={styles.container}
        accessibilityLabel="Relationship graph canvas"
      >
        <Animated.View
          style={[
            { width: contentSize.width, height: contentSize.height },
            animatedStyle,
          ]}
        >
          <Svg width={contentSize.width} height={contentSize.height}>
            {edges.map(edge => {
              const source = nodes.find(n => n.id === edge.sourceId);
              const target = nodes.find(n => n.id === edge.targetId);
              if (!source || !target) {
                return null;
              }
              return (
                <Line
                  key={edge.id}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={standingEdgeColor(edge.standing)}
                  strokeWidth={2}
                  strokeOpacity={0.7}
                />
              );
            })}
            {nodes.map(node => (
              <GraphNodeMarker
                key={node.id}
                node={node}
                selected={node.id === selectedNodeId}
                onPress={handleMarkerPress}
                onLongPress={handleMarkerLongPress}
              />
            ))}
          </Svg>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    // clampTranslation's symmetric bounds assume the content is centered in
    // the viewport (same pattern as LocationMapScreen's imageContainer);
    // without this an oversized canvas anchors top-left and pans wrong.
    justifyContent: 'center',
    alignItems: 'center',
  },
});
