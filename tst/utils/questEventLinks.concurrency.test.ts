import {
  updateQuest,
  updateEvent,
  deleteQuest,
} from '@/utils/characterStorage';
import { SafeAsyncStorageJSONParser } from '@/utils/safeAsyncStorageJSONParser';
import { GameEvent, GameQuest, QuestStatus } from '@/models/types';

jest.mock('@/utils/safeAsyncStorageJSONParser');

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234'),
}));

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Stateful in-memory backing store with an artificial async gap on
 * read/write, shared across both storage keys the quest<->event sync
 * touches. The gap forces interleaving: without per-key serialization,
 * concurrent read-modify-writes on the same key would read the same
 * starting snapshot and clobber each other. Mirrors
 * `characterStorage.concurrency.test.ts` / `quest.concurrency.test.ts`.
 */
const installStatefulStore = (initial: Record<string, unknown>) => {
  const store: Record<string, unknown> = clone(initial);

  (SafeAsyncStorageJSONParser.getItem as jest.Mock).mockImplementation(
    async (key: string) => {
      await delay(1);
      return key in store ? clone(store[key]) : null;
    }
  );
  (SafeAsyncStorageJSONParser.setItem as jest.Mock).mockImplementation(
    async (key: string, value: unknown) => {
      await delay(1);
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

describe('quest <-> event link sync concurrency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps every back-reference when several quests link overlapping events concurrently', async () => {
    const eventA = makeEvent({ id: 'event-a' });
    const eventB = makeEvent({ id: 'event-b' });
    const questX = makeQuest({ id: 'quest-x' });
    const questY = makeQuest({ id: 'quest-y' });
    const questZ = makeQuest({ id: 'quest-z' });

    const store = installStatefulStore({
      gameCharacterManager_events: {
        events: [eventA, eventB],
        version: '1.0',
        lastUpdated: TS,
      },
      gameCharacterManager_quests: {
        quests: [questX, questY, questZ],
        version: '1.0',
        lastUpdated: TS,
      },
    });

    // Three quests all link event-a concurrently (and quest-z also links
    // event-b). Each updateQuest call does its own event-side sync, so
    // without serialization on EVENT_STORAGE_KEY the writes would clobber
    // one another and drop back-references.
    await Promise.all([
      updateQuest('quest-x', { eventIds: ['event-a'] }),
      updateQuest('quest-y', { eventIds: ['event-a'] }),
      updateQuest('quest-z', { eventIds: ['event-a', 'event-b'] }),
    ]);

    const events = (store.gameCharacterManager_events as EventStore).events;
    const eventAQuestIds = events.find(e => e.id === 'event-a')?.questIds;
    const eventBQuestIds = events.find(e => e.id === 'event-b')?.questIds;

    expect(eventAQuestIds?.slice().sort()).toEqual([
      'quest-x',
      'quest-y',
      'quest-z',
    ]);
    expect(eventBQuestIds).toEqual(['quest-z']);
  });

  it('completes interleaved quest-side and event-side updates without deadlocking, both sides ending consistent', async () => {
    const event = makeEvent({ id: 'event-a' });
    const quest = makeQuest({ id: 'quest-a' });

    const store = installStatefulStore({
      gameCharacterManager_events: {
        events: [event],
        version: '1.0',
        lastUpdated: TS,
      },
      gameCharacterManager_quests: {
        quests: [quest],
        version: '1.0',
        lastUpdated: TS,
      },
    });

    // updateQuest locks QUEST_STORAGE_KEY then EVENT_STORAGE_KEY; updateEvent
    // locks EVENT_STORAGE_KEY then QUEST_STORAGE_KEY. Firing both at once
    // would hang (jest's test timeout would fail it) if either ever nested a
    // lock on a key it already held instead of releasing before acquiring
    // the other; resolving proves the sequential (never-nested) locking
    // holds, and the assertions below prove neither sync clobbered the
    // other's write.
    await Promise.all([
      updateQuest('quest-a', { eventIds: ['event-a'] }),
      updateEvent('event-a', { questIds: ['quest-a'] }),
    ]);

    const events = (store.gameCharacterManager_events as EventStore).events;
    const quests = (store.gameCharacterManager_quests as QuestStore).quests;
    expect(events.find(e => e.id === 'event-a')?.questIds).toEqual(['quest-a']);
    expect(quests.find(q => q.id === 'quest-a')?.eventIds).toEqual(['event-a']);
  });

  it('deleting a quest concurrently with an unrelated event update leaves both consistent', async () => {
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

    await Promise.all([
      deleteQuest('quest-a'),
      updateEvent('event-b', { description: 'Updated concurrently' }),
    ]);

    const events = (store.gameCharacterManager_events as EventStore).events;
    expect(events.find(e => e.id === 'event-a')?.questIds).toEqual([]);
    expect(events.find(e => e.id === 'event-b')?.description).toBe(
      'Updated concurrently'
    );
  });
});
