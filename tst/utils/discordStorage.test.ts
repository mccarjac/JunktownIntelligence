import {
  getDiscordConfig,
  saveDiscordConfig,
  addDiscordServerConfig,
  updateDiscordServerConfig,
  removeDiscordServerConfig,
  addDiscordUserMapping,
  removeDiscordUserMapping,
  addDiscordMessages,
  applyAliasToMessages,
  addOrUpdateCharacterAlias,
  importDiscordDataset,
} from '@/utils/discordStorage';
import { SafeAsyncStorageJSONParser } from '@/utils/safeAsyncStorageJSONParser';
import {
  DiscordConfig,
  DiscordUserMapping,
  DiscordMessage,
  DiscordCharacterAlias,
  DiscordDataset,
} from '@/models/types';

jest.mock('@/utils/safeAsyncStorageJSONParser');

describe('discordStorage', () => {
  const mockDate = '2025-01-01T00:00:00.000Z';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getDiscordConfig', () => {
    it('returns default config when none is stored', async () => {
      (SafeAsyncStorageJSONParser.getItem as jest.Mock).mockResolvedValue(null);

      const config = await getDiscordConfig();

      expect(config).toEqual({
        enabled: false,
        autoSync: true,
        serverConfigs: [],
      });
    });

    it('leaves an already-migrated config untouched', async () => {
      const config: DiscordConfig = {
        enabled: true,
        autoSync: true,
        serverConfigs: [
          {
            id: 'server-1',
            name: 'Main',
            botToken: 'tok',
            channelId: 'chan',
            enabled: true,
            createdAt: mockDate,
            updatedAt: mockDate,
          },
        ],
      };
      (SafeAsyncStorageJSONParser.getItem as jest.Mock).mockResolvedValue(
        config
      );

      const result = await getDiscordConfig();

      expect(result.serverConfigs).toHaveLength(1);
      expect(SafeAsyncStorageJSONParser.setItem).not.toHaveBeenCalled();
    });

    it('migrates a legacy single-server config into serverConfigs', async () => {
      const legacyConfig = {
        botToken: 'legacy-token',
        guildId: 'guild-1',
        channelId: 'chan-1',
        enabled: true,
        autoSync: true,
      };
      (SafeAsyncStorageJSONParser.getItem as jest.Mock)
        .mockResolvedValueOnce(legacyConfig) // getDiscordConfig's own read
        .mockResolvedValueOnce([]); // existing messages read during migration

      const result = await getDiscordConfig();

      expect(result.serverConfigs).toHaveLength(1);
      expect(result.serverConfigs[0]).toMatchObject({
        id: 'legacy-default',
        name: 'Default Server',
        botToken: 'legacy-token',
        channelId: 'chan-1',
      });
      // Migrated config is persisted.
      expect(SafeAsyncStorageJSONParser.setItem).toHaveBeenCalledWith(
        'gameCharacterManager_discord_config',
        expect.objectContaining({ serverConfigs: result.serverConfigs })
      );
    });

    it('tags existing messages with the legacy server config id during migration', async () => {
      const legacyConfig = {
        botToken: 'legacy-token',
        guildId: 'guild-1',
        channelId: 'chan-1',
        enabled: true,
        autoSync: true,
      };
      const existingMessage: DiscordMessage = {
        id: 'msg-1',
        channelId: 'chan-1',
        authorId: 'user-1',
        authorUsername: 'user',
        content: 'hi',
        timestamp: mockDate,
        createdAt: mockDate,
      };
      (SafeAsyncStorageJSONParser.getItem as jest.Mock)
        .mockResolvedValueOnce(legacyConfig)
        .mockResolvedValueOnce([existingMessage]);

      await getDiscordConfig();

      expect(SafeAsyncStorageJSONParser.setItem).toHaveBeenCalledWith(
        'gameCharacterManager_discord_messages',
        [
          expect.objectContaining({
            id: 'msg-1',
            serverConfigId: 'legacy-default',
            guildId: 'guild-1',
          }),
        ]
      );
    });
  });

  describe('addDiscordServerConfig', () => {
    it('adds a new server config to an empty config', async () => {
      (SafeAsyncStorageJSONParser.getItem as jest.Mock).mockResolvedValue({
        enabled: false,
        autoSync: true,
        serverConfigs: [],
      });

      const result = await addDiscordServerConfig({
        name: 'New Server',
        botToken: 'tok',
        channelId: 'chan',
        enabled: true,
      });

      expect(result.name).toBe('New Server');
      expect(result.createdAt).toBe(mockDate);
      const saved = (SafeAsyncStorageJSONParser.setItem as jest.Mock).mock
        .calls[0][1] as DiscordConfig;
      expect(saved.serverConfigs).toHaveLength(1);
      expect(saved.serverConfigs[0].name).toBe('New Server');
    });

    it('appends to existing server configs', async () => {
      (SafeAsyncStorageJSONParser.getItem as jest.Mock).mockResolvedValue({
        enabled: true,
        autoSync: true,
        serverConfigs: [
          {
            id: 'server-1',
            name: 'Existing',
            botToken: 'tok',
            channelId: 'chan',
            enabled: true,
            createdAt: mockDate,
            updatedAt: mockDate,
          },
        ],
      });

      await addDiscordServerConfig({
        name: 'Second',
        botToken: 'tok2',
        channelId: 'chan2',
        enabled: true,
      });

      const saved = (SafeAsyncStorageJSONParser.setItem as jest.Mock).mock
        .calls[0][1] as DiscordConfig;
      expect(saved.serverConfigs).toHaveLength(2);
    });
  });

  describe('updateDiscordServerConfig', () => {
    it('updates an existing server config', async () => {
      (SafeAsyncStorageJSONParser.getItem as jest.Mock).mockResolvedValue({
        enabled: true,
        autoSync: true,
        serverConfigs: [
          {
            id: 'server-1',
            name: 'Old Name',
            botToken: 'tok',
            channelId: 'chan',
            enabled: true,
            createdAt: mockDate,
            updatedAt: mockDate,
          },
        ],
      });

      const result = await updateDiscordServerConfig('server-1', {
        name: 'New Name',
      });

      expect(result?.name).toBe('New Name');
      const saved = (SafeAsyncStorageJSONParser.setItem as jest.Mock).mock
        .calls[0][1] as DiscordConfig;
      expect(saved.serverConfigs[0].name).toBe('New Name');
    });

    it('returns null for a non-existent server config', async () => {
      (SafeAsyncStorageJSONParser.getItem as jest.Mock).mockResolvedValue({
        enabled: true,
        autoSync: true,
        serverConfigs: [],
      });

      const result = await updateDiscordServerConfig('missing', {
        name: 'X',
      });

      expect(result).toBeNull();
      expect(SafeAsyncStorageJSONParser.setItem).not.toHaveBeenCalled();
    });
  });

  describe('removeDiscordServerConfig', () => {
    it('removes the matching server config', async () => {
      (SafeAsyncStorageJSONParser.getItem as jest.Mock).mockResolvedValue({
        enabled: true,
        autoSync: true,
        serverConfigs: [
          {
            id: 'server-1',
            name: 'A',
            botToken: 'tok',
            channelId: 'chan',
            enabled: true,
            createdAt: mockDate,
            updatedAt: mockDate,
          },
          {
            id: 'server-2',
            name: 'B',
            botToken: 'tok2',
            channelId: 'chan2',
            enabled: true,
            createdAt: mockDate,
            updatedAt: mockDate,
          },
        ],
      });

      await removeDiscordServerConfig('server-1');

      const saved = (SafeAsyncStorageJSONParser.setItem as jest.Mock).mock
        .calls[0][1] as DiscordConfig;
      expect(saved.serverConfigs).toHaveLength(1);
      expect(saved.serverConfigs[0].id).toBe('server-2');
    });
  });

  describe('addDiscordUserMapping', () => {
    it('creates a new mapping', async () => {
      (SafeAsyncStorageJSONParser.getItem as jest.Mock).mockResolvedValue([]);

      const result = await addDiscordUserMapping(
        'discord-1',
        'DiscordUser',
        'char-1'
      );

      expect(result).toMatchObject({
        discordUserId: 'discord-1',
        discordUsername: 'DiscordUser',
        characterId: 'char-1',
        createdAt: mockDate,
      });
    });

    it('updates an existing mapping for the same Discord user, preserving createdAt', async () => {
      const existing: DiscordUserMapping = {
        discordUserId: 'discord-1',
        discordUsername: 'OldName',
        characterId: 'char-old',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };
      (SafeAsyncStorageJSONParser.getItem as jest.Mock).mockResolvedValue([
        existing,
      ]);

      const result = await addDiscordUserMapping(
        'discord-1',
        'NewName',
        'char-new'
      );

      expect(result.createdAt).toBe('2024-01-01T00:00:00.000Z');
      expect(result.characterId).toBe('char-new');
      const saved = (SafeAsyncStorageJSONParser.setItem as jest.Mock).mock
        .calls[0][1] as DiscordUserMapping[];
      expect(saved).toHaveLength(1);
    });
  });

  describe('removeDiscordUserMapping', () => {
    it('removes only the matching mapping', async () => {
      const mappings: DiscordUserMapping[] = [
        {
          discordUserId: 'discord-1',
          discordUsername: 'A',
          characterId: 'char-1',
          createdAt: mockDate,
          updatedAt: mockDate,
        },
        {
          discordUserId: 'discord-2',
          discordUsername: 'B',
          characterId: 'char-2',
          createdAt: mockDate,
          updatedAt: mockDate,
        },
      ];
      (SafeAsyncStorageJSONParser.getItem as jest.Mock).mockResolvedValue(
        mappings
      );

      await removeDiscordUserMapping('discord-1');

      const saved = (SafeAsyncStorageJSONParser.setItem as jest.Mock).mock
        .calls[0][1] as DiscordUserMapping[];
      expect(saved).toHaveLength(1);
      expect(saved[0].discordUserId).toBe('discord-2');
    });
  });

  describe('addDiscordMessages', () => {
    it('adds new messages and sorts by timestamp', async () => {
      (SafeAsyncStorageJSONParser.getItem as jest.Mock).mockResolvedValue([]);

      const messages: DiscordMessage[] = [
        {
          id: 'msg-2',
          channelId: 'chan',
          authorId: 'user-1',
          authorUsername: 'user',
          content: 'second',
          timestamp: '2025-01-02T00:00:00.000Z',
          createdAt: mockDate,
        },
        {
          id: 'msg-1',
          channelId: 'chan',
          authorId: 'user-1',
          authorUsername: 'user',
          content: 'first',
          timestamp: '2025-01-01T00:00:00.000Z',
          createdAt: mockDate,
        },
      ];

      await addDiscordMessages(messages);

      const saved = (SafeAsyncStorageJSONParser.setItem as jest.Mock).mock
        .calls[0][1] as DiscordMessage[];
      expect(saved.map(m => m.id)).toEqual(['msg-1', 'msg-2']);
    });

    it('preserves an existing manually-mapped characterId when merging', async () => {
      const existing: DiscordMessage = {
        id: 'msg-1',
        channelId: 'chan',
        authorId: 'user-1',
        authorUsername: 'user',
        content: 'original content',
        timestamp: mockDate,
        characterId: 'manually-mapped-char',
        createdAt: mockDate,
      };
      (SafeAsyncStorageJSONParser.getItem as jest.Mock).mockResolvedValue([
        existing,
      ]);

      const incoming: DiscordMessage = {
        ...existing,
        characterId: 'auto-detected-char',
        content: 'updated content',
      };

      await addDiscordMessages([incoming]);

      const saved = (SafeAsyncStorageJSONParser.setItem as jest.Mock).mock
        .calls[0][1] as DiscordMessage[];
      expect(saved[0].characterId).toBe('manually-mapped-char');
      expect(saved[0].content).toBe('updated content');
    });

    it('preserves existing non-empty content when incoming content is empty', async () => {
      const existing: DiscordMessage = {
        id: 'msg-1',
        channelId: 'chan',
        authorId: 'user-1',
        authorUsername: 'user',
        content: 'has content',
        timestamp: mockDate,
        createdAt: mockDate,
      };
      (SafeAsyncStorageJSONParser.getItem as jest.Mock).mockResolvedValue([
        existing,
      ]);

      await addDiscordMessages([{ ...existing, content: '' }]);

      const saved = (SafeAsyncStorageJSONParser.setItem as jest.Mock).mock
        .calls[0][1] as DiscordMessage[];
      expect(saved[0].content).toBe('has content');
    });
  });

  describe('applyAliasToMessages', () => {
    it('updates only messages matching author and extracted name', async () => {
      const messages: DiscordMessage[] = [
        {
          id: 'msg-1',
          channelId: 'chan',
          authorId: 'user-1',
          authorUsername: 'user',
          content: '>Bob hello',
          timestamp: mockDate,
          extractedCharacterName: 'Bob',
          createdAt: mockDate,
        },
        {
          id: 'msg-2',
          channelId: 'chan',
          authorId: 'user-2',
          authorUsername: 'other',
          content: '>Bob hi',
          timestamp: mockDate,
          extractedCharacterName: 'Bob',
          createdAt: mockDate,
        },
      ];
      (SafeAsyncStorageJSONParser.getItem as jest.Mock).mockResolvedValue(
        messages
      );

      const count = await applyAliasToMessages('Bob', 'char-1', 'user-1');

      expect(count).toBe(1);
      const saved = (SafeAsyncStorageJSONParser.setItem as jest.Mock).mock
        .calls[0][1] as DiscordMessage[];
      expect(saved.find(m => m.id === 'msg-1')?.characterId).toBe('char-1');
      expect(saved.find(m => m.id === 'msg-2')?.characterId).toBeUndefined();
    });

    it('does not write when no messages match', async () => {
      (SafeAsyncStorageJSONParser.getItem as jest.Mock).mockResolvedValue([]);

      const count = await applyAliasToMessages('Bob', 'char-1', 'user-1');

      expect(count).toBe(0);
      expect(SafeAsyncStorageJSONParser.setItem).not.toHaveBeenCalled();
    });
  });

  describe('addOrUpdateCharacterAlias', () => {
    it('creates a new alias', async () => {
      (SafeAsyncStorageJSONParser.getItem as jest.Mock).mockResolvedValue([]);

      const result = await addOrUpdateCharacterAlias(
        'Bob',
        'char-1',
        'user-1',
        0.9
      );

      expect(result).toMatchObject({
        alias: 'bob',
        characterId: 'char-1',
        discordUserId: 'user-1',
        confidence: 0.9,
        usageCount: 1,
      });
    });

    it('updates an existing alias, bumping usage count and keeping the higher confidence', async () => {
      const existing: DiscordCharacterAlias = {
        alias: 'bob',
        characterId: 'char-old',
        discordUserId: 'user-1',
        confidence: 0.95,
        usageCount: 2,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };
      (SafeAsyncStorageJSONParser.getItem as jest.Mock).mockResolvedValue([
        existing,
      ]);

      const result = await addOrUpdateCharacterAlias(
        'Bob',
        'char-new',
        'user-1',
        0.6
      );

      expect(result.characterId).toBe('char-new');
      expect(result.confidence).toBe(0.95); // max(0.6, 0.95)
      expect(result.usageCount).toBe(3);
    });
  });

  describe('importDiscordDataset', () => {
    const buildDataset = (
      overrides: Partial<DiscordDataset> = {}
    ): DiscordDataset => ({
      config: { enabled: true, autoSync: true, serverConfigs: [] },
      userMappings: [],
      messages: [],
      characterAliases: [],
      version: '2.0',
      lastUpdated: mockDate,
      ...overrides,
    });

    it('replace mode overwrites all four storage keys directly', async () => {
      const dataset = buildDataset({
        userMappings: [
          {
            discordUserId: 'u1',
            discordUsername: 'A',
            characterId: 'c1',
            createdAt: mockDate,
            updatedAt: mockDate,
          },
        ],
      });

      await importDiscordDataset(dataset, false);

      const calls = (SafeAsyncStorageJSONParser.setItem as jest.Mock).mock
        .calls;
      const keys = calls.map(c => c[0]);
      expect(keys).toEqual(
        expect.arrayContaining([
          'gameCharacterManager_discord_config',
          'gameCharacterManager_discord_mappings',
          'gameCharacterManager_discord_messages',
          'gameCharacterManager_discord_aliases',
        ])
      );
    });

    it('merge mode combines mappings by Discord user id, preferring imported data', async () => {
      const existingConfig = {
        enabled: false,
        autoSync: true,
        serverConfigs: [],
      };
      const existingMappings: DiscordUserMapping[] = [
        {
          discordUserId: 'u1',
          discordUsername: 'OldName',
          characterId: 'old-char',
          createdAt: mockDate,
          updatedAt: mockDate,
        },
      ];
      // Reads happen in order: config, mappings, aliases, messages (one
      // runExclusive block per key, sequentially).
      (SafeAsyncStorageJSONParser.getItem as jest.Mock)
        .mockResolvedValueOnce(existingConfig)
        .mockResolvedValueOnce(existingMappings)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const dataset = buildDataset({
        userMappings: [
          {
            discordUserId: 'u1',
            discordUsername: 'NewName',
            characterId: 'new-char',
            createdAt: mockDate,
            updatedAt: mockDate,
          },
          {
            discordUserId: 'u2',
            discordUsername: 'B',
            characterId: 'c2',
            createdAt: mockDate,
            updatedAt: mockDate,
          },
        ],
      });

      await importDiscordDataset(dataset, true);

      const mappingsCall = (
        SafeAsyncStorageJSONParser.setItem as jest.Mock
      ).mock.calls.find(c => c[0] === 'gameCharacterManager_discord_mappings');
      const savedMappings = mappingsCall?.[1] as DiscordUserMapping[];
      expect(savedMappings).toHaveLength(2);
      expect(
        savedMappings.find(m => m.discordUserId === 'u1')?.discordUsername
      ).toBe('NewName');
    });

    it('merge mode preserves existing message ignored flag when import omits it', async () => {
      const existingMessage: DiscordMessage = {
        id: 'msg-1',
        channelId: 'chan',
        authorId: 'user-1',
        authorUsername: 'user',
        content: 'hi',
        timestamp: mockDate,
        ignored: true,
        createdAt: mockDate,
      };
      (SafeAsyncStorageJSONParser.getItem as jest.Mock)
        .mockResolvedValueOnce({
          enabled: false,
          autoSync: true,
          serverConfigs: [],
        }) // config
        .mockResolvedValueOnce([]) // mappings
        .mockResolvedValueOnce([]) // aliases
        .mockResolvedValueOnce([existingMessage]); // messages

      const dataset = buildDataset({
        messages: [
          { ...existingMessage, content: 'updated', ignored: undefined },
        ],
      });

      await importDiscordDataset(dataset, true);

      const messagesCall = (
        SafeAsyncStorageJSONParser.setItem as jest.Mock
      ).mock.calls.find(c => c[0] === 'gameCharacterManager_discord_messages');
      const savedMessages = messagesCall?.[1] as DiscordMessage[];
      expect(savedMessages[0].content).toBe('updated');
      expect(savedMessages[0].ignored).toBe(true);
    });
  });

  describe('saveDiscordConfig', () => {
    it('persists the config as-is', async () => {
      const config: DiscordConfig = {
        enabled: true,
        autoSync: false,
        serverConfigs: [],
      };

      await saveDiscordConfig(config);

      expect(SafeAsyncStorageJSONParser.setItem).toHaveBeenCalledWith(
        'gameCharacterManager_discord_config',
        config
      );
    });
  });
});
