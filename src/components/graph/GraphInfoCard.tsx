import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '@/styles/theme';
import { commonStyles } from '@/styles/commonStyles';
import type { GraphNode } from '@utils/relationshipGraph';
import { nodeTypeLabel } from './graphColors';

interface GraphInfoCardProps {
  node: GraphNode;
  isFocused: boolean;
  onViewDetails: (node: GraphNode) => void;
  onToggleFocus: (node: GraphNode) => void;
  onClose: () => void;
}

export const GraphInfoCard: React.FC<GraphInfoCardProps> = ({
  node,
  isFocused,
  onViewDetails,
  onToggleFocus,
  onClose,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <Text style={styles.name} numberOfLines={1}>
            {node.label}
          </Text>
          <Text style={styles.type}>{nodeTypeLabel(node.type)}</Text>
        </View>
        <TouchableOpacity
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.degree}>
        {node.degree} connection{node.degree === 1 ? '' : 's'}
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.focusButton]}
          onPress={() => onToggleFocus(node)}
          accessibilityRole="button"
          accessibilityLabel={
            isFocused ? 'Show full graph' : `Focus on ${node.label}`
          }
        >
          <Text style={styles.buttonText}>
            {isFocused ? 'Show full graph' : 'Focus'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.detailsButton]}
          onPress={() => onViewDetails(node)}
          accessibilityRole="button"
          accessibilityLabel={`View details for ${node.label}`}
        >
          <Text style={styles.buttonText}>View details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: spacing.base,
    right: spacing.base,
    bottom: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.large,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  titleGroup: {
    flex: 1,
    marginRight: spacing.md,
  },
  name: {
    ...commonStyles.text.h3,
  },
  type: {
    ...commonStyles.text.caption,
  },
  closeIcon: {
    color: colors.text.secondary,
    fontSize: 18,
    fontWeight: '600',
  },
  degree: {
    ...commonStyles.text.body,
    marginBottom: spacing.base,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    ...commonStyles.button.base,
  },
  focusButton: {
    ...commonStyles.button.secondary,
  },
  detailsButton: {
    ...commonStyles.button.primary,
  },
  buttonText: commonStyles.button.text,
});
