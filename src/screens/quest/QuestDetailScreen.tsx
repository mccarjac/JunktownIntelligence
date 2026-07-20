import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/navigation/types';
import {
  loadQuests,
  loadCharacters,
  loadLocations,
  loadEvents,
  deleteQuest,
} from '@utils/characterStorage';
import { GameQuest, QuestStatus } from '@models/types';
import { colors as themeColors } from '@/styles/theme';
import { commonStyles } from '@/styles/commonStyles';
import { BaseDetailScreen, Section, CollapsibleSection } from '@/components';
import { formatEventDate } from '@utils/dateUtils';

type QuestsDetailNavigationProp = StackNavigationProp<
  RootStackParamList,
  'QuestsDetail'
>;

type QuestsDetailRouteProp = RouteProp<RootStackParamList, 'QuestsDetail'>;

const STATUS_LABELS: Record<QuestStatus, string> = {
  [QuestStatus.NotStarted]: 'Not Started',
  [QuestStatus.Assigned]: 'Assigned',
  [QuestStatus.InProgress]: 'In Progress',
  [QuestStatus.Successful]: 'Successful',
  [QuestStatus.Failure]: 'Failure',
};

const STATUS_COLORS: Record<QuestStatus, string> = {
  [QuestStatus.NotStarted]: themeColors.text.muted,
  [QuestStatus.Assigned]: themeColors.accent.info,
  [QuestStatus.InProgress]: themeColors.accent.warning,
  [QuestStatus.Successful]: themeColors.accent.success,
  [QuestStatus.Failure]: themeColors.accent.danger,
};

interface QuestWithDetails extends GameQuest {
  locationName?: string;
  characterNames: string[];
  eventTitles: string[];
}

