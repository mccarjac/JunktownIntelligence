import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RelationshipStanding } from '@models/types';
import { colors, spacing, borderRadius, typography } from '@/styles/theme';
import type { GraphNodeType } from '@utils/relationshipGraph';
import { nodeTypeColor, nodeTypeLabel, standingEdgeColor } from './graphColors';

const NODE_TYPES: GraphNodeType[] = ['character', 'faction', 'location'];
const STANDINGS: RelationshipStanding[] = [
  RelationshipStanding.Ally,
  RelationshipStanding.Friend,
  RelationshipStanding.Neutral,
  RelationshipStanding.Hostile,
  RelationshipStanding.Enemy,
];

export const GraphLegend: React.FC = () => {
  return (
    <View style={styles.container} accessibilityLabel="Graph legend">
      <View style={styles.row}>
        {NODE_TYPES.map(type => (
          <View key={type} style={styles.item}>
            <View
              style={[styles.dot, { backgroundColor: nodeTypeColor(type) }]}
            />
            <Text style={styles.label}>{nodeTypeLabel(type)}</Text>
          </View>
        ))}
      </View>
      <View style={styles.row}>
        {STANDINGS.map(standing => (
          <View key={standing} style={styles.item}>
            <View
              style={[
                styles.line,
                { backgroundColor: standingEdgeColor(standing) },
              ]}
            />
            <Text style={styles.label}>{standing}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.full,
  },
  line: {
    width: 14,
    height: 3,
    borderRadius: borderRadius.sm,
  },
  label: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },
});
