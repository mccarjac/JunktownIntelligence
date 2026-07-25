/**
 * Pure computation for the quest <-> event narrative thread (see
 * `GameQuest.eventIds` / `GameEvent.questIds` in `@models/types`, kept in
 * sync by `characterStorage.ts`). Screens should call these rather than
 * re-deriving timeline order or participant rosters themselves.
 */
import { GameQuest, GameEvent, GameCharacter } from '@models/types';
import { parseDateString } from './dateUtils';

export interface QuestParticipant {
  characterId: string;
  name: string;
  /** True if the character is on `quest.assignedCharacterIds`. */
  assigned: boolean;
  /** Number of the quest's linked events this character appears in. */
  eventCount: number;
}

/** Parses `event.date` (YYYY-MM-DD), returning null for a missing or
 * malformed date rather than throwing -- callers sort those last. */
const parseEventDate = (event: GameEvent): Date | null => {
  if (!event.date) return null;
  try {
    return parseDateString(event.date);
  } catch {
    return null;
  }
};

/** Parses an optional `HH:MM` time string to minutes-since-midnight,
 * defaulting to 0 (start of day) when missing or malformed. */
const parseTimeMinutes = (time?: string): number => {
  const match = time ? /^(\d{1,2}):(\d{2})$/.exec(time) : null;
  if (!match) return 0;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return Number.isNaN(hours) || Number.isNaN(minutes)
    ? 0
    : hours * 60 + minutes;
};

/**
 * Resolves `quest.eventIds` against the event list and returns them sorted
 * ascending by date, then time. Dangling ids (pointing at a deleted event)
 * are dropped; events with a missing/unparseable date sort last.
 */
export const buildQuestTimeline = (
  quest: GameQuest,
  events: GameEvent[]
): GameEvent[] => {
  const eventMap = new Map(events.map(event => [event.id, event]));
  const linkedEvents = (quest.eventIds || [])
    .map(id => eventMap.get(id))
    .filter((event): event is GameEvent => Boolean(event));

  return [...linkedEvents].sort((a, b) => {
    const dateA = parseEventDate(a);
    const dateB = parseEventDate(b);

    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;

    const dateDiff = dateA.getTime() - dateB.getTime();
    if (dateDiff !== 0) return dateDiff;

    return parseTimeMinutes(a.time) - parseTimeMinutes(b.time);
  });
};

/**
 * Builds the quest's combined participant roster: the union of
 * `quest.assignedCharacterIds` and every character appearing in the quest's
 * linked events, sorted by name. Each entry is tagged so the UI can
 * distinguish "assigned to the quest", "appears in its events", or both.
 */
export const buildQuestParticipants = (
  quest: GameQuest,
  events: GameEvent[],
  characters: GameCharacter[]
): QuestParticipant[] => {
  const characterMap = new Map(characters.map(c => [c.id, c]));
  const linkedEvents = buildQuestTimeline(quest, events);

  const eventCounts = new Map<string, number>();
  linkedEvents.forEach(event => {
    event.characterIds?.forEach(id => {
      eventCounts.set(id, (eventCounts.get(id) || 0) + 1);
    });
  });

  const assignedIds = new Set(quest.assignedCharacterIds || []);
  const allIds = new Set<string>([...assignedIds, ...eventCounts.keys()]);

  const participants: QuestParticipant[] = Array.from(allIds).map(id => ({
    characterId: id,
    name: characterMap.get(id)?.name ?? 'Unknown',
    assigned: assignedIds.has(id),
    eventCount: eventCounts.get(id) ?? 0,
  }));

  return participants.sort((a, b) => a.name.localeCompare(b.name));
};
