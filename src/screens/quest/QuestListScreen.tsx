import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { GameQuest, QuestStatus } from '@models/types';
import { loadQuests, reconcileQuestEventLinks } from '@utils/characterStorage';
import {
  useNavigation,
  useFocusEffect,
  CompositeNavigationProp,
} from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { RootStackParamList, RootDrawerParamList } from '@/navigation/types';
import { colors as themeColors } from '@/styles/theme';
import { commonStyles } from '@/styles/commonStyles';
import { Picker } from '@react-native-picker/picker';
import { BaseListScreen, HeaderAddButton } from '@/components';
import { formatEventDateShort } from '@utils/dateUtils';

type QuestListNavigationProp = CompositeNavigationProp<
  DrawerNavigationProp<RootDrawerParamList, 'Quests'>,
  StackNavigationProp<RootStackParamList>
>;

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

const materialsProgress = (quest: GameQuest): string | null => {
  const materials = quest.requiredMaterials;
  if (!materials || materials.length === 0) return null;

  const complete = materials.filter(
    m => m.quantityProvided >= m.quantityRequired
  ).length;
  return `${complete}/${materials.length} materials`;
};

export const QuestListScreen: React.FC = () => {
  const [quests, setQuests] = useState<GameQuest[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const navigation = useNavigation<QuestListNavigationProp>();

  const loadData = useCallback(async () => {
    // Backfill/prune quest<->event back-references (idempotent operation)
    await reconcileQuestEventLinks();

    const questsData = await loadQuests();
    setQuests([...questsData].sort((a, b) => a.name.localeCompare(b.name)));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const filteredQuests = React.useMemo(() => {
    let filtered = quests;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        quest =>
          quest.name.toLowerCase().includes(query) ||
          (quest.details && quest.details.toLowerCase().includes(query))
      );
    }

    if (filterStatus) {
      filtered = filtered.filter(quest => quest.status === filterStatus);
    }

    return filtered;
  }, [quests, searchQuery, filterStatus]);

  const handleQuestSelect = (quest: GameQuest) => {
    navigation.navigate('QuestsDetail', { questId: quest.id });
  };

  const handleCreateQuest = () => {
    navigation.navigate('QuestsForm', {});
  };

  const handleGenerateProposals = () => {
    navigation.navigate('QuestProposals');
  };

  const renderFilters = () => (
    <View style={styles.filterContainer}>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={filterStatus}
          onValueChange={setFilterStatus}
          style={styles.picker}
          dropdownIconColor={themeColors.text.secondary}
        >
          <Picker.Item label="All statuses" value="" />
          {Object.values(QuestStatus).map(status => (
            <Picker.Item
              key={status}
              label={STATUS_LABELS[status]}
              value={status}
            />
          ))}
        </Picker>
      </View>
    </View>
  );

  const renderQuestItem = (quest: GameQuest) => {
    const materials = materialsProgress(quest);
    const teamCount = quest.assignedCharacterIds?.length ?? 0;

    return (
      <TouchableOpacity
        style={styles.questCard}
        onPress={() => handleQuestSelect(quest)}
      >
        <View style={styles.questHeader}>
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
        </View>

        {quest.date && (
          <Text style={styles.questMeta}>
            {formatEventDateShort(quest.date, quest.time)}
          </Text>
        )}

        <View style={styles.questFooter}>
          <Text style={styles.questMeta}>
            {teamCount} character{teamCount !== 1 ? 's' : ''} assigned
          </Text>
          {materials && <Text style={styles.questMeta}>{materials}</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeaderRight = () => (
    <View style={styles.headerButtons}>
      <TouchableOpacity
        style={styles.headerProposalsButton}
        onPress={handleGenerateProposals}
      >
        <Text style={styles.headerProposalsButtonText}>Propose</Text>
      </TouchableOpacity>
      <HeaderAddButton onPress={handleCreateQuest} />
    </View>
  );

  return (
    <BaseListScreen
      data={filteredQuests}
      renderItem={renderQuestItem}
      keyExtractor={(item: GameQuest) => item.id}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search quests by name..."
      emptyStateTitle="No quests found"
      emptyStateSubtitle="Create a quest to get started"
      headerRight={renderHeaderRight()}
      ListHeaderComponent={renderFilters()}
    />
  );
};

const styles = StyleSheet.create({
  questCard: commonStyles.card.base,
  questHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  questName: {
    ...commonStyles.text.h3,
    flex: 1,
  },
  statusBadge: {
    ...commonStyles.badge.small,
  },
  statusBadgeText: {
    ...commonStyles.badge.text,
    fontSize: 11,
  },
  questFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  questMeta: commonStyles.text.caption,
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  pickerContainer: {
    backgroundColor: themeColors.elevated,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    color: themeColors.text.primary,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerProposalsButton: {
    ...commonStyles.headerButton.add,
    width: undefined,
    paddingHorizontal: 12,
  },
  headerProposalsButtonText: {
    ...commonStyles.headerButton.addText,
    fontSize: 13,
  },
});
