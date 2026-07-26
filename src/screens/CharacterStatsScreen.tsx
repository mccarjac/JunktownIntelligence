import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { useFocusEffect } from '@react-navigation/native';
import { loadCharacters } from '../utils/characterStorage';
import {
  calculateCharacterStats,
  CharacterStats,
} from '../utils/characterStats';
import { GameCharacter } from '@/models/types';
import { colors as themeColors } from '@/styles/theme';
import { commonStyles } from '@/styles/commonStyles';
import { useLabels, useRuleset } from '@/ruleset';

export const CharacterStatsScreen = () => {
  const label = useLabels();
  const { ruleset } = useRuleset();
  const [stats, setStats] = useState<CharacterStats | null>(null);
  const [selectedSlice, setSelectedSlice] = useState<string | null>(null);
  const [showOnlyPresent, setShowOnlyPresent] = useState<boolean>(false);
  const [allCharacters, setAllCharacters] = useState<GameCharacter[]>([]);

  const calculateStats = useCallback(
    (characters: GameCharacter[]): CharacterStats => {
      return calculateCharacterStats(characters, ruleset);
    },
    [ruleset]
  );

  // Calculate stats whenever characters or filter changes
  React.useEffect(() => {
    if (allCharacters.length > 0) {
      // Filter out retired characters and optionally filter to only present
      const filteredCharacters = allCharacters.filter(
        c => !c.retired && (!showOnlyPresent || c.present === true)
      );

      const newStats =
        filteredCharacters.length === 0
          ? null
          : calculateStats(filteredCharacters);
      setStats(newStats);
    }
  }, [showOnlyPresent, allCharacters, calculateStats]);

  const loadStats = useCallback(async () => {
    const characters = await loadCharacters();
    setAllCharacters(characters);

    if (!characters.length) {
      setStats(null);
      return;
    }

    // Filter out retired characters and optionally filter to only present
    const filteredCharacters = characters.filter(
      c => !c.retired && (!showOnlyPresent || c.present === true)
    );

    if (filteredCharacters.length === 0) {
      setStats(null);
    } else {
      const stats = calculateStats(filteredCharacters);
      setStats(stats);
    }
  }, [showOnlyPresent, calculateStats]);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const getSpeciesPieChartData = () => {
    if (!stats) return [];

    // More distinct and readable colors
    const colors = [
      '#E74C3C', // Red
      '#3498DB', // Blue
      '#F39C12', // Orange
      '#2ECC71', // Green
      '#9B59B6', // Purple
      '#1ABC9C', // Teal
      '#E67E22', // Dark Orange
      '#34495E', // Dark Blue-Gray
      '#F1C40F', // Yellow
      '#95A5A6', // Gray
      '#E91E63', // Pink
      '#00BCD4', // Cyan
      '#FF9800', // Amber
      '#4CAF50', // Light Green
      '#673AB7', // Deep Purple
    ];

    return Object.entries(stats.speciesDistribution).map(
      ([species, count], index) => ({
        value: count,
        color: colors[index % colors.length],
        text: `${count}`, // Show count on slice
        label: species,
        onPress: () => handleSlicePress(species, count),
      })
    );
  };

  const handleSlicePress = (species: string, _count: number) => {
    setSelectedSlice(selectedSlice === species ? null : species);

    // Show a temporary alert or tooltip-like behavior
    if (selectedSlice !== species) {
      setTimeout(() => {
        setSelectedSlice(null);
      }, 3000); // Auto-hide after 3 seconds
    }
  };

  const getSpeciesColors = () => {
    if (!stats) return {};

    const colors = [
      '#E74C3C',
      '#3498DB',
      '#F39C12',
      '#2ECC71',
      '#9B59B6',
      '#1ABC9C',
      '#E67E22',
      '#34495E',
      '#F1C40F',
      '#95A5A6',
      '#E91E63',
      '#00BCD4',
      '#FF9800',
      '#4CAF50',
      '#673AB7',
    ];

    const colorMap: { [key: string]: string } = {};
    Object.keys(stats.speciesDistribution).forEach((species, index) => {
      colorMap[species] = colors[index % colors.length];
    });

    return colorMap;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
      >
        <Text style={styles.header}>Character Statistics</Text>

        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              showOnlyPresent && styles.filterButtonActive,
            ]}
            onPress={() => setShowOnlyPresent(!showOnlyPresent)}
          >
            <Text
              style={[
                styles.filterButtonText,
                showOnlyPresent && styles.filterButtonTextActive,
              ]}
            >
              {showOnlyPresent ? 'Present Only ✓' : 'Show Present Only'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.filterInfo}>
            {showOnlyPresent
              ? `Showing ${stats?.totalCharacters || 0} present characters`
              : `Showing all ${stats?.totalCharacters || 0} characters`}
          </Text>
        </View>

        {!stats ? (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>
              {showOnlyPresent
                ? 'No present characters found. Try toggling the filter to see all characters.'
                : 'No character data available'}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>General Stats</Text>
              <Text style={styles.listItemText}>
                Total Characters: {stats.totalCharacters}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionHeader}>
                {label('archetype.plural')} Distribution
              </Text>
              {getSpeciesPieChartData().length > 0 && (
                <View style={styles.chartContainer}>
                  <PieChart
                    data={getSpeciesPieChartData()}
                    donut
                    showText
                    textColor="white"
                    textSize={14}
                    fontWeight="bold"
                    radius={100}
                    innerRadius={40}
                    innerCircleColor={themeColors.surface}
                    strokeColor={themeColors.border}
                    strokeWidth={2}
                    sectionAutoFocus
                    focusOnPress
                    toggleFocusOnPress
                    centerLabelComponent={() => {
                      if (selectedSlice && stats) {
                        const count = stats.speciesDistribution[selectedSlice];
                        const percentage = (
                          (count / stats.totalCharacters) *
                          100
                        ).toFixed(1);
                        return (
                          <View style={styles.centerLabel}>
                            <Text style={styles.centerLabelSpecies}>
                              {selectedSlice}
                            </Text>
                            <Text style={styles.centerLabelNumber}>
                              {count}
                            </Text>
                            <Text style={styles.centerLabelText}>
                              {percentage}%
                            </Text>
                          </View>
                        );
                      }
                      return (
                        <View style={styles.centerLabel}>
                          <Text style={styles.centerLabelNumber}>
                            {stats?.totalCharacters}
                          </Text>
                          <Text style={styles.centerLabelText}>Characters</Text>
                        </View>
                      );
                    }}
                  />
                  {selectedSlice && (
                    <View style={styles.tooltip}>
                      <Text style={styles.tooltipText}>
                        Tap slice again or wait to return to overview
                      </Text>
                    </View>
                  )}
                </View>
              )}
              <View style={styles.speciesLegend}>
                {Object.entries(stats.speciesDistribution).map(
                  ([species, count]) => {
                    const colors = getSpeciesColors();
                    const percentage = (
                      (count / stats.totalCharacters) *
                      100
                    ).toFixed(1);
                    const isSelected = selectedSlice === species;
                    return (
                      <View
                        key={species}
                        style={[
                          styles.legendItem,
                          isSelected && styles.legendItemSelected,
                        ]}
                      >
                        <View
                          style={[
                            styles.legendColorBox,
                            { backgroundColor: colors[species] },
                            isSelected && styles.legendColorBoxSelected,
                          ]}
                        />
                        <Text
                          style={[
                            styles.legendText,
                            isSelected && styles.legendTextSelected,
                          ]}
                        >
                          {species}: {count} ({percentage}%)
                        </Text>
                      </View>
                    );
                  }
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionHeader}>
                Most Common {label('trait.plural')}
              </Text>
              {stats.commonPerks.map(({ name, count }) => (
                <Text key={name} style={styles.listItemText}>
                  {name}: {count} characters
                </Text>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionHeader}>
                Most Common {label('quality.plural')}
              </Text>
              {stats.commonDistinctions.map(({ name, count }) => (
                <Text key={name} style={styles.listItemText}>
                  {name}: {count} characters
                </Text>
              ))}
            </View>
          </>
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
    backgroundColor: themeColors.primary,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    ...commonStyles.text.h1,
    marginBottom: 24,
  },
  filterContainer: {
    marginBottom: 24,
    alignItems: 'center',
    backgroundColor: themeColors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  filterButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: themeColors.elevated,
    borderWidth: 1,
    borderColor: themeColors.border,
    marginBottom: 8,
    shadowColor: themeColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  filterButtonActive: {
    backgroundColor: themeColors.accent.success,
    borderColor: themeColors.accent.success,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.text.muted,
    letterSpacing: 0.3,
  },
  filterButtonTextActive: {
    color: themeColors.text.primary,
  },
  filterInfo: {
    fontSize: 12,
    color: themeColors.text.secondary,
    fontStyle: 'italic',
  },
  section: {
    ...commonStyles.card.elevated,
    marginBottom: 32,
  },
  sectionHeader: {
    ...commonStyles.text.h2,
    marginBottom: 16,
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  centerLabel: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerLabelNumber: {
    fontSize: 24,
    color: themeColors.text.primary,
    fontWeight: '700',
  },
  centerLabelText: {
    fontSize: 12,
    color: themeColors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  centerLabelSpecies: {
    fontSize: 16,
    color: themeColors.text.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  tooltip: {
    position: 'absolute',
    bottom: -30,
    backgroundColor: themeColors.elevated,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
    shadowColor: themeColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  tooltipText: {
    color: themeColors.text.primary,
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  speciesLegend: {
    marginTop: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: themeColors.elevated,
  },
  legendColorBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  legendText: {
    fontSize: 15,
    color: themeColors.text.primary,
    fontWeight: '500',
    flex: 1,
  },
  legendItemSelected: {
    backgroundColor: themeColors.accent.secondary,
    borderWidth: 1,
    borderColor: themeColors.accent.primary,
  },
  legendColorBoxSelected: {
    borderWidth: 2,
    borderColor: themeColors.accent.primary,
    transform: [{ scale: 1.1 }],
  },
  legendTextSelected: {
    fontWeight: '600',
    color: themeColors.text.primary,
  },
  listItemText: {
    fontSize: 15,
    color: themeColors.text.primary,
    marginVertical: 4,
    fontWeight: '500',
  },
  noDataContainer: {
    backgroundColor: themeColors.surface,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: themeColors.border,
    alignItems: 'center',
    marginVertical: 20,
  },
  noDataText: {
    fontSize: 16,
    color: themeColors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});
