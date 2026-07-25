import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/navigation/types';
import {
  loadEvents,
  loadCharacters,
  loadLocations,
  loadQuests,
  deleteEvent,
} from '@utils/characterStorage';
import { GameEvent, QuestStatus } from '@models/types';
import { colors as themeColors } from '@/styles/theme';
import { BaseDetailScreen, Section, CollapsibleSection } from '@/components';
import Markdown from 'react-native-markdown-display';
import { formatEventDate } from '@utils/dateUtils';

const QUEST_STATUS_LABELS: Record<QuestStatus, string> = {
  [QuestStatus.NotStarted]: 'Not Started',
  [QuestStatus.Assigned]: 'Assigned',
  [QuestStatus.InProgress]: 'In Progress',
  [QuestStatus.Successful]: 'Successful',
  [QuestStatus.Failure]: 'Failure',
};

type EventsDetailNavigationProp = StackNavigationProp<
  RootStackParamList,
  'EventsDetail'
>;

type EventsDetailRouteProp = RouteProp<RootStackParamList, 'EventsDetail'>;

interface EventQuestInfo {
  id: string;
  name: string;
  status: QuestStatus;
}

interface EventWithDetails extends GameEvent {
  locationName?: string;
  characterNames: string[];
  quests: EventQuestInfo[];
}

