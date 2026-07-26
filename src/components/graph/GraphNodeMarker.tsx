import React from 'react';
import { Circle, G, Text as SvgText } from 'react-native-svg';
import { colors, typography } from '@/styles/theme';
import type { PositionedNode } from '@utils/relationshipGraph';
import { nodeTypeColor } from './graphColors';

const NODE_RADIUS = 16;
const LABEL_MAX_CHARS = 12;

const truncateLabel = (label: string): string =>
  label.length > LABEL_MAX_CHARS
    ? `${label.slice(0, LABEL_MAX_CHARS - 1)}…`
    : label;

interface GraphNodeMarkerProps {
  node: PositionedNode;
  selected: boolean;
  /** Tap: navigate straight to the entity's detail screen. */
  onPress: (node: PositionedNode) => void;
  /** Long-press: open the info card (focus / details). */
  onLongPress: (node: PositionedNode) => void;
}

export const GraphNodeMarker: React.FC<GraphNodeMarkerProps> = ({
  node,
  selected,
  onPress,
  onLongPress,
}) => {
  const fill = nodeTypeColor(node.type);

  return (
    <G
      onPress={() => onPress(node)}
      onLongPress={() => onLongPress(node)}
      accessibilityRole="button"
      accessibilityLabel={node.label}
    >
      <Circle
        cx={node.x}
        cy={node.y}
        r={selected ? NODE_RADIUS + 3 : NODE_RADIUS}
        fill={fill}
        stroke={selected ? colors.text.primary : colors.border}
        strokeWidth={selected ? 3 : 1.5}
      />
      <SvgText
        x={node.x}
        y={node.y + NODE_RADIUS + typography.fontSize.sm + 2}
        fontSize={typography.fontSize.sm}
        fill={colors.text.primary}
        textAnchor="middle"
      >
        {truncateLabel(node.label)}
      </SvgText>
    </G>
  );
};
