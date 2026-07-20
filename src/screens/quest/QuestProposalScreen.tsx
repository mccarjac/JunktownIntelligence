import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/navigation/types';
import {
  loadQuests,
  loadCharacters,
  updateQuest,
} from '@utils/characterStorage';
import { GameCharacter, GameQuest, QuestStatus } from '@models/types';
import { colors as themeColors } from '@/styles/theme';
import { commonStyles } from '@/styles/commonStyles';
import { BaseDetailScreen, Section } from '@/components';
import {
  QuestProposal,
  generateQuestProposals,
  scoreCharacterForQuest,
} from '@utils/questProposal';

type QuestProposalsNavigationProp = StackNavigationProp<
  RootStackParamList,
  'QuestProposals'
>;

export const QuestProposalScreen: React.FC = () => {
  const navigation = useNavigation<QuestProposalsNavigationProp>();

  const [loading, setLoading] = useState(true);
  const [quests, setQuests] = useState<GameQuest[]>([]);
  const [characters, setCharacters] = useState<GameCharacter[]>([]);
  const [proposals, setProposals] = useState<QuestProposal[]>([]);
  const [savedQuestIds, setSavedQuestIds] = useState<Set<string>>(new Set());

  // Fetches quests/characters and (re)computes proposals. `loading` starts
  // `true` already, so this only needs to clear it when done; callers that
  // re-invoke this after the initial mount (e.g. the Regenerate button) set
  // `loading` back to `true` themselves before calling it.
  const generate = async () => {
    try {
      const [questsData, charactersData] = await Promise.all([
        loadQuests(),
        loadCharacters(),
      ]);
      setQuests(questsData);
      setCharacters(charactersData);
      setProposals(generateQuestProposals(questsData, charactersData));
      setSavedQuestIds(new Set());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generate();
  }, []);

  const handleRegenerate = () => {
    setLoading(true);
    generate();
  };

  const questMap = useMemo(
    () => new Map(quests.map(quest => [quest.id, quest])),
    [quests]
  );
  const characterMap = useMemo(
    () => new Map(characters.map(character => [character.id, character])),
    [characters]
  );

  const saveProposal = useCallback(async (proposal: QuestProposal) => {
    await updateQuest(proposal.questId, {
      assignedCharacterIds: proposal.proposedCharacterIds,
      status: QuestStatus.Assigned,
    });
    setSavedQuestIds(prev => new Set(prev).add(proposal.questId));
  }, []);

  const handleSaveAll = async () => {
    const unsaved = proposals.filter(
      proposal =>
        !savedQuestIds.has(proposal.questId) &&
        proposal.proposedCharacterIds.length > 0
    );

    if (unsaved.length === 0) return;

    await Promise.all(unsaved.map(saveProposal));
    Alert.alert('Saved', 'Proposed teams have been saved to their quests.');
  };

  const handleDiscard = () => {
    navigation.goBack();
  };

  const renderHeaderRight = () => (
    <View style={styles.headerButtons}>
      <TouchableOpacity
        style={styles.headerActionButton}
        onPress={handleRegenerate}
      >
        <Text style={styles.headerActionText}>Regenerate</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.headerActionButton, styles.headerSaveButton]}
        onPress={handleSaveAll}
      >
        <Text style={styles.headerActionText}>Save All</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Generating proposals...</Text>
      </View>
    );
  }

  return (
    <BaseDetailScreen headerRight={renderHeaderRight()}>
      <Text style={styles.title}>Quest Team Proposals</Text>
      <Text style={styles.subtitle}>
        Proposed teams for unresolved quests that don&apos;t have a team
        assigned yet, drawn only from present characters.
      </Text>

      {proposals.length === 0 ? (
        <Section title="Nothing to propose">
          <Text style={styles.emptyText}>
            No quests currently need a proposal — every unresolved quest already
            has a team, or there are no present characters available.
          </Text>
        </Section>
      ) : (
        proposals.map(proposal => {
          const quest = questMap.get(proposal.questId);
          if (!quest) return null;
          const isSaved = savedQuestIds.has(proposal.questId);

          return (
            <Section key={proposal.questId} title={quest.name}>
              {proposal.proposedCharacterIds.length === 0 ? (
                <Text style={styles.emptyText}>
                  No present characters available to propose.
                </Text>
              ) : (
                <View style={styles.characterList}>
                  {proposal.proposedCharacterIds.map(characterId => {
                    const character = characterMap.get(characterId);
                    if (!character) return null;
                    const score = scoreCharacterForQuest(character, quest);
                    return (
                      <View key={characterId} style={styles.characterRow}>
                        <Text style={styles.characterName}>
                          {character.name}
                        </Text>
                        <Text style={styles.characterScore}>
                          score: {score}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (isSaved || proposal.proposedCharacterIds.length === 0) &&
                    styles.saveButtonDisabled,
                ]}
                disabled={isSaved || proposal.proposedCharacterIds.length === 0}
                onPress={() => saveProposal(proposal)}
              >
                <Text style={styles.saveButtonText}>
                  {isSaved ? 'Saved' : 'Save Team'}
                </Text>
              </TouchableOpacity>
            </Section>
          );
        })
      )}

      <TouchableOpacity style={styles.discardButton} onPress={handleDiscard}>
        <Text style={styles.discardButtonText}>Discard Proposals</Text>
      </TouchableOpacity>

      <View style={styles.footer} />
    </BaseDetailScreen>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: themeColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: commonStyles.text.body,
  title: {
    ...commonStyles.text.h1,
    marginBottom: 8,
  },
  subtitle: {
    ...commonStyles.text.body,
    marginBottom: 20,
  },
  emptyText: {
    ...commonStyles.text.body,
    color: themeColors.text.muted,
  },
  characterList: {
    gap: 8,
    marginBottom: 12,
  },
  characterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  characterName: {
    ...commonStyles.text.body,
    fontWeight: '600',
  },
  characterScore: commonStyles.text.caption,
  saveButton: {
    backgroundColor: themeColors.accent.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: themeColors.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionButton: {
    ...commonStyles.headerButton.edit,
    marginRight: 0,
  },
  headerSaveButton: {
    backgroundColor: themeColors.accent.success,
  },
  headerActionText: commonStyles.headerButton.text,
  discardButton: {
    borderWidth: 1,
    borderColor: themeColors.accent.danger,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  discardButtonText: {
    color: themeColors.accent.danger,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    height: 50,
  },
});
