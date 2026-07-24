import {
  addQuest,
  updateQuest,
  deleteQuest,
  addEvent,
  updateEvent,
  deleteEvent,
  reconcileQuestEventLinks,
} from '@/utils/characterStorage';
import { SafeAsyncStorageJSONParser } from '@/utils/safeAsyncStorageJSONParser';
import { GameEvent, GameQuest, QuestStatus } from '@/models/types';

jest.mock('@/utils/safeAsyncStorageJSONParser');

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234'),
}));

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

/**
 * Install a stateful in-memory backing store for SafeAsyncStorageJSONParser,
 * shared across both the `gameCharacterManager_quests` and
 * `gameCharacterManager_events` keys these sync helpers touch. Mirrors the
 * pattern in `characterStorage.concurrency.test.ts` / `quest.concurrency.test.ts`
 * (no artificial delay needed here since these tests aren't proving
 * interleaving, just end-to-end sync behavior).
 */
const installStatefulStore = (initial: Record<string, unknown>) => {
  const store: Record<string, unknown> = clone(initial);

  (SafeAsyncStorageJSONParser.getItem as jest.Mock).mockImplementation(
    async (key: string) => (key in store ? clone(store[key]) : null)
  );
  (SafeAsyncStorageJSONParser.setItem as jest.Mock).mockImplementation(
    async (key: string, value: unknown) => {
      store[key] = clone(value);
      return true;
    }
  );

  return store;
};

const TS = '2025-01-01T00:00:00.000Z';

const makeEvent = (overrides: Partial<GameEvent> = {}): GameEvent => ({
  id: 'event-a',
  title: 'Event A',
  date: '2025-01-01',
  createdAt: TS,
  updatedAt: TS,
  ...overrides,
});

const makeQuest = (overrides: Partial<GameQuest> = {}): GameQuest => ({
  id: 'quest-a',
  name: 'Quest A',
  status: QuestStatus.NotStarted,
  createdAt: TS,
  updatedAt: TS,
  ...overrides,
});

type EventStore = { events: GameEvent[] };
type QuestStore = { quests: GameQuest[] };

