import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Text,
} from 'react-native';
import { GameCharacter } from '@models/types';
import {
  loadCharacters,
  toggleCharacterPresent,
  resetAllPresentStatus,
  migrateImageUris,
} from '@utils/characterStorage';
import {
  useNavigation,
  useFocusEffect,
  CompositeNavigationProp,
} from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { RootStackParamList, RootDrawerParamList } from '@/navigation/types';
import { commonStyles } from '@/styles/commonStyles';
import {
  BaseListScreen,
  HeaderAddButton,
  HeaderStatsButton,
} from '@/components';

type NavigationProp = CompositeNavigationProp<
  DrawerNavigationProp<RootDrawerParamList, 'CharacterList'>,
  StackNavigationProp<RootStackParamList>
>;

export const CharacterListScreen: React.FC = () => {
  const [characters, setCharacters] = React.useState<GameCharacter[]>([]);
  const [showOnlyPresent, setShowOnlyPresent] = React.useState<boolean>(false);
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const navigation = useNavigation<NavigationProp>();

  const loadData = React.useCallback(async () => {
    // Run migration on first load (idempotent operation)
    await migrateImageUris();

    const data = await loadCharacters();
    setCharacters(data);
  }, []);

  // Reload characters whenever the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleTogglePresent = useCallback(
    async (id: string) => {
      await toggleCharacterPresent(id);
      await loadData();
    },
    [loadData]
  );

  const handleResetAllPresent = useCallback(async () => {
    const confirmReset = () => {
      if (Platform.OS === 'web') {
        return window.confirm(
          'Are you sure you want to reset present status for all characters?'
        );
      } else {
        return new Promise<boolean>(resolve => {
          Alert.alert(
            'Reset Present Status',
            'Are you sure you want to reset present status for all characters?',
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => resolve(false),
              },
              {
                text: 'Reset All',
                onPress: () => resolve(true),
              },
            ]
          );
        });
      }
    };

    const shouldReset = await confirmReset();
    if (shouldReset) {
      await resetAllPresentStatus();
      await loadData();
    }
  }, [loadData]);

  const handleSearchPress = useCallback(() => {
    navigation.navigate('CharacterSearch');
  }, [navigation]);

  const getFilteredCharacters = React.useCallback(() => {
    // First filter out retired characters
    let filtered = characters.filter(c => !c.retired);

    // Filter by search query if provided
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(c => c.name.toLowerCase().includes(query));
    }

    // Filter by present status if enabled
    if (showOnlyPresent) {
      filtered = filtered.filter(c => c.present === true);
    }

    // Sort alphabetically
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [characters, searchQuery, showOnlyPresent]);

  const filteredCharacters = React.useMemo(
    () => getFilteredCharacters(),
    [getFilteredCharacters]
  );

  const renderItem = (item: GameCharacter) => (
    <TouchableOpacity
      style={[styles.card, item.present && styles.cardPresent]}
      onPress={() =>
        navigation.navigate('CharacterDetail', { character: item })
      }
    >
      <View style={styles.cardHeader}>
        <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
          {item.name}
        </Text>
        <TouchableOpacity
          style={[
            styles.presentButton,
            item.present && styles.presentButtonActive,
          ]}
          onPress={() => handleTogglePresent(item.id)}
        >
          <Text
            style={[
              styles.presentText,
              item.present && styles.presentTextActive,
            ]}
          >
            {item.present ? 'Present' : 'Absent'}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.factions}>
        {(item.factions || []).map(f => f.name).join(', ') || 'No factions'}
      </Text>
    </TouchableOpacity>
  );

  const renderHeaderButtons = () => (
    <View style={styles.headerButtons}>
      <TouchableOpacity
        style={[
          styles.actionButton,
          showOnlyPresent ? styles.filterButtonActive : styles.filterButton,
        ]}
        onPress={() => setShowOnlyPresent(!showOnlyPresent)}
      >
        <Text style={styles.buttonText}>
          {showOnlyPresent ? 'Show All' : 'Present Only'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionButton, styles.resetButton]}
        onPress={handleResetAllPresent}
      >
        <Text style={styles.buttonText}>Reset Present</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeaderRight = () => (
    <View style={styles.headerRight}>
      <TouchableOpacity
        style={styles.headerSearchButton}
        onPress={handleSearchPress}
      >
        <Text style={styles.headerSearchButtonText}>🔍</Text>
      </TouchableOpacity>
      <HeaderStatsButton
        onPress={() => navigation.navigate('CharacterStats')}
      />
      <HeaderAddButton
        onPress={() => navigation.navigate('CharacterForm', {})}
      />
    </View>
  );

  return (
    <BaseListScreen
      data={filteredCharacters}
      renderItem={renderItem}
      keyExtractor={item => item.id}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search characters by name..."
      ListHeaderComponent={renderHeaderButtons()}
      headerRight={renderHeaderRight()}
      emptyStateTitle="No characters found"
      emptyStateSubtitle="Create a character to get started"
      contentContainerStyle={styles.listContentContainer}
    />
  );
};

const styles = StyleSheet.create({
  listContentContainer: {
    paddingBottom: 100,
  },
  headerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    ...commonStyles.button.base,
    flex: 1,
    marginHorizontal: 4,
  },
  filterButton: commonStyles.button.outline,
  filterButtonActive: commonStyles.button.outlineActive,
  resetButton: commonStyles.button.warning,
  buttonText: commonStyles.button.text,
  card: commonStyles.card.base,
  cardPresent: commonStyles.card.present,
  cardHeader: commonStyles.card.header,
  name: {
    ...commonStyles.text.h3,
    flex: 1,
  },
  factions: {
    ...commonStyles.text.caption,
    marginTop: 8,
    fontStyle: 'italic',
  },
  presentButton: {
    ...commonStyles.badge.base,
    ...commonStyles.badge.absent,
    minWidth: 70,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  presentButtonActive: commonStyles.badge.present,
  presentText: commonStyles.badge.textMuted,
  presentTextActive: commonStyles.badge.text,
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  headerSearchButton: {
    ...commonStyles.headerButton.add,
    marginRight: 4,
  },
  headerSearchButtonText: {
    ...commonStyles.headerButton.addText,
    fontSize: 20,
  },
});
