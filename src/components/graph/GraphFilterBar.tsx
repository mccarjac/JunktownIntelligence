import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/styles/theme';
import type { GraphNodeType } from '@utils/relationshipGraph';
import { nodeTypeColor, nodeTypeLabel } from './graphColors';

const NODE_TYPES: GraphNodeType[] = ['character', 'faction', 'location'];

export interface GraphFilters {
  visibleTypes: Set<GraphNodeType>;
  showRetired: boolean;
  hideIsolated: boolean;
}

interface GraphFilterBarProps {
  filters: GraphFilters;
  onToggleType: (type: GraphNodeType) => void;
  onToggleRetired: () => void;
  onToggleHideIsolated: () => void;
}

const Chip: React.FC<{
  label: string;
  active: boolean;
  color?: string;
  onPress: () => void;
}> = ({ label, active, color, onPress }) => (
  <TouchableOpacity
    style={[
      styles.chip,
      active && styles.chipActive,
      active && color ? { borderColor: color } : null,
    ]}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ selected: active }}
  >
    {color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
    <Text style={[styles.chipText, active && styles.chipTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

export const GraphFilterBar: React.FC<GraphFilterBarProps> = ({
  filters,
  onToggleType,
  onToggleRetired,
  onToggleHideIsolated,
}) => {
  return (
    <View style={styles.container}>
      {NODE_TYPES.map(type => (
        <Chip
          key={type}
          label={nodeTypeLabel(type)}
          active={filters.visibleTypes.has(type)}
          color={nodeTypeColor(type)}
          onPress={() => onToggleType(type)}
        />
      ))}
      <Chip
        label="Retired"
        active={filters.showRetired}
        onPress={onToggleRetired}
      />
      <Chip
        label="Hide isolated"
        active={filters.hideIsolated}
        onPress={onToggleHideIsolated}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.elevated,
  },
  chipText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  chipTextActive: {
    color: colors.text.primary,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    marginRight: spacing.xs,
  },
});