export const EventsDetailScreen: React.FC = () => {
  const navigation = useNavigation<EventsDetailNavigationProp>();
  const route = useRoute<EventsDetailRouteProp>();
  const { eventId } = route.params;

  const [event, setEvent] = useState<EventWithDetails | null>(null);

  const loadEventDetails = useCallback(async () => {
    const [events, characters, locations, quests] = await Promise.all([
      loadEvents(),
      loadCharacters(),
      loadLocations(),
      loadQuests(),
    ]);

    const foundEvent = events.find(e => e.id === eventId);
    if (!foundEvent) {
      Alert.alert('Error', 'Event not found', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      return;
    }

    // Create lookup maps
    const locationMap = new Map(locations.map(l => [l.id, l.name]));
    const characterMap = new Map(characters.map(c => [c.id, c.name]));
    const questMap = new Map(quests.map(q => [q.id, q]));

    const eventWithDetails: EventWithDetails = {
      ...foundEvent,
      locationName: foundEvent.locationId
        ? locationMap.get(foundEvent.locationId)
        : undefined,
      characterNames:
        foundEvent.characterIds?.map(id => characterMap.get(id) || 'Unknown') ||
        [],
      quests:
        foundEvent.questIds
          ?.map(id => questMap.get(id))
          .filter((quest): quest is NonNullable<typeof quest> => Boolean(quest))
          .map(quest => ({
            id: quest.id,
            name: quest.name,
            status: quest.status,
          })) || [],
    };

    setEvent(eventWithDetails);
  }, [eventId, navigation]);

  useFocusEffect(
    useCallback(() => {
      loadEventDetails();
    }, [loadEventDetails])
  );

  if (!event) {
    return (
      <BaseDetailScreen>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading event...</Text>
        </View>
      </BaseDetailScreen>
    );
  }

  return (
    <BaseDetailScreen
      onEditPress={() => navigation.navigate('EventsForm', { event })}
      deleteConfig={{
        itemName: event.title,
        onDelete: async () => {
          await deleteEvent(eventId);
        },
      }}
    >
      {/* Event Images */}
      {event.imageUris && event.imageUris.length > 0 && (
        <View style={styles.imageGallery}>
          {event.imageUris.map((uri, index) => (
            <View key={index} style={styles.imageContainer}>
              <Image source={{ uri }} style={styles.eventImage} />
            </View>
          ))}
        </View>
      )}
      {/* Overview Section - Combines title, date, certainty, and location */}
      <Section title="Overview">
        <View style={styles.overviewContainer}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <View style={styles.overviewRow}>
            <Text style={styles.overviewLabel}>Date:</Text>
            <Text style={[styles.bodyText, styles.overviewValue]}>
              {formatEventDate(event.date, event.time)}
            </Text>
          </View>
          <View style={styles.overviewRow}>
            <Text style={styles.overviewLabel}>Certainty:</Text>
            <View style={styles.certaintyBadge}>
              <Text
                style={[
                  styles.certaintyText,
                  event.certaintyLevel === 'unconfirmed' &&
                    styles.certaintyUnconfirmed,
                  event.certaintyLevel === 'disputed' &&
                    styles.certaintyDisputed,
                  (!event.certaintyLevel ||
                    event.certaintyLevel === 'confirmed') &&
                    styles.certaintyConfirmed,
                ]}
              >
                {event.certaintyLevel
                  ? event.certaintyLevel.charAt(0).toUpperCase() +
                    event.certaintyLevel.slice(1)
                  : 'Confirmed'}
              </Text>
            </View>
          </View>
          {event.locationName && (
            <View style={styles.overviewRow}>
              <Text style={styles.overviewLabel}>Location:</Text>
              <Text style={[styles.bodyText, styles.overviewValue]}>
                {event.locationName}
              </Text>
            </View>
          )}
        </View>
      </Section>

      {/* Description */}
      {event.description && (
        <Section title="Description">
          <Text style={styles.bodyText}>{event.description}</Text>
        </Section>
      )}

      {/* Characters - Using CollapsibleSection */}
      {event.characterNames.length > 0 && (
        <CollapsibleSection title="Characters Involved">
          <View style={styles.list}>
            {event.characterNames.map((name, index) => (
              <View key={index} style={styles.listItem}>
                <Text style={styles.listBullet}>•</Text>
                <Text style={styles.listText}>{name}</Text>
              </View>
            ))}
          </View>
        </CollapsibleSection>
      )}

      {/* Factions - Using CollapsibleSection */}
      {event.factionNames && event.factionNames.length > 0 && (
        <CollapsibleSection title="Factions Involved">
          <View style={styles.list}>
            {event.factionNames.map((name, index) => (
              <View key={index} style={styles.listItem}>
                <Text style={styles.listBullet}>•</Text>
                <Text style={styles.listText}>{name}</Text>
              </View>
            ))}
          </View>
        </CollapsibleSection>
      )}

      {/* Quests - Using CollapsibleSection */}
      {event.quests.length > 0 && (
        <CollapsibleSection title="Quests">
          <View style={styles.list}>
            {event.quests.map(quest => (
              <TouchableOpacity
                key={quest.id}
                style={styles.questRow}
                onPress={() =>
                  navigation.navigate('QuestsDetail', { questId: quest.id })
                }
              >
                <Text style={styles.listText}>{quest.name}</Text>
                <Text style={styles.questStatus}>
                  {QUEST_STATUS_LABELS[quest.status]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </CollapsibleSection>
      )}

      {/* Notes - With Markdown support */}
      {event.notes && (
        <Section title="Notes">
          <Markdown style={markdownStyles}>{event.notes}</Markdown>
        </Section>
      )}

      {/* Metadata */}
      <View style={styles.metadata}>
        <Text style={styles.metadataText}>
          Created: {new Date(event.createdAt).toLocaleDateString()}
        </Text>
        {event.updatedAt !== event.createdAt && (
          <Text style={styles.metadataText}>
            Updated: {new Date(event.updatedAt).toLocaleDateString()}
          </Text>
        )}
      </View>

      <View style={styles.footer} />
    </BaseDetailScreen>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: themeColors.text.secondary,
  },
  imageGallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 16,
  },
  imageContainer: {
    width: 280,
    height: 250,
  },
  eventImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: themeColors.elevated,
  },
  bodyText: {
    fontSize: 16,
    color: themeColors.text.secondary,
    lineHeight: 24,
  },
  list: {
    gap: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  listBullet: {
    fontSize: 16,
    color: themeColors.text.secondary,
    marginRight: 8,
    lineHeight: 24,
  },
  listText: {
    fontSize: 16,
    color: themeColors.text.secondary,
    flex: 1,
    lineHeight: 24,
  },
  metadata: {
    padding: 16,
    gap: 4,
  },
  metadataText: {
    fontSize: 12,
    color: themeColors.text.muted,
  },
  footer: {
    height: 50,
  },
  certaintyBadge: {
    alignSelf: 'flex-start',
  },
  certaintyText: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  certaintyConfirmed: {
    backgroundColor: themeColors.certainty.confirmed,
    color: themeColors.text.primary,
  },
  certaintyUnconfirmed: {
    backgroundColor: themeColors.certainty.unconfirmed,
    color: themeColors.text.primary,
  },
  certaintyDisputed: {
    backgroundColor: themeColors.certainty.disputed,
    color: themeColors.text.primary,
  },
  overviewContainer: {
    gap: 12,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: themeColors.text.primary,
    marginBottom: 8,
  },
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  overviewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.text.secondary,
    minWidth: 80,
    flexShrink: 0,
  },
  overviewValue: {
    flex: 1,
    flexWrap: 'wrap',
  },
  questRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  questStatus: {
    fontSize: 14,
    color: themeColors.text.muted,
  },
});

// Markdown styles for notes section
const markdownStyles = {
  body: {
    color: themeColors.text.secondary,
    fontSize: 16,
    lineHeight: 24,
  },
  heading1: {
    color: themeColors.text.primary,
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  heading2: {
    color: themeColors.text.primary,
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 6,
  },
  heading3: {
    color: themeColors.text.primary,
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  paragraph: {
    color: themeColors.text.secondary,
    marginBottom: 10,
    lineHeight: 24,
  },
  strong: {
    fontWeight: '700' as const,
    color: themeColors.text.primary,
  },
  em: {
    fontStyle: 'italic' as const,
  },
  link: {
    color: themeColors.accent.primary,
  },
  list_item: {
    color: themeColors.text.secondary,
  },
  bullet_list: {
    marginBottom: 10,
  },
  ordered_list: {
    marginBottom: 10,
  },
  code_inline: {
    backgroundColor: themeColors.elevated,
    color: themeColors.accent.info,
    fontFamily: 'monospace' as const,
    padding: 2,
    borderRadius: 4,
  },
  code_block: {
    backgroundColor: themeColors.elevated,
    color: themeColors.text.secondary,
    fontFamily: 'monospace' as const,
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  fence: {
    backgroundColor: themeColors.elevated,
    color: themeColors.text.secondary,
    fontFamily: 'monospace' as const,
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  blockquote: {
    backgroundColor: themeColors.elevated,
    borderLeftWidth: 4,
    borderLeftColor: themeColors.accent.primary,
    paddingLeft: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
};
