import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { GameLocation } from '@models/types';
import { colors, spacing, borderRadius } from '@/styles/theme';
import { commonStyles } from '@/styles/commonStyles';

interface MapLocationPickerModalProps {
  visible: boolean;
  locations: GameLocation[];
  onSelect: (locationId: string) => void;
  onCancel: () => void;
}

export const MapLocationPickerModal: React.FC<MapLocationPickerModalProps> = ({
  visible,
  locations,
  onSelect,
  onCancel,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>Place a location</Text>

          {locations.length === 0 ? (
            <Text style={styles.emptyText}>
              No saved locations yet. Create one first.
            </Text>
          ) : (
            <ScrollView style={styles.list}>
              {locations.map(location => (
                <TouchableOpacity
                  key={location.id}
                  style={styles.row}
                  onPress={() => onSelect(location.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Place ${location.name} here`}
                >
                  <Text style={styles.rowName} numberOfLines={1}>
                    {location.name}
                  </Text>
                  {location.mapCoordinates && (
                    <View style={styles.placedBadge}>
                      <Text style={styles.placedBadgeText}>placed</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  content: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    ...commonStyles.text.h2,
    marginBottom: spacing.base,
    textAlign: 'center',
  },
  emptyText: {
    ...commonStyles.text.body,
    textAlign: 'center',
    marginVertical: spacing.lg,
  },
  list: {
    maxHeight: 400,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowName: {
    ...commonStyles.text.body,
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing.md,
  },
  placedBadge: {
    ...commonStyles.badge.small,
    backgroundColor: colors.accent.success,
  },
  placedBadgeText: {
    ...commonStyles.badge.text,
    fontSize: 10,
  },
  cancelButton: {
    ...commonStyles.button.base,
    ...commonStyles.button.outline,
    marginTop: spacing.lg,
  },
  cancelButtonText: {
    ...commonStyles.button.text,
    color: colors.text.primary,
  },
});