describe('quest <-> event link sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('addQuest with eventIds adds the new quest id onto the linked events', async () => {
    const eventA = makeEvent({ id: 'event-a' });
    const eventB = makeEvent({ id: 'event-b' });
    const store = installStatefulStore({
      gameCharacterManager_events: {
        events: [eventA, eventB],
        version: '1.0',
        lastUpdated: TS,
      },
      gameCharacterManager_quests: {
        quests: [],
        version: '1.0',
        lastUpdated: TS,
      },
    });

    const created = await addQuest({
      name: 'New Quest',
      status: QuestStatus.NotStarted,
      eventIds: ['event-a'],
    });

    const events = (store.gameCharacterManager_events as EventStore).events;
    expect(events.find(e => e.id === 'event-a')?.questIds).toEqual([
      created.id,
    ]);
    expect(events.find(e => e.id === 'event-b')?.questIds).toBeUndefined();
  });

  it('updateQuest syncs added/removed eventIds onto events, and leaves links alone when eventIds is omitted', async () => {
    const eventA = makeEvent({ id: 'event-a', questIds: ['quest-a'] });
    const eventB = makeEvent({ id: 'event-b' });
    const quest = makeQuest({ id: 'quest-a', eventIds: ['event-a'] });

    const store = installStatefulStore({
      gameCharacterManager_events: {
        events: [eventA, eventB],
        version: '1.0',
        lastUpdated: TS,
      },
      gameCharacterManager_quests: {
        quests: [quest],
        version: '1.0',
        lastUpdated: TS,
      },
    });

    // Swap the link from event-a to event-b.
    await updateQuest('quest-a', { eventIds: ['event-b'] });

    let events = (store.gameCharacterManager_events as EventStore).events;
    expect(events.find(e => e.id === 'event-a')?.questIds).toEqual([]);
    expect(events.find(e => e.id === 'event-b')?.questIds).toEqual(['quest-a']);

    // A partial update that doesn't mention eventIds must not touch the link.
    await updateQuest('quest-a', { name: 'Renamed' });

    events = (store.gameCharacterManager_events as EventStore).events;
    expect(events.find(e => e.id === 'event-b')?.questIds).toEqual(['quest-a']);
  });

  it('deleteQuest removes the quest id from every event, including drift', async () => {
    const eventA = makeEvent({ id: 'event-a', questIds: ['quest-a'] });
    // event-b carries the back-reference even though quest-a's own eventIds
    // never recorded it (drift) -- delete must still sweep it.
    const eventB = makeEvent({ id: 'event-b', questIds: ['quest-a'] });
    const quest = makeQuest({ id: 'quest-a', eventIds: ['event-a'] });

    const store = installStatefulStore({
      gameCharacterManager_events: {
        events: [eventA, eventB],
        version: '1.0',
        lastUpdated: TS,
      },
      gameCharacterManager_quests: {
        quests: [quest],
        version: '1.0',
        lastUpdated: TS,
      },
    });

    await deleteQuest('quest-a');

    const events = (store.gameCharacterManager_events as EventStore).events;
    expect(events.every(e => !e.questIds?.includes('quest-a'))).toBe(true);
  });

  it('addEvent with questIds adds the new event id onto the linked quests', async () => {
    const questA = makeQuest({ id: 'quest-a' });
    const questB = makeQuest({ id: 'quest-b' });
    const store = installStatefulStore({
      gameCharacterManager_quests: {
        quests: [questA, questB],
        version: '1.0',
        lastUpdated: TS,
      },
      gameCharacterManager_events: {
        events: [],
        version: '1.0',
        lastUpdated: TS,
      },
    });

    const created = await addEvent({
      title: 'New Event',
      date: '2025-02-01',
      questIds: ['quest-a'],
    });

    const quests = (store.gameCharacterManager_quests as QuestStore).quests;
    expect(quests.find(q => q.id === 'quest-a')?.eventIds).toEqual([
      created.id,
    ]);
    expect(quests.find(q => q.id === 'quest-b')?.eventIds).toBeUndefined();
  });

  it('updateEvent syncs added/removed questIds onto quests, and leaves links alone when questIds is omitted', async () => {
    const questA = makeQuest({ id: 'quest-a', eventIds: ['event-a'] });
    const questB = makeQuest({ id: 'quest-b' });
    const event = makeEvent({ id: 'event-a', questIds: ['quest-a'] });

    const store = installStatefulStore({
      gameCharacterManager_quests: {
        quests: [questA, questB],
        version: '1.0',
        lastUpdated: TS,
      },
      gameCharacterManager_events: {
        events: [event],
        version: '1.0',
        lastUpdated: TS,
      },
    });

    await updateEvent('event-a', { questIds: ['quest-b'] });

    let quests = (store.gameCharacterManager_quests as QuestStore).quests;
    expect(quests.find(q => q.id === 'quest-a')?.eventIds).toEqual([]);
    expect(quests.find(q => q.id === 'quest-b')?.eventIds).toEqual(['event-a']);

    await updateEvent('event-a', { title: 'Renamed' });

    quests = (store.gameCharacterManager_quests as QuestStore).quests;
    expect(quests.find(q => q.id === 'quest-b')?.eventIds).toEqual(['event-a']);
  });

  it('deleteEvent removes the event id from every quest, including drift', async () => {
    const questA = makeQuest({ id: 'quest-a', eventIds: ['event-a'] });
    const questB = makeQuest({ id: 'quest-b', eventIds: ['event-a'] });
    const event = makeEvent({ id: 'event-a', questIds: ['quest-a'] });

    const store = installStatefulStore({
      gameCharacterManager_quests: {
        quests: [questA, questB],
        version: '1.0',
        lastUpdated: TS,
      },
      gameCharacterManager_events: {
        events: [event],
        version: '1.0',
        lastUpdated: TS,
      },
    });

    await deleteEvent('event-a');

    const quests = (store.gameCharacterManager_quests as QuestStore).quests;
    expect(quests.every(q => !q.eventIds?.includes('event-a'))).toBe(true);
  });

  describe('reconcileQuestEventLinks', () => {
    it('backfills a missing back-reference from the other side', async () => {
      // quest -> event link recorded, but the event has no reciprocal
      // questIds (e.g. written before GameEvent.questIds existed).
      const quest = makeQuest({ id: 'quest-a', eventIds: ['event-a'] });
      const event = makeEvent({ id: 'event-a' });

      const store = installStatefulStore({
        gameCharacterManager_quests: {
          quests: [quest],
          version: '1.0',
          lastUpdated: TS,
        },
        gameCharacterManager_events: {
          events: [event],
          version: '1.0',
          lastUpdated: TS,
        },
      });

      await reconcileQuestEventLinks();

      const events = (store.gameCharacterManager_events as EventStore).events;
      expect(events[0].questIds).toEqual(['quest-a']);
    });

    it('prunes ids pointing at deleted rows on both sides', async () => {
      const quest = makeQuest({ id: 'quest-a', eventIds: ['missing-event'] });
      const event = makeEvent({ id: 'event-a', questIds: ['missing-quest'] });

      const store = installStatefulStore({
        gameCharacterManager_quests: {
          quests: [quest],
          version: '1.0',
          lastUpdated: TS,
        },
        gameCharacterManager_events: {
          events: [event],
          version: '1.0',
          lastUpdated: TS,
        },
      });

      await reconcileQuestEventLinks();

      const quests = (store.gameCharacterManager_quests as QuestStore).quests;
      const events = (store.gameCharacterManager_events as EventStore).events;
      expect(quests[0].eventIds).toEqual([]);
      expect(events[0].questIds).toEqual([]);
    });

    it('does not write either side when links are already consistent', async () => {
      const quest = makeQuest({ id: 'quest-a', eventIds: ['event-a'] });
      const event = makeEvent({ id: 'event-a', questIds: ['quest-a'] });

      installStatefulStore({
        gameCharacterManager_quests: {
          quests: [quest],
          version: '1.0',
          lastUpdated: TS,
        },
        gameCharacterManager_events: {
          events: [event],
          version: '1.0',
          lastUpdated: TS,
        },
      });

      await reconcileQuestEventLinks();

      expect(SafeAsyncStorageJSONParser.setItem).not.toHaveBeenCalled();
    });
  });
});
