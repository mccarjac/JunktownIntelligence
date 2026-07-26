import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/navigation/types';
import { loadCharacters, loadFactions } from '@/utils/characterStorage';
import {
  calculateFactionStats,
  calculateCombinedFactionStats,
  FactionStats,
  CombinedFactionAnalysis,
} from '@/utils/factionStats';
import { colors as themeColors } from '@/styles/theme';
import { commonStyles } from '@/styles/commonStyles';
import { PerkTag } from '@/models/gameData';
import { CollapsibleSection, InfoButton } from '@/components';
import { useLabels, useRuleset } from '@/ruleset';

type FactionStatsNavigationProp = StackNavigationProp<RootStackParamList>;

export const FactionStatsScreen: React.FC = () => {
  const navigation = useNavigation<FactionStatsNavigationProp>();
  const label = useLabels();
  const { ruleset } = useRuleset();
  const [factionStats, setFactionStats] = useState<FactionStats[]>([]);
  const [selectedFaction, setSelectedFaction] = useState<string | null>(null);
  const [combinedAnalysis, setCombinedAnalysis] =
    useState<CombinedFactionAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const characters = await loadCharacters();
      const factions = await loadFactions();

      // Filter out retired characters and factions
      const activeCharacters = characters.filter(c => !c.retired);
      const activeFactions = factions.filter(f => !f.retired);

      // Build faction relationships map
      const relationshipsMap = new Map();
      activeFactions.forEach(faction => {
        relationshipsMap.set(faction.name, faction.relationships || []);
      });

      // Calculate stats for each faction
      const stats = activeFactions.map(faction =>
        calculateFactionStats(
          faction.name,
          activeCharacters,
          faction.relationships || [],
          ruleset
        )
      );

      // Sort by member count descending
      stats.sort((a, b) => b.totalMembers - a.totalMembers);

      setFactionStats(stats);
    } catch (error) {
      console.error('Error loading faction stats:', error);
    } finally {
      setLoading(false);
    }
  }, [ruleset]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleFactionPress = async (factionName: string) => {
    if (selectedFaction === factionName) {
      setSelectedFaction(null);
      setCombinedAnalysis(null);
    } else {
      setSelectedFaction(factionName);

      // Calculate combined analysis
      try {
        const characters = await loadCharacters();
        const factions = await loadFactions();
        const activeCharacters = characters.filter(c => !c.retired);
        const activeFactions = factions.filter(f => !f.retired);

        const relationshipsMap = new Map();
        activeFactions.forEach(faction => {
          relationshipsMap.set(faction.name, faction.relationships || []);
        });

        const analysis = calculateCombinedFactionStats(
          factionName,
          activeCharacters,
          relationshipsMap,
          ruleset
        );
        setCombinedAnalysis(analysis);
      } catch (error) {
        console.error('Error calculating combined analysis:', error);
      }
    }
  };

  const renderPerkTagBar = (tag: PerkTag, count: number, maxCount: number) => {
    const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
    const widthPercentage = `${Math.max(percentage, 5)}%` as const; // Minimum 5% width for visibility

    return (
      <View key={tag} style={styles.perkTagRow}>
        <Text style={styles.perkTagLabel}>{tag}</Text>
        <View style={styles.perkTagBarContainer}>
          <View
            style={[
              styles.perkTagBar,
              {
                width: widthPercentage,
                backgroundColor: getPerkTagColor(tag),
              },
            ]}
          >
            <Text style={styles.perkTagCount}>{count}</Text>
          </View>
        </View>
      </View>
    );
  };

  const getPerkTagColor = (tag: PerkTag): string => {
    const colorMap: Record<PerkTag, string> = {
      [PerkTag.Agility]: '#3498DB',
      [PerkTag.Charisma]: '#E91E63',
      [PerkTag.Crafting]: '#FF9800',
      [PerkTag.Defense]: '#9C27B0',
      [PerkTag.Endurance]: '#4CAF50',
      [PerkTag.Finesse]: '#00BCD4',
      [PerkTag.Grit]: '#795548',
      [PerkTag.Medical]: '#F44336',
      [PerkTag.Smarts]: '#2196F3',
      [PerkTag.Strength]: '#E74C3C',
      [PerkTag.Teamwork]: '#009688',
      [PerkTag.Technical]: '#607D8B',
    };
    return colorMap[tag] || themeColors.accent.primary;
  };

  const renderFactionCard = (stats: FactionStats) => {
    const isSelected = selectedFaction === stats.factionName;

    return (
      <View key={stats.factionName} style={styles.factionCard}>
        <TouchableOpacity
          onPress={() => handleFactionPress(stats.factionName)}
          activeOpacity={0.7}
        >
          <View style={styles.factionHeader}>
            <Text style={styles.factionName}>{stats.factionName}</Text>
            <View style={styles.factionHeaderRight}>
              <View style={styles.memberBadge}>
                <Text style={styles.memberBadgeText}>
                  {stats.totalMembers} members
                </Text>
              </View>
              <Text style={styles.expandIcon}>{isSelected ? '▼' : '▶'}</Text>
            </View>
          </View>

          <View style={styles.quickStats}>
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>{stats.presentMembers}</Text>
              <Text style={styles.quickStatLabel}>Present</Text>
            </View>
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>
                {stats.alliedFactions.length}
              </Text>
              <Text style={styles.quickStatLabel}>Allies</Text>
            </View>
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>
                {stats.enemyFactions.length}
              </Text>
              <Text style={styles.quickStatLabel}>Enemies</Text>
            </View>
          </View>
        </TouchableOpacity>

        {isSelected && (
          <View style={styles.expandedContent}>
            {/* Perk Tags Analysis */}
            <View style={styles.sectionWithInfo}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {label('trait.singular')} {label('traitCategory.singular')}{' '}
                  Analysis
                </Text>
                <InfoButton
                  title={`${label('trait.singular')} ${label(
                    'traitCategory.singular'
                  )} Analysis`}
                  content={`This graph shows the distribution of ${label(
                    'trait.singular',
                    'lower'
                  )} ${label(
                    'traitCategory.plural',
                    'lower'
                  )} among faction members. Each bar represents the total count of ${label(
                    'trait.plural',
                    'lower'
                  )} with that ${label(
                    'traitCategory.singular',
                    'lower'
                  )} across all members. For example, if 5 members each have 2 Strength ${label(
                    'trait.plural',
                    'lower'
                  )}, the Strength bar would show 10. This helps identify the faction's collective strengths and specializations.`}
                />
              </View>
              {stats.topPerkTags.length > 0 ? (
                <View style={styles.perkTagsContainer}>
                  {stats.topPerkTags.map(item =>
                    renderPerkTagBar(
                      item.tag,
                      item.count,
                      stats.topPerkTags[0].count
                    )
                  )}
                </View>
              ) : (
                <Text style={styles.emptyText}>
                  No {label('trait.singular', 'lower')}{' '}
                  {label('traitCategory.plural', 'lower')} found for this
                  faction
                </Text>
              )}
            </View>

            {/* Common Perks */}
            <CollapsibleSection
              title={`Common ${label('trait.plural')}`}
              defaultCollapsed={true}
            >
              {stats.commonPerks.length > 0 ? (
                <View style={styles.listContainer}>
                  {stats.commonPerks.map((perk, index) => (
                    <View key={index} style={styles.listItem}>
                      <Text style={styles.listItemName}>{perk.name}</Text>
                      <Text style={styles.listItemValue}>
                        {perk.count} ({perk.percentage.toFixed(0)}%)
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>
                  No {label('trait.plural', 'lower')} found
                </Text>
              )}
            </CollapsibleSection>

            {/* Common Distinctions */}
            <CollapsibleSection
              title={`Common ${label('quality.plural')}`}
              defaultCollapsed={true}
            >
              {stats.commonDistinctions.length > 0 ? (
                <View style={styles.listContainer}>
                  {stats.commonDistinctions.map((distinction, index) => (
                    <View key={index} style={styles.listItem}>
                      <Text style={styles.listItemName}>
                        {distinction.name}
                      </Text>
                      <Text style={styles.listItemValue}>
                        {distinction.count} ({distinction.percentage.toFixed(0)}
                        %)
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>
                  No {label('quality.plural', 'lower')} found
                </Text>
              )}
            </CollapsibleSection>

            {/* Species Distribution */}
            <CollapsibleSection
              title={`${label('archetype.plural')} Distribution`}
              defaultCollapsed={true}
            >
              {Object.keys(stats.speciesDistribution).length > 0 ? (
                <View style={styles.listContainer}>
                  {Object.entries(stats.speciesDistribution)
                    .sort((a, b) => b[1] - a[1])
                    .map(([species, count]) => (
                      <View key={species} style={styles.listItem}>
                        <Text style={styles.listItemName}>{species}</Text>
                        <Text style={styles.listItemValue}>{count}</Text>
                      </View>
                    ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>
                  No {label('archetype.singular', 'lower')} data available
                </Text>
              )}
            </CollapsibleSection>

            {/* Relationships */}
            {(stats.alliedFactions.length > 0 ||
              stats.enemyFactions.length > 0) && (
              <CollapsibleSection
                title="Relationships"
                defaultCollapsed={false}
              >
                {stats.alliedFactions.length > 0 && (
                  <View style={styles.relationshipSection}>
                    <Text style={styles.relationshipLabel}>Allied With:</Text>
                    <View style={styles.relationshipList}>
                      {stats.alliedFactions.map(faction => (
                        <TouchableOpacity
                          key={faction}
                          style={styles.relationshipBadge}
                          onPress={() =>
                            navigation.navigate('FactionDetails', {
                              factionName: faction,
                            })
                          }
                        >
                          <Text style={styles.relationshipBadgeText}>
                            {faction}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {stats.enemyFactions.length > 0 && (
                  <View style={styles.relationshipSection}>
                    <Text style={styles.relationshipLabel}>Enemies:</Text>
                    <View style={styles.relationshipList}>
                      {stats.enemyFactions.map(faction => (
                        <TouchableOpacity
                          key={faction}
                          style={[
                            styles.relationshipBadge,
                            styles.relationshipBadgeEnemy,
                          ]}
                          onPress={() =>
                            navigation.navigate('FactionDetails', {
                              factionName: faction,
                            })
                          }
                        >
                          <Text style={styles.relationshipBadgeText}>
                            {faction}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </CollapsibleSection>
            )}

            {/* Combined Analysis */}
            {combinedAnalysis &&
              combinedAnalysis.factionName === stats.factionName &&
              combinedAnalysis.alliedFactions.length > 0 && (
                <View style={styles.sectionWithInfo}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                      Combined Force Analysis
                    </Text>
                    <InfoButton
                      title="Combined Force Analysis"
                      content={`This analysis shows the total military strength when a faction and its allies work together. 'Direct Members' are the faction's own members. 'Allied Members' are members from allied factions. 'Total Combined' is the sum of all members. 'Strength Multiplier' shows how much stronger the faction is with allies compared to fighting alone. The ${label(
                        'trait.singular',
                        'lower'
                      )} ${label(
                        'traitCategory.singular',
                        'lower'
                      )} bars below show the combined capabilities of all allied forces.`}
                    />
                  </View>
                  <View style={styles.combinedAnalysisCard}>
                    <View style={styles.combinedStatRow}>
                      <Text style={styles.combinedStatLabel}>
                        Direct Members:
                      </Text>
                      <Text style={styles.combinedStatValue}>
                        {combinedAnalysis.directMembers}
                      </Text>
                    </View>
                    <View style={styles.combinedStatRow}>
                      <Text style={styles.combinedStatLabel}>
                        Allied Members:
                      </Text>
                      <Text style={styles.combinedStatValue}>
                        {combinedAnalysis.combinedMembers -
                          combinedAnalysis.directMembers}
                      </Text>
                    </View>
                    <View style={styles.combinedStatRow}>
                      <Text style={styles.combinedStatLabel}>
                        Total Combined:
                      </Text>
                      <Text
                        style={[
                          styles.combinedStatValue,
                          styles.combinedStatValueHighlight,
                        ]}
                      >
                        {combinedAnalysis.combinedMembers}
                      </Text>
                    </View>
                    <View style={styles.combinedStatRow}>
                      <Text style={styles.combinedStatLabel}>
                        Strength Multiplier:
                      </Text>
                      <Text
                        style={[
                          styles.combinedStatValue,
                          styles.combinedStatValueHighlight,
                        ]}
                      >
                        {combinedAnalysis.strengthMultiplier.toFixed(2)}x
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.combinedAnalysisNote}>
                    Combined perk tags with allies show total capability when
                    working together
                  </Text>

                  <View style={styles.perkTagsContainer}>
                    {Object.entries(combinedAnalysis.combinedPerkTags)
                      .filter(([, count]) => count > 0)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 8)
                      .map(([tag, count], index, array) => {
                        // Use the highest count from the sorted array, or default to 1
                        const maxCount = array.length > 0 ? array[0][1] : 1;
                        return renderPerkTagBar(
                          tag as PerkTag,
                          count,
                          maxCount
                        );
                      })}
                  </View>
                </View>
              )}

            {/* Navigate to Faction Details */}
            <TouchableOpacity
              style={styles.detailsButton}
              onPress={() =>
                navigation.navigate('FactionDetails', {
                  factionName: stats.factionName,
                })
              }
            >
              <Text style={styles.detailsButtonText}>
                View Faction Details →
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading faction statistics...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
      >
        <Text style={styles.header}>Faction Statistics</Text>

        {factionStats.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateText}>
              No faction data available. Create some factions and add members to
              see statistics.
            </Text>
          </View>
        ) : (
          <View style={styles.factionsContainer}>
            {factionStats.map(stats => renderFactionCard(stats))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.primary,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    ...commonStyles.text.h1,
    marginBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    ...commonStyles.text.body,
    color: themeColors.text.secondary,
  },
  emptyStateContainer: {
    ...commonStyles.card.elevated,
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    ...commonStyles.text.body,
    color: themeColors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  factionsContainer: {
    gap: 16,
  },
  factionCard: {
    ...commonStyles.card.elevated,
    overflow: 'hidden',
  },
  factionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  factionName: {
    ...commonStyles.text.h2,
    flex: 1,
  },
  factionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberBadge: {
    backgroundColor: themeColors.accent.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  memberBadgeText: {
    color: themeColors.text.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  expandIcon: {
    fontSize: 16,
    color: themeColors.text.secondary,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  quickStatItem: {
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: themeColors.text.primary,
    marginBottom: 4,
  },
  quickStatLabel: {
    fontSize: 11,
    color: themeColors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  expandedContent: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
    gap: 16,
  },
  perkTagsContainer: {
    gap: 8,
  },
  perkTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  perkTagLabel: {
    width: 80,
    fontSize: 13,
    fontWeight: '600',
    color: themeColors.text.primary,
  },
  perkTagBarContainer: {
    flex: 1,
    height: 28,
    backgroundColor: themeColors.elevated,
    borderRadius: 6,
    overflow: 'hidden',
  },
  perkTagBar: {
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  perkTagCount: {
    fontSize: 12,
    fontWeight: '700',
    color: themeColors.text.primary,
  },
  listContainer: {
    gap: 8,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: themeColors.elevated,
    borderRadius: 8,
  },
  listItemName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: themeColors.text.primary,
  },
  listItemValue: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.text.secondary,
    marginLeft: 12,
  },
  emptyText: {
    fontSize: 14,
    color: themeColors.text.muted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  relationshipSection: {
    marginBottom: 12,
  },
  relationshipLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.text.primary,
    marginBottom: 8,
  },
  relationshipList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  relationshipBadge: {
    backgroundColor: themeColors.accent.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  relationshipBadgeEnemy: {
    backgroundColor: themeColors.accent.danger,
  },
  relationshipBadgeText: {
    color: themeColors.text.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  combinedAnalysisCard: {
    backgroundColor: themeColors.elevated,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 12,
  },
  combinedStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  combinedStatLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: themeColors.text.secondary,
  },
  combinedStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.text.primary,
  },
  combinedStatValueHighlight: {
    fontSize: 18,
    fontWeight: '700',
    color: themeColors.accent.primary,
  },
  combinedAnalysisNote: {
    fontSize: 12,
    color: themeColors.text.muted,
    fontStyle: 'italic',
    marginBottom: 12,
    textAlign: 'center',
  },
  detailsButton: {
    backgroundColor: themeColors.accent.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  detailsButtonText: {
    color: themeColors.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  sectionWithInfo: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    ...commonStyles.text.h2,
  },
});
