import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Text,
  Image,
} from 'react-native';
import { GameCharacter, GameLocation } from '@models/types';
import {
  loadCharacters,
  getLocation,
  deleteLocationCompletely,
} from '@utils/characterStorage';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
  RouteProp,
} from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/navigation/types';
import { colors as themeColors } from '@/styles/theme';
import { commonStyles } from '@/styles/commonStyles';
import { BaseDetailScreen, Section, CollapsibleSection } from '@/components';

type LocationDetailsRouteProp = RouteProp<
  RootStackParamList,
  'LocationDetails'
>;
type LocationDetailsNavigationProp = StackNavigationProp<RootStackParamList>;

export const LocationDetailsScreen: React.FC = () => {
  const route = useRoute<LocationDetailsRouteProp>();
  const navigation = useNavigation<LocationDetailsNavigationProp>();
  const { locationId } = route.params || {};

  const [location, setLocation] = useState<GameLocation | null>(null);
  const [characters, setCharacters] = useState<GameCharacter[]>([]);

  // Guard against missing locationId param
  React.useEffect(() => {
    if (!locationId) {
      Alert.alert('Error', 'Location ID is missing. Please try again.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  }, [locationId, navigation]);

  const loadData = useCallback(async () => {
    if (!locationId) return;

    const locationData = await getLocation(locationId);
    if (!locationData) {
      Alert.alert('Error', 'Location not found', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
      return;
    }

    setLocation(locationData);

    const allCharacters = await loadCharacters();
    const locationCharacters = allCharacters.filter(
      c => c.locationId === locationId
    );
    setCharacters(
      locationCharacters.sort((a, b) => a.name.localeCompare(b.name))
    );
  }, [locationId, navigation]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const getStats = () => {
    const totalCharacters = characters.length;
    const presentCharacters = characters.filter(c => c.present === true).length;
    const absentCharacters = totalCharacters - presentCharacters;

    return { totalCharacters, presentCharacters, absentCharacters };
  };

  const renderCharacter = (character: GameCharacter) => (
    <TouchableOpacity
      key={character.id}
      style={[
        styles.characterCard,
        character.present && styles.characterCardPresent,
      ]}
      onPress={() => navigation.navigate('CharacterDetail', { character })}
    >
      <View style={styles.characterInfo}>
        <Text style={styles.characterName}>{character.name}</Text>
        <Text style={styles.characterSpecies}>{character.species}</Text>
      </View>
      <View
        style={[
          styles.presentBadge,
          character.present && styles.presentBadgeActive,
        ]}
      >
        <Text
          style={[
            styles.presentBadgeText,
            character.present && styles.presentBadgeTextActive,
          ]}
        >
          {character.present ? 'Present' : 'Absent'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (!location) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const stats = getStats();

  return (
    <BaseDetailScreen
      onEditPress={() =>
        navigation.navigate('LocationForm', {
          location: location || undefined,
        })
      }
      deleteConfig={{
        itemName: `"${location.name}"`,
        onDelete: async () => {
          const result = await deleteLocationCompletely(locationId);
          if (result.success && result.charactersUpdated > 0) {
            Alert.alert(
              'Success',
              `Location "${location.name}" deleted successfully. Removed from ${result.charactersUpdated} character(s).`
            );
          } else if (!result.success) {
            throw new Error('Failed to delete location');
          }
        },
        confirmMessage: `Are you sure you want to delete "${location.name}"? This will remove it from all characters and cannot be undone.`,
      }}
    >
      {/* Location Header */}
      <View style={styles.locationHeader}>
        <Text style={styles.locationName}>{location.name}</Text>

        {/* Location Images */}
        {location.imageUris && location.imageUris.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.imageGallery}
            contentContainerStyle={styles.imageGalleryContent}
          >
            {location.imageUris.map((uri, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image
                  source={{ uri }}
                  style={styles.locationImage}
                  resizeMode="cover"
                />
              </View>
            ))}
          </ScrollView>
        )}

        {/* Description Section */}
        {location.description && (
          <View style={styles.descriptionSection}>
            <Text style={styles.descriptionLabel}>Description</Text>
            <View style={styles.descriptionDisplay}>
              <Text style={styles.descriptionText}>{location.description}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Location Statistics */}
      <Section title="Statistics">
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalCharacters}</Text>
            <Text style={styles.statLabel}>Total Characters</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.presentCharacters}</Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.absentCharacters}</Text>
            <Text style={styles.statLabel}>Absent</Text>
          </View>
        </View>
      </Section>

      {/* Characters Section */}
      <CollapsibleSection
        title={`Characters at this Location (${characters.length})`}
        defaultCollapsed={true}
      >
        {characters.length > 0 ? (
          <View style={styles.charactersList}>
            {characters.map(renderCharacter)}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No characters at this location</Text>
            <Text style={styles.emptySubText}>
              Assign characters to this location from their detail screens
            </Text>
          </View>
        )}
      </CollapsibleSection>
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
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    ...commonStyles.card.base,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: themeColors.text.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: themeColors.text.muted,
    textAlign: 'center',
  },
  charactersList: {
    gap: 12,
  },
  characterCard: {
    ...commonStyles.card.base,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  characterCardPresent: {
    borderLeftWidth: 4,
    borderLeftColor: themeColors.status.present,
  },
  characterInfo: {
    flex: 1,
  },
  characterName: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.text.primary,
    marginBottom: 4,
  },
  characterSpecies: {
    fontSize: 14,
    color: themeColors.text.secondary,
  },
  presentBadge: {
    ...commonStyles.badge.base,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  presentBadgeActive: {
    backgroundColor: themeColors.status.present,
    borderColor: themeColors.status.present,
  },
  presentBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: themeColors.text.muted,
    letterSpacing: 0.3,
  },
  presentBadgeTextActive: {
    color: themeColors.text.primary,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    ...commonStyles.text.h3,
    color: themeColors.text.muted,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubText: {
    ...commonStyles.text.body,
    color: themeColors.text.muted,
    textAlign: 'center',
  },

  // Location Header Styles
  locationHeader: {
    ...commonStyles.card.base,
    padding: 20,
    marginBottom: 24,
  },
  locationName: {
    ...commonStyles.text.h1,
    textAlign: 'center',
    marginBottom: 16,
  },
  imageGallery: {
    marginBottom: 16,
  },
  imageGalleryContent: {
    gap: 12,
  },
  imageContainer: {
    width: 250,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
  },
  locationImage: {
    width: '100%',
    height: '100%',
    backgroundColor: themeColors.surface,
  },

  // Description Styles
  descriptionSection: {
    marginTop: 8,
  },
  descriptionLabel: {
    ...commonStyles.text.label,
    marginBottom: 12,
  },
  descriptionDisplay: {
    backgroundColor: themeColors.elevated,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  descriptionText: {
    fontSize: 14,
    color: themeColors.text.primary,
    lineHeight: 20,
  },
});