export const QuestDetailScreen: React.FC = () => {
  const navigation = useNavigation<QuestsDetailNavigationProp>();
  const route = useRoute<QuestsDetailRouteProp>();
  const { questId } = route.params;

  const [quest, setQuest] = useState<QuestWithDetails | null>(null);

  const loadQuestDetails = useCallback(async () => {
    const [quests, characters, locations, events] = await Promise.all([
      loadQuests(),
      loadCharacters(),
      loadLocations(),
      loadEvents(),
    ]);

    const foundQuest = quests.find(q => q.id === questId);
    if (!foundQuest) {
      Alert.alert('Error', 'Quest not found', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      return;
    }

    const locationMap = new Map(locations.map(l => [l.id, l.name]));
    const characterMap = new Map(characters.map(c => [c.id, c.name]));
    const eventMap = new Map(events.map(e => [e.id, e.title]));

    const questWithDetails: QuestWithDetails = {
      ...foundQuest,
      locationName: foundQuest.locationId
        ? locationMap.get(foundQuest.locationId)
        : undefined,
      characterNames:
        foundQuest.assignedCharacterIds?.map(
          id => characterMap.get(id) || 'Unknown'
        ) || [],
      eventTitles:
        foundQuest.eventIds?.map(id => eventMap.get(id) || 'Unknown') || [],
    };

    setQuest(questWithDetails);
  }, [questId, navigation]);

  useFocusEffect(
    useCallback(() => {
      loadQuestDetails();
    }, [loadQuestDetails])
  );

  if (!quest) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const hasPreferences =
    (quest.desirable &&
      ((quest.desirable.tags?.length ?? 0) > 0 ||
        (quest.desirable.species?.length ?? 0) > 0 ||
        (quest.desirable.perkIds?.length ?? 0) > 0 ||
        (quest.desirable.distinctionIds?.length ?? 0) > 0)) ||
    (quest.undesirable &&
      ((quest.undesirable.tags?.length ?? 0) > 0 ||
        (quest.undesirable.species?.length ?? 0) > 0 ||
        (quest.undesirable.perkIds?.length ?? 0) > 0 ||
        (quest.undesirable.distinctionIds?.length ?? 0) > 0));

  return (
    <BaseDetailScreen
      onEditPress={() => navigation.navigate('QuestsForm', { quest })}
      deleteConfig={{
        itemName: `"${quest.name}"`,
        onDelete: async () => {
          const success = await deleteQuest(quest.id);
          if (!success) {
            throw new Error('Failed to delete quest');
          }
        },
      }}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.questName}>{quest.name}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: STATUS_COLORS[quest.status] },
          ]}
        >
          <Text style={styles.statusBadgeText}>
            {STATUS_LABELS[quest.status]}
          </Text>
        </View>
        {quest.date && (
          <Text style={styles.dateText}>
            {formatEventDate(quest.date, quest.time)}
          </Text>
        )}
      </View>

      {/* Details */}
      {quest.details && (
        <Section title="Details">
          <Text style={styles.bodyText}>{quest.details}</Text>
        </Section>
      )}

      {/* Overview */}
      <Section title="Overview">
        <View style={styles.overviewRow}>
          <Text style={styles.overviewLabel}>Team Size Goal</Text>
          <Text style={styles.overviewValue}>
            {quest.teamSize ?? 'Default'}
          </Text>
        </View>
        {quest.locationName && (
          <View style={styles.overviewRow}>
            <Text style={styles.overviewLabel}>Location</Text>
            <Text style={styles.overviewValue}>{quest.locationName}</Text>
          </View>
        )}
        {quest.junktownOffice && (
          <View style={styles.overviewRow}>
            <Text style={styles.overviewLabel}>Junktown Office</Text>
            <Text style={styles.overviewValue}>{quest.junktownOffice}</Text>
          </View>
        )}
      </Section>

      {/* Assigned Team */}
      <CollapsibleSection
        title={`Assigned Team (${quest.characterNames.length})`}
      >
        {quest.characterNames.length > 0 ? (
          <View style={styles.chipList}>
            {quest.characterNames.map((name, index) => (
              <View key={index} style={styles.chip}>
                <Text style={styles.chipText}>{name}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No characters assigned yet</Text>
        )}
      </CollapsibleSection>

      {/* Team Preferences */}
      {hasPreferences && (
        <CollapsibleSection title="Team Preferences" defaultCollapsed>
          {quest.desirable && (
            <View style={styles.preferenceGroup}>
              <Text style={styles.preferenceLabel}>Desirable</Text>
              <View style={styles.chipList}>
                {quest.desirable.tags?.map(tag => (
                  <View key={`tag-${tag}`} style={styles.chipPositive}>
                    <Text style={styles.chipText}>{tag}</Text>
                  </View>
                ))}
                {quest.desirable.species?.map(species => (
                  <View key={`species-${species}`} style={styles.chipPositive}>
                    <Text style={styles.chipText}>{species}</Text>
                  </View>
                ))}
                {quest.desirable.perkIds?.map(perkId => (
                  <View key={`perk-${perkId}`} style={styles.chipPositive}>
                    <Text style={styles.chipText}>{perkId}</Text>
                  </View>
                ))}
                {quest.desirable.distinctionIds?.map(distinctionId => (
                  <View
                    key={`distinction-${distinctionId}`}
                    style={styles.chipPositive}
                  >
                    <Text style={styles.chipText}>{distinctionId}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          {quest.undesirable && (
            <View style={styles.preferenceGroup}>
              <Text style={styles.preferenceLabel}>Undesirable</Text>
              <View style={styles.chipList}>
                {quest.undesirable.tags?.map(tag => (
                  <View key={`tag-${tag}`} style={styles.chipNegative}>
                    <Text style={styles.chipText}>{tag}</Text>
                  </View>
                ))}
                {quest.undesirable.species?.map(species => (
                  <View key={`species-${species}`} style={styles.chipNegative}>
                    <Text style={styles.chipText}>{species}</Text>
                  </View>
                ))}
                {quest.undesirable.perkIds?.map(perkId => (
                  <View key={`perk-${perkId}`} style={styles.chipNegative}>
                    <Text style={styles.chipText}>{perkId}</Text>
                  </View>
                ))}
                {quest.undesirable.distinctionIds?.map(distinctionId => (
                  <View
                    key={`distinction-${distinctionId}`}
                    style={styles.chipNegative}
                  >
                    <Text style={styles.chipText}>{distinctionId}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </CollapsibleSection>
      )}

      {/* Required Materials */}
      {quest.requiredMaterials && quest.requiredMaterials.length > 0 && (
        <CollapsibleSection
          title={`Required Materials (${quest.requiredMaterials.length})`}
        >
          <View style={styles.materialsList}>
            {quest.requiredMaterials.map(material => {
              const isComplete =
                material.quantityProvided >= material.quantityRequired;
              const isPartial = material.quantityProvided > 0 && !isComplete;
              return (
                <View key={material.id} style={styles.materialRow}>
                  <Text style={styles.materialName}>{material.name}</Text>
                  <View
                    style={[
                      styles.materialProgressBadge,
                      isComplete && styles.materialProgressComplete,
                      isPartial && styles.materialProgressPartial,
                    ]}
                  >
                    <Text style={styles.materialProgressText}>
                      {material.quantityProvided}/{material.quantityRequired}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </CollapsibleSection>
      )}

      {/* Related Factions */}
      {quest.factionNames && quest.factionNames.length > 0 && (
        <CollapsibleSection
          title={`Related Factions (${quest.factionNames.length})`}
          defaultCollapsed
        >
          <View style={styles.chipList}>
            {quest.factionNames.map((faction, index) => (
              <View key={index} style={styles.chip}>
                <Text style={styles.chipText}>{faction}</Text>
              </View>
            ))}
          </View>
        </CollapsibleSection>
      )}

      {/* Related Events */}
      {quest.eventTitles.length > 0 && (
        <CollapsibleSection
          title={`Related Events (${quest.eventTitles.length})`}
          defaultCollapsed
        >
          <View style={styles.chipList}>
            {quest.eventTitles.map((title, index) => (
              <View key={index} style={styles.chip}>
                <Text style={styles.chipText}>{title}</Text>
              </View>
            ))}
          </View>
        </CollapsibleSection>
      )}

      {/* Notes */}
      {quest.notes && (
        <Section title="Notes">
          <Text style={styles.bodyText}>{quest.notes}</Text>
        </Section>
      )}
    </BaseDetailScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.primary,
  },
  loadingText: {
    ...commonStyles.text.body,
    textAlign: 'center',
    marginTop: 40,
    paddingTop: 8,
  },
  header: {
    ...commonStyles.card.base,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  questName: {
    ...commonStyles.text.h1,
    textAlign: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    ...commonStyles.badge.base,
    marginBottom: 8,
  },
  statusBadgeText: commonStyles.badge.text,
  dateText: {
    ...commonStyles.text.body,
  },
  bodyText: {
    ...commonStyles.text.bodyLarge,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  overviewLabel: commonStyles.text.label,
  overviewValue: {
    ...commonStyles.text.body,
    fontWeight: '600',
  },
  chipList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    ...commonStyles.badge.base,
    backgroundColor: themeColors.elevated,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  chipPositive: {
    ...commonStyles.badge.base,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: themeColors.accent.success,
  },
  chipNegative: {
    ...commonStyles.badge.base,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: themeColors.accent.danger,
  },
  chipText: commonStyles.badge.text,
  preferenceGroup: {
    marginBottom: 16,
  },
  preferenceLabel: {
    ...commonStyles.text.label,
    marginBottom: 8,
  },
  emptyText: {
    ...commonStyles.text.body,
    color: themeColors.text.muted,
  },
  materialsList: {
    gap: 8,
  },
  materialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  materialName: {
    ...commonStyles.text.body,
    flex: 1,
  },
  materialProgressBadge: {
    ...commonStyles.badge.small,
    backgroundColor: themeColors.elevated,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  materialProgressPartial: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: themeColors.accent.warning,
  },
  materialProgressComplete: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: themeColors.accent.success,
  },
  materialProgressText: commonStyles.badge.text,
});
