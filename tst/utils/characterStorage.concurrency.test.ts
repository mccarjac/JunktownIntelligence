import {
  toggleCharacterPresent,
  createFaction,
  updateFaction,
} from '@/utils/characterStorage';
import { SafeAsyncStorageJSONParser } from '@/utils/safeAsyncStorageJSONParser';
import { GameCharacter } from '@/models/types';

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
 * the same starting snapshot and clobber each other (a lost update).
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

describe('characterStorage concurrency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const makeCharacter = (id: string): GameCharacter => ({
    id,
    name: `Character ${id}`,
    species: 'Human',
    perkIds: [],
    distinctionIds: [],
    factions: [],
    relationships: [],
    present: false,
    retired: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  });

  it('does not lose updates when toggling several characters concurrently', async () => {
    const store = installStatefulStore({
      gameCharacterManager: {
        characters: [
          makeCharacter('a'),
          makeCharacter('b'),
          makeCharacter('c'),
        ],
        version: '1.0',
        lastUpdated: '2025-01-01T00:00:00.000Z',
      },
    });

    // Fire all three toggles at once. Serialization must ensure each
    // read-modify-write sees the previous one's result.
    await Promise.all([
      toggleCharacterPresent('a'),
      toggleCharacterPresent('b'),
      toggleCharacterPresent('c'),
    ]);

    const saved = store.gameCharacterManager as {
      characters: GameCharacter[];
    };
    const present = saved.characters.filter(c => c.present).map(c => c.id);
    expect(present.sort()).toEqual(['a', 'b', 'c']);
  });
});

describe('faction retired persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists retired when creating a faction', async () => {
    (SafeAsyncStorageJSONParser.getItem as jest.Mock).mockResolvedValue({
      factions: [],
      version: '1.0',
    });

    await createFaction({
      name: 'Retired Faction',
      description: 'desc',
      retired: true,
    });

    const saved = (SafeAsyncStorageJSONParser.setItem as jest.Mock).mock
      .calls[0][1];
    expect(saved.factions[0].retired).toBe(true);
  });

  it('defaults retired to false when not provided', async () => {
    (SafeAsyncStorageJSONParser.getItem as jest.Mock).mockResolvedValue({
      factions: [],
      version: '1.0',
    });

    await createFaction({ name: 'Active Faction', description: 'desc' });

    const saved = (SafeAsyncStorageJSONParser.setItem as jest.Mock).mock
      .calls[0][1];
    expect(saved.factions[0].retired).toBe(false);
  });

  it('persists retired when updating a faction', async () => {
    (SafeAsyncStorageJSONParser.getItem as jest.Mock).mockResolvedValue({
      factions: [{ name: 'Faction', description: 'desc', retired: false }],
      version: '1.0',
    });

    const result = await updateFaction('Faction', { retired: true });

    expect(result?.retired).toBe(true);
    const saved = (SafeAsyncStorageJSONParser.setItem as jest.Mock).mock
      .calls[0][1];
    expect(saved.factions[0].retired).toBe(true);
  });
});
