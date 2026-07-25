import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { colors as themeColors } from '@/styles/theme';
import { commonStyles } from '@/styles/commonStyles';
import { CollapsibleSection } from './CollapsibleSection';
import type {
  ConflictResolution,
  SyncCollection,
  SyncConflict,
} from '@utils/syncMerge';

interface SyncConflictModalProps {
  visible: boolean;
  conflicts: SyncConflict[];
  onResolve: (resolutions: Record<string, ConflictResolution>) => void;
  onCancel: () => void;
}

const COLLECTION_LABELS: Record<SyncCollection, string> = {
  characters: 'Character',
  factions: 'Faction',
  locations: 'Location',
  events: 'Event',
  quests: 'Quest',
};

const conflictKey = (conflict: SyncConflict): string =>
  `${conflict.collection}:${conflict.key}`;

const isDeletionSentinel = (fields: string[]): boolean =>
  fields.length === 1 && fields[0].startsWith('(deleted');

const formatValue = (value: unknown): string => {
  if (value === undefined) return '(none)';
  if (value === null) return '(deleted)';
  if (typeof value === 'string') {
    return value.length > 60 ? `${value.slice(0, 60)}…` : value || '(empty)';
  }
  const json = JSON.stringify(value);
  return json.length > 60 ? `${json.slice(0, 60)}…` : json;
};

const fieldValue = (record: unknown, field: string): unknown =>
  record && typeof record === 'object' && field in record
    ? (record as Record<string, unknown>)[field]
    : undefined;

const defaultResolutions = (
  conflicts: SyncConflict[]
): Record<string, ConflictResolution> =>
  Object.fromEntries(conflicts.map(c => [conflictKey(c), 'local' as const]));

export const SyncConflictModal: React.FC<SyncConflictModalProps> = ({
  visible,
  conflicts,
  onResolve,
  onCancel,
}) => {
  const [resolutions, setResolutions] = useState<
    Record<string, ConflictResolution>
  >(() => defaultResolutions(conflicts));

  // Every conflict defaults to keeping the local value, so cancelling or
  // applying without touching a row never silently discards local work.
  useEffect(() => {
    setResolutions(defaultResolutions(conflicts));
  }, [conflicts]);

  const setAll = (resolution: ConflictResolution) => {
    setResolutions(
      Object.fromEntries(conflicts.map(c => [conflictKey(c), resolution]))
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>Resolve Sync Conflicts</Text>
          <Text style={styles.subtitle}>
            {conflicts.length} record{conflicts.length === 1 ? '' : 's'} changed
            on both sides. Choose which version to keep for each.
          </Text>

          <View style={styles.bulkRow}>
            <TouchableOpacity
              style={[styles.bulkButton, styles.bulkButtonSecondary]}
              onPress={() => setAll('local')}
            >
              <Text style={styles.bulkButtonText}>Keep All Mine</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkButton, styles.bulkButtonSecondary]}
              onPress={() => setAll('remote')}
            >
              <Text style={styles.bulkButtonText}>Keep All Theirs</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea}>
            {conflicts.map(conflict => {
              const key = conflictKey(conflict);
              const resolution = resolutions[key] ?? 'local';
              const deletion = isDeletionSentinel(conflict.fields);

              return (
                <CollapsibleSection
                  key={key}
                  title={`${COLLECTION_LABELS[conflict.collection]}: ${conflict.label}`}
                  style={styles.conflictSection}
                >
                  {deletion ? (
                    <Text style={styles.fieldValue}>
                      {conflict.fields[0] === '(deleted remotely)'
                        ? 'You edited this record; it was deleted remotely.'
                        : 'You deleted this record; it was edited remotely.'}
                    </Text>
                  ) : (
                    conflict.fields.map(field => (
                      <View key={field} style={styles.fieldRow}>
                        <Text style={styles.fieldName}>{field}</Text>
                        <Text style={styles.fieldValue}>
                          Mine: {formatValue(fieldValue(conflict.local, field))}
                        </Text>
                        <Text style={styles.fieldValue}>
                          Theirs:{' '}
                          {formatValue(fieldValue(conflict.remote, field))}
                        </Text>
                      </View>
                    ))
                  )}

                  <View style={styles.choiceRow}>
                    <TouchableOpacity
                      style={[
                        styles.choiceButton,
                        resolution === 'local' && styles.choiceButtonSelected,
                      ]}
                      onPress={() =>
                        setResolutions({ ...resolutions, [key]: 'local' })
                      }
                    >
                      <Text style={styles.choiceButtonText}>Keep Mine</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.choiceButton,
                        resolution === 'remote' && styles.choiceButtonSelected,
                      ]}
                      onPress={() =>
                        setResolutions({ ...resolutions, [key]: 'remote' })
                      }
                    >
                      <Text style={styles.choiceButtonText}>Keep Theirs</Text>
                    </TouchableOpacity>
                  </View>
                </CollapsibleSection>
              );
            })}
          </ScrollView>

          <View style={styles.footerRow}>
            <TouchableOpacity
              style={[styles.footerButton, styles.cancelButton]}
              onPress={onCancel}
            >
              <Text style={styles.footerButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerButton, styles.applyButton]}
              onPress={() => onResolve(resolutions)}
            >
              <Text style={styles.footerButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
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
    padding: 20,
  },
  content: {
    backgroundColor: themeColors.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 560,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  title: {
    ...commonStyles.text.h2,
    textAlign: 'center',
  },
  subtitle: {
    ...commonStyles.text.body,
    color: themeColors.text.secondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  bulkRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  bulkButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulkButtonSecondary: {
    backgroundColor: themeColors.elevated,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  bulkButtonText: {
    ...commonStyles.text.body,
    fontWeight: '600',
    color: themeColors.text.primary,
  },
  scrollArea: {
    maxHeight: 420,
  },
  conflictSection: {
    marginBottom: 12,
  },
  fieldRow: {
    marginBottom: 8,
  },
  fieldName: {
    ...commonStyles.text.body,
    fontWeight: '700',
    color: themeColors.text.primary,
  },
  fieldValue: {
    ...commonStyles.text.body,
    color: themeColors.text.secondary,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  choiceButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.elevated,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  choiceButtonSelected: {
    backgroundColor: themeColors.accent.primary,
    borderColor: themeColors.accent.primary,
  },
  choiceButtonText: {
    ...commonStyles.text.body,
    fontWeight: '600',
    color: themeColors.text.primary,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  footerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: themeColors.elevated,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  applyButton: {
    backgroundColor: themeColors.accent.primary,
  },
  footerButtonText: {
    ...commonStyles.text.body,
    fontWeight: '600',
    color: themeColors.text.primary,
  },
});
