import { updateQuest } from '@/utils/characterStorage';
import { SafeAsyncStorageJSONParser } from '@/utils/safeAsyncStorageJSONParser';
import { GameQuest, QuestStatus } from '@/models/types';

jest.mock('@/utils/safeAsyncStorageJSONParser');

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234'),
}));

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Install a stateful in-memory backing store for SafeAsyncStorageJSONParser
 * with an artificial async gap on read/write. The gap forces interleaving:
 * without per-key serialization, concurrent read-modify-write operations read
 * the same starting snapshot and clobber each other (a lost update). Mirrors
 * the pattern in characterStorage.concurrency.test.ts.
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

describe('quest storage concurrency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const makeQuest = (id: string): GameQuest => ({
    id,
    name: `Quest ${id}`,
    status: QuestStatus.NotStarted,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  });

  it('does not lose updates when updating several quests concurrently', async () => {
    const store = installStatefulStore({
      gameCharacterManager_quests: {
        quests: [makeQuest('a'), makeQuest('b'), makeQuest('c')],
        version: '1.0',
        lastUpdated: '2025-01-01T00:00:00.000Z',
      },
    });

    // Fire all three updates at once. Serialization must ensure each
    // read-modify-write sees the previous one's result rather than clobbering
    // it with a stale snapshot.
    await Promise.all([
      updateQuest('a', { status: QuestStatus.Assigned }),
      updateQuest('b', { status: QuestStatus.Assigned }),
      updateQuest('c', { status: QuestStatus.Assigned }),
    ]);

    const saved = store.gameCharacterManager_quests as {
      quests: GameQuest[];
    };
    const assigned = saved.quests
      .filter(q => q.status === QuestStatus.Assigned)
      .map(q => q.id);
    expect(assigned.sort()).toEqual(['a', 'b', 'c']);
  });
});
