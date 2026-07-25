import React from 'react';
import { StyleSheet } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';
import { clampTranslation, Size } from '@utils/mapCoordinates';
import type { GraphEdge, PositionedNode } from '@utils/relationshipGraph';
import { standingEdgeColor } from './graphColors';
import { GraphNodeMarker } from './GraphNodeMarker';

interface GraphCanvasProps {
  size: Size;
  nodes: PositionedNode[];
  edges: GraphEdge[];
  selectedNodeId: string | null;
  onSelectNode: (node: PositionedNode) => void;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  size,
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
}) => {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate(e => {
      scale.value = savedScale.value * e.scale;
      const clamped = clampTranslation(
        translateX.value,
        translateY.value,
        scale.value,
        size,
        size
      );
      translateX.value = clamped.x;
      translateY.value = clamped.y;
    })
    .onEnd(() => {
      let targetScale = scale.value;
      if (targetScale < 1) {
        targetScale = 1;
      } else if (targetScale > 3) {
        targetScale = 3;
      }
      const clamped = clampTranslation(
        translateX.value,
        translateY.value,
        targetScale,
        size,
        size
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
        size,
        size
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
      if (scale.value > 1) {
        scale.value = withTiming(1);
        savedScale.value = 1;
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
          size,
          size
        );
        scale.value = withTiming(targetScale);
        savedScale.value = targetScale;
        translateX.value = withTiming(clamped.x);
        translateY.value = withTiming(clamped.y);
        savedTranslateX.value = clamped.x;
        savedTranslateY.value = clamped.y;
      }
    });

  const composedGesture = Gesture.Simultaneous(
    doubleTap,
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
          style={[{ width: size.width, height: size.height }, animatedStyle]}
        >
          <Svg width={size.width} height={size.height}>
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
                onPress={onSelectNode}
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
  },
});
