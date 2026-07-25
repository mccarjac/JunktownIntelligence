import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GameLocation } from '@models/types';
import { colors, spacing, borderRadius, shadows } from '@/styles/theme';
import { commonStyles } from '@/styles/commonStyles';

interface MapInfoCardProps {
  location: GameLocation;
  onViewDetails: (locationId: string) => void;
  onClose: () => void;
}

export const MapInfoCard: React.FC<MapInfoCardProps> = ({
  location,
  onViewDetails,
  onClose,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>
          {location.name}
        </Text>
        <TouchableOpacity
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
      </View>

      {location.description ? (
        <Text style={styles.description} numberOfLines={3}>
          {location.description}
        </Text>
      ) : null}

      <TouchableOpacity
        style={styles.detailsButton}
        onPress={() => onViewDetails(location.id)}
        accessibilityRole="button"
        accessibilityLabel={`View details for ${location.name}`}
      >
        <Text style={styles.detailsButtonText}>View details</Text>
      </TouchableOpacity>
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
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  name: {
    ...commonStyles.text.h3,
    flex: 1,
    marginRight: spacing.md,
  },
  closeIcon: {
    color: colors.text.secondary,
    fontSize: 18,
    fontWeight: '600',
  },
  description: {
    ...commonStyles.text.body,
    marginBottom: spacing.base,
  },
  detailsButton: {
    ...commonStyles.button.base,
    ...commonStyles.button.primary,
  },
  detailsButtonText: commonStyles.button.text,
});
