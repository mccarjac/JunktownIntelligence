import {
  addDiscordServerConfig,
  addDiscordUserMapping,
  addDiscordMessages,
  addOrUpdateCharacterAlias,
} from '@/utils/discordStorage';
import { SafeAsyncStorageJSONParser } from '@/utils/safeAsyncStorageJSONParser';
import { DiscordConfig, DiscordMessage } from '@/models/types';

jest.mock('@/utils/safeAsyncStorageJSONParser');

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Install a stateful in-memory backing store for SafeAsyncStorageJSONParser
 * with an artificial async gap on read/write. The gap forces interleaving:
 * without per-key serialization, concurrent read-modify-write operations read
 * the same starting snapshot and clobber each other (a lost update). Mirrors
 * the harness in characterStorage.concurrency.test.ts.
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

describe('discordStorage concurrency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not lose server configs added concurrently', async () => {
    const store = installStatefulStore({
      gameCharacterManager_discord_config: {
        enabled: true,
        autoSync: true,
        serverConfigs: [],
      },
    });

    await Promise.all([
      addDiscordServerConfig({
        name: 'Server A',
        botToken: 'tok-a',
        channelId: 'chan-a',
        enabled: true,
      }),
      addDiscordServerConfig({
        name: 'Server B',
        botToken: 'tok-b',
        channelId: 'chan-b',
        enabled: true,
      }),
      addDiscordServerConfig({
        name: 'Server C',
        botToken: 'tok-c',
        channelId: 'chan-c',
        enabled: true,
      }),
    ]);

    const saved = store.gameCharacterManager_discord_config as DiscordConfig;
    expect(saved.serverConfigs.map(sc => sc.name).sort()).toEqual([
      'Server A',
      'Server B',
      'Server C',
    ]);
  });

  it('does not lose user mappings added concurrently', async () => {
    const store = installStatefulStore({
      gameCharacterManager_discord_mappings: [],
    });

    await Promise.all([
      addDiscordUserMapping('discord-1', 'UserOne', 'char-1'),
      addDiscordUserMapping('discord-2', 'UserTwo', 'char-2'),
      addDiscordUserMapping('discord-3', 'UserThree', 'char-3'),
    ]);

    const saved = store.gameCharacterManager_discord_mappings as Array<{
      discordUserId: string;
    }>;
    expect(saved.map(m => m.discordUserId).sort()).toEqual([
      'discord-1',
      'discord-2',
      'discord-3',
    ]);
  });

  it('does not lose messages added concurrently in separate batches', async () => {
    const store = installStatefulStore({
      gameCharacterManager_discord_messages: [],
    });

    const makeMessage = (id: string): DiscordMessage => ({
      id,
      channelId: 'chan',
      authorId: 'user-1',
      authorUsername: 'user',
      content: `content ${id}`,
      timestamp: '2025-01-01T00:00:00.000Z',
      createdAt: '2025-01-01T00:00:00.000Z',
    });

    await Promise.all([
      addDiscordMessages([makeMessage('msg-1')]),
      addDiscordMessages([makeMessage('msg-2')]),
      addDiscordMessages([makeMessage('msg-3')]),
    ]);

    const saved = store.gameCharacterManager_discord_messages as Array<{
      id: string;
    }>;
    expect(saved.map(m => m.id).sort()).toEqual(['msg-1', 'msg-2', 'msg-3']);
  });

  it('does not lose character aliases added concurrently', async () => {
    const store = installStatefulStore({
      gameCharacterManager_discord_aliases: [],
    });

    await Promise.all([
      addOrUpdateCharacterAlias('Alice', 'char-1', 'user-1'),
      addOrUpdateCharacterAlias('Bob', 'char-2', 'user-2'),
      addOrUpdateCharacterAlias('Carol', 'char-3', 'user-3'),
    ]);

    const saved = store.gameCharacterManager_discord_aliases as Array<{
      alias: string;
    }>;
    expect(saved.map(a => a.alias).sort()).toEqual(['alice', 'bob', 'carol']);
  });
});
