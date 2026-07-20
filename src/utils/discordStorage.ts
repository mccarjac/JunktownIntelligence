import {
  DiscordConfig,
  DiscordServerConfig,
  DiscordUserMapping,
  DiscordMessage,
  DiscordDataset,
  DiscordCharacterAlias,
} from '@models/types';
import { SafeAsyncStorageJSONParser } from './safeAsyncStorageJSONParser';
import { runExclusive } from './storageQueue';

const DISCORD_CONFIG_KEY = 'gameCharacterManager_discord_config';
const DISCORD_MAPPINGS_KEY = 'gameCharacterManager_discord_mappings';
const DISCORD_MESSAGES_KEY = 'gameCharacterManager_discord_messages';
const DISCORD_ALIASES_KEY = 'gameCharacterManager_discord_aliases';

/**
 * Get Discord configuration with migration support
 *
 * NOTE: intentionally NOT wrapped in `runExclusive` — this is called from
 * inside several mutators below that already wrap themselves in
 * `runExclusive(DISCORD_CONFIG_KEY, ...)`. Wrapping it here too would nest
 * two `runExclusive` calls for the same key and deadlock (see AGENTS.md).
 * The one-time legacy migration write below is idempotent (it only ever
 * sets the same derived value), so a rare concurrent double-migration is
 * harmless.
 */
export const getDiscordConfig = async (): Promise<DiscordConfig> => {
  const config =
    await SafeAsyncStorageJSONParser.getItem<DiscordConfig>(DISCORD_CONFIG_KEY);

  if (!config) {
    return {
      enabled: false,
      autoSync: true,
      serverConfigs: [],
    };
  }

  // Migration: Convert legacy single-server config to multi-server format
  if (!config.serverConfigs && (config.botToken || config.channelId)) {
    config.serverConfigs = [];
    if (config.botToken && config.channelId) {
      const legacyConfig: DiscordServerConfig = {
        id: 'legacy-default',
        name: 'Default Server',
        botToken: config.botToken,
        guildId: config.guildId,
        channelId: config.channelId,
        enabled: config.enabled,
        lastSync: config.lastSync,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      config.serverConfigs.push(legacyConfig);

      // Update existing messages to tag them with the legacy server config ID
      const existingMessages =
        await SafeAsyncStorageJSONParser.getItem<DiscordMessage[]>(
          DISCORD_MESSAGES_KEY
        );
      if (existingMessages && existingMessages.length > 0) {
        const updatedMessages = existingMessages.map(msg => ({
          ...msg,
          serverConfigId: msg.serverConfigId || 'legacy-default',
          guildId: msg.guildId || config.guildId,
        }));
        await SafeAsyncStorageJSONParser.setItem(
          DISCORD_MESSAGES_KEY,
          updatedMessages
        );
      }

      // Save migrated config
      await saveDiscordConfig(config);
    }
  }

  // Ensure serverConfigs exists
  if (!config.serverConfigs) {
    config.serverConfigs = [];
  }

  return config;
};

/**
 * Save Discord configuration
 */
export const saveDiscordConfig = async (
  config: DiscordConfig
): Promise<void> => {
  await SafeAsyncStorageJSONParser.setItem(DISCORD_CONFIG_KEY, config);
};

/**
 * Get all Discord server configurations
 */
export const getDiscordServerConfigs = async (): Promise<
  DiscordServerConfig[]
> => {
  const config = await getDiscordConfig();
  return config.serverConfigs || [];
};

/**
 * Add a Discord server configuration
 */
export const addDiscordServerConfig = async (
  serverConfig: Omit<DiscordServerConfig, 'id' | 'createdAt' | 'updatedAt'>
): Promise<DiscordServerConfig> =>
  runExclusive(DISCORD_CONFIG_KEY, async () => {
    const config = await getDiscordConfig();
    const now = new Date().toISOString();

    const newServerConfig: DiscordServerConfig = {
      ...serverConfig,
      id: `server-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };

    config.serverConfigs = config.serverConfigs || [];
    config.serverConfigs.push(newServerConfig);

    await saveDiscordConfig(config);

    return newServerConfig;
  });

/**
 * Update a Discord server configuration
 */
export const updateDiscordServerConfig = async (
  serverConfigId: string,
  updates: Partial<Omit<DiscordServerConfig, 'id' | 'createdAt'>>
): Promise<DiscordServerConfig | null> =>
  runExclusive(DISCORD_CONFIG_KEY, async () => {
    const config = await getDiscordConfig();
    const serverConfigs = config.serverConfigs || [];

    const index = serverConfigs.findIndex(sc => sc.id === serverConfigId);
    if (index === -1) {
      console.error(
        `[Discord Storage] Server config not found: ${serverConfigId}`
      );
      return null;
    }

    const updatedServerConfig: DiscordServerConfig = {
      ...serverConfigs[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    serverConfigs[index] = updatedServerConfig;
    await saveDiscordConfig(config);

    return updatedServerConfig;
  });

/**
 * Remove a Discord server configuration
 */
export const removeDiscordServerConfig = async (
  serverConfigId: string
): Promise<void> =>
  runExclusive(DISCORD_CONFIG_KEY, async () => {
    const config = await getDiscordConfig();
    const serverConfigs = config.serverConfigs || [];

    config.serverConfigs = serverConfigs.filter(sc => sc.id !== serverConfigId);
    await saveDiscordConfig(config);
  });

/**
 * Get a specific Discord server configuration
 */
export const getDiscordServerConfig = async (
  serverConfigId: string
): Promise<DiscordServerConfig | null> => {
  const serverConfigs = await getDiscordServerConfigs();
  return serverConfigs.find(sc => sc.id === serverConfigId) || null;
};

/**
 * Get all Discord user mappings
 */
export const getDiscordUserMappings = async (): Promise<
  DiscordUserMapping[]
> => {
  const mappings =
    await SafeAsyncStorageJSONParser.getItem<DiscordUserMapping[]>(
      DISCORD_MAPPINGS_KEY
    );
  return mappings || [];
};

/**
 * Save Discord user mappings
 */
export const saveDiscordUserMappings = async (
  mappings: DiscordUserMapping[]
): Promise<void> => {
  await SafeAsyncStorageJSONParser.setItem(DISCORD_MAPPINGS_KEY, mappings);
};

/**
 * Add a Discord user mapping
 */
export const addDiscordUserMapping = async (
  discordUserId: string,
  discordUsername: string,
  characterId: string
): Promise<DiscordUserMapping> =>
  runExclusive(DISCORD_MAPPINGS_KEY, async () => {
    const mappings = await getDiscordUserMappings();

    // Check if mapping already exists for this Discord user
    const existingIndex = mappings.findIndex(
      m => m.discordUserId === discordUserId
    );

    const now = new Date().toISOString();
    const mapping: DiscordUserMapping = {
      discordUserId,
      discordUsername,
      characterId,
      createdAt: existingIndex >= 0 ? mappings[existingIndex].createdAt : now,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      mappings[existingIndex] = mapping;
    } else {
      mappings.push(mapping);
    }

    await saveDiscordUserMappings(mappings);
    return mapping;
  });

/**
 * Remove a Discord user mapping
 */
export const removeDiscordUserMapping = async (
  discordUserId: string
): Promise<void> =>
  runExclusive(DISCORD_MAPPINGS_KEY, async () => {
    const mappings = await getDiscordUserMappings();
    const filtered = mappings.filter(m => m.discordUserId !== discordUserId);
    await saveDiscordUserMappings(filtered);
  });

/**
 * Get character ID for a Discord user
 */
export const getCharacterIdForDiscordUser = async (
  discordUserId: string
): Promise<string | undefined> => {
  const mappings = await getDiscordUserMappings();
  const mapping = mappings.find(m => m.discordUserId === discordUserId);
  return mapping?.characterId;
};

/**
 * Get all Discord messages, optionally filtered by server config
 */
export const getDiscordMessages = async (
  serverConfigId?: string
): Promise<DiscordMessage[]> => {
  const messages =
    await SafeAsyncStorageJSONParser.getItem<DiscordMessage[]>(
      DISCORD_MESSAGES_KEY
    );
  const allMessages = messages || [];

  if (!serverConfigId) {
    return allMessages;
  }

  // Filter by server config ID
  return allMessages.filter(m => m.serverConfigId === serverConfigId);
};

/**
 * Save Discord messages
 */
export const saveDiscordMessages = async (
  messages: DiscordMessage[]
): Promise<void> => {
  await SafeAsyncStorageJSONParser.setItem(DISCORD_MESSAGES_KEY, messages);
};

/**
 * Add Discord messages (bulk)
 * Updates existing messages and adds new ones
 */
export const addDiscordMessages = async (
  newMessages: DiscordMessage[]
): Promise<void> =>
  runExclusive(DISCORD_MESSAGES_KEY, async () => {
    const existingMessages = await getDiscordMessages();
    const existingMap = new Map(existingMessages.map(m => [m.id, m]));

    // Merge new messages with existing ones
    newMessages.forEach(newMsg => {
      const existing = existingMap.get(newMsg.id);
      if (existing) {
        // Update existing message - merge fields carefully
        // IMPORTANT: Preserve existing characterId if it exists (user manually mapped it)
        // Only update characterId if new message has one and existing doesn't
        existingMap.set(newMsg.id, {
          ...existing,
          ...newMsg,
          // Preserve existing non-empty content if new content is empty
          content:
            newMsg.content && newMsg.content.trim() !== ''
              ? newMsg.content
              : existing.content,
          // CRITICAL: Preserve existing characterId (don't overwrite user mappings)
          // Only use new characterId if existing doesn't have one
          characterId: existing.characterId || newMsg.characterId,
          // Also preserve extracted name if it exists
          extractedCharacterName:
            existing.extractedCharacterName || newMsg.extractedCharacterName,
        });
      } else {
        // Add new message
        existingMap.set(newMsg.id, newMsg);
      }
    });

    const allMessages = Array.from(existingMap.values());
    // Sort by timestamp (oldest first)
    allMessages.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    await saveDiscordMessages(allMessages);
  });

/**
 * Get Discord messages for a specific character, optionally filtered by server config
 */
export const getDiscordMessagesForCharacter = async (
  characterId: string,
  serverConfigId?: string
): Promise<DiscordMessage[]> => {
  const messages = await getDiscordMessages(serverConfigId);
  return messages.filter(m => m.characterId === characterId);
};

/**
 * Get Discord messages for a specific channel (for context views)
 */
export const getDiscordMessagesForChannel = async (
  channelId: string,
  serverConfigId?: string
): Promise<DiscordMessage[]> => {
  const messages = await getDiscordMessages(serverConfigId);
  return messages.filter(m => m.channelId === channelId);
};

/**
 * Clear all Discord messages only
 */
export const clearDiscordMessages = async (): Promise<void> => {
  await SafeAsyncStorageJSONParser.removeItem(DISCORD_MESSAGES_KEY);
};

/**
 * Clear all Discord data
 */
export const clearDiscordData = async (): Promise<void> => {
  await SafeAsyncStorageJSONParser.removeItem(DISCORD_CONFIG_KEY);
  await SafeAsyncStorageJSONParser.removeItem(DISCORD_MAPPINGS_KEY);
  await SafeAsyncStorageJSONParser.removeItem(DISCORD_MESSAGES_KEY);
  await SafeAsyncStorageJSONParser.removeItem(DISCORD_ALIASES_KEY);
};

/**
 * Get all Discord character aliases
 */
export const getDiscordCharacterAliases = async (): Promise<
  DiscordCharacterAlias[]
> => {
  const aliases =
    await SafeAsyncStorageJSONParser.getItem<DiscordCharacterAlias[]>(
      DISCORD_ALIASES_KEY
    );
  return aliases || [];
};

/**
 * Save Discord character aliases
 */
export const saveDiscordCharacterAliases = async (
  aliases: DiscordCharacterAlias[]
): Promise<void> => {
  await SafeAsyncStorageJSONParser.setItem(DISCORD_ALIASES_KEY, aliases);
};

/**
 * Add or update a character alias
 */
export const addOrUpdateCharacterAlias = async (
  alias: string,
  characterId: string,
  discordUserId: string,
  confidence: number = 1.0
): Promise<DiscordCharacterAlias> =>
  runExclusive(DISCORD_ALIASES_KEY, async () => {
    const aliases = await getDiscordCharacterAliases();
    const normalizedAlias = alias.toLowerCase().trim();

    // Find existing alias for this user
    const existingIndex = aliases.findIndex(
      a =>
        a.alias.toLowerCase() === normalizedAlias &&
        a.discordUserId === discordUserId
    );

    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      // Update existing alias
      const existing = aliases[existingIndex];
      aliases[existingIndex] = {
        ...existing,
        characterId,
        confidence: Math.max(confidence, existing.confidence),
        usageCount: existing.usageCount + 1,
        updatedAt: now,
      };
      await saveDiscordCharacterAliases(aliases);
      return aliases[existingIndex];
    } else {
      // Create new alias
      const newAlias: DiscordCharacterAlias = {
        alias: normalizedAlias,
        characterId,
        discordUserId,
        confidence,
        usageCount: 1,
        createdAt: now,
        updatedAt: now,
      };
      aliases.push(newAlias);
      await saveDiscordCharacterAliases(aliases);
      return newAlias;
    }
  });

/**
 * Get character ID for an alias
 */
export const getCharacterIdForAlias = async (
  alias: string,
  discordUserId: string
): Promise<string | undefined> => {
  const aliases = await getDiscordCharacterAliases();
  const normalizedAlias = alias.toLowerCase().trim();

  // First try exact match for this user
  const exactMatch = aliases.find(
    a =>
      a.alias.toLowerCase() === normalizedAlias &&
      a.discordUserId === discordUserId
  );

  if (exactMatch && exactMatch.confidence > 0.5) {
    return exactMatch.characterId;
  }

  return undefined;
};

/**
 * Apply an alias to all matching messages
 * Updates all messages from the same user with the same extracted name
 */
export const applyAliasToMessages = async (
  alias: string,
  characterId: string,
  discordUserId: string
): Promise<number> =>
  runExclusive(DISCORD_MESSAGES_KEY, async () => {
    const messages = await getDiscordMessages();
    const normalizedAlias = alias.toLowerCase().trim();
    let updateCount = 0;

    const updatedMessages = messages.map(msg => {
      // Check if this message is from the same user and has matching extracted name
      if (
        msg.authorId === discordUserId &&
        msg.extractedCharacterName &&
        msg.extractedCharacterName.toLowerCase().trim() === normalizedAlias
      ) {
        updateCount++;
        return {
          ...msg,
          characterId,
        };
      }
      return msg;
    });

    if (updateCount > 0) {
      await saveDiscordMessages(updatedMessages);
    }

    return updateCount;
  });

/**
 * Find potential character matches for an alias
 */
export const findPotentialCharacterMatches = async (
  alias: string,
  discordUserId: string,
  allCharacters: Array<{ id: string; name: string }>
): Promise<
  Array<{ characterId: string; name: string; confidence: number }>
> => {
  const normalizedAlias = alias.toLowerCase().trim();
  const matches: Array<{
    characterId: string;
    name: string;
    confidence: number;
  }> = [];

  // Check existing aliases first
  const aliases = await getDiscordCharacterAliases();
  const existingAlias = aliases.find(
    a =>
      a.alias.toLowerCase() === normalizedAlias &&
      a.discordUserId === discordUserId
  );

  if (existingAlias) {
    const character = allCharacters.find(
      c => c.id === existingAlias.characterId
    );
    if (character) {
      matches.push({
        characterId: character.id,
        name: character.name,
        confidence: existingAlias.confidence,
      });
    }
  }

  // Try fuzzy matching against all characters
  for (const character of allCharacters) {
    const normalizedCharName = character.name.toLowerCase().trim();

    // Exact match
    if (normalizedCharName === normalizedAlias) {
      if (!matches.find(m => m.characterId === character.id)) {
        matches.push({
          characterId: character.id,
          name: character.name,
          confidence: 1.0,
        });
      }
      continue;
    }

    // Starts with
    if (normalizedCharName.startsWith(normalizedAlias)) {
      if (!matches.find(m => m.characterId === character.id)) {
        matches.push({
          characterId: character.id,
          name: character.name,
          confidence: 0.8,
        });
      }
      continue;
    }

    // Contains
    if (normalizedCharName.includes(normalizedAlias)) {
      if (!matches.find(m => m.characterId === character.id)) {
        matches.push({
          characterId: character.id,
          name: character.name,
          confidence: 0.6,
        });
      }
    }
  }

  // Sort by confidence descending
  matches.sort((a, b) => b.confidence - a.confidence);

  return matches;
};

/**
 * Export Discord data as a dataset
 */
export const exportDiscordDataset = async (): Promise<DiscordDataset> => {
  const config = await getDiscordConfig();
  const userMappings = await getDiscordUserMappings();
  const messages = await getDiscordMessages();
  const characterAliases = await getDiscordCharacterAliases();

  return {
    config,
    serverConfigs: config.serverConfigs || [],
    userMappings,
    messages,
    characterAliases,
    version: '2.0', // Bumped version for multi-server support
    lastUpdated: new Date().toISOString(),
  };
};

/**
 * Import Discord dataset
 */
export const importDiscordDataset = async (
  dataset: DiscordDataset,
  merge: boolean = true
): Promise<void> => {
  if (!merge) {
    // Replace all data. Each key's write is independently serialized
    // against other mutators on that same key.
    await runExclusive(DISCORD_CONFIG_KEY, async () => {
      const configToSave = {
        ...dataset.config,
        serverConfigs:
          dataset.serverConfigs || dataset.config.serverConfigs || [],
      };
      await saveDiscordConfig(configToSave);
    });
    await runExclusive(DISCORD_MAPPINGS_KEY, () =>
      saveDiscordUserMappings(dataset.userMappings)
    );
    await runExclusive(DISCORD_MESSAGES_KEY, () =>
      saveDiscordMessages(dataset.messages)
    );
    await runExclusive(DISCORD_ALIASES_KEY, () =>
      saveDiscordCharacterAliases(dataset.characterAliases || [])
    );
  } else {
    // Merge data. Each key's read-modify-write runs inside its own
    // `runExclusive` block so it reads fresh state under the lock rather
    // than a snapshot taken before any of the writes below.
    await runExclusive(DISCORD_CONFIG_KEY, async () => {
      const existingConfig = await getDiscordConfig();

      // Merge server configs (by ID)
      const serverConfigMap = new Map<string, DiscordServerConfig>();
      (existingConfig.serverConfigs || []).forEach(sc =>
        serverConfigMap.set(sc.id, sc)
      );
      (dataset.serverConfigs || dataset.config.serverConfigs || []).forEach(
        sc => serverConfigMap.set(sc.id, sc)
      );

      // Merge config (prefer imported if enabled, but keep server configs merged)
      const mergedConfig: DiscordConfig = {
        ...(dataset.config.enabled ? dataset.config : existingConfig),
        serverConfigs: Array.from(serverConfigMap.values()),
      };
      await saveDiscordConfig(mergedConfig);
    });

    await runExclusive(DISCORD_MAPPINGS_KEY, async () => {
      const existingMappings = await getDiscordUserMappings();

      // Merge mappings (by Discord user ID)
      const mappingMap = new Map<string, DiscordUserMapping>();
      existingMappings.forEach(m => mappingMap.set(m.discordUserId, m));
      dataset.userMappings.forEach(m => mappingMap.set(m.discordUserId, m));
      await saveDiscordUserMappings(Array.from(mappingMap.values()));
    });

    await runExclusive(DISCORD_ALIASES_KEY, async () => {
      const existingAliases = await getDiscordCharacterAliases();

      // Merge aliases (by alias + user ID)
      const aliasMap = new Map<string, DiscordCharacterAlias>();
      existingAliases.forEach(a =>
        aliasMap.set(`${a.alias}-${a.discordUserId}`, a)
      );
      (dataset.characterAliases || []).forEach(a =>
        aliasMap.set(`${a.alias}-${a.discordUserId}`, a)
      );
      await saveDiscordCharacterAliases(Array.from(aliasMap.values()));
    });

    await runExclusive(DISCORD_MESSAGES_KEY, async () => {
      const existingMessages = await getDiscordMessages();

      // Merge messages (by message ID)
      // When merging, prefer imported values but preserve local-only fields if not in import
      const messageMap = new Map<string, DiscordMessage>();
      existingMessages.forEach(m => messageMap.set(m.id, m));
      dataset.messages.forEach(m => {
        const existing = messageMap.get(m.id);
        if (existing) {
          // Merge: prefer imported data, but preserve local fields if not in import
          messageMap.set(m.id, {
            ...existing, // Start with existing (for any fields not in import)
            ...m, // Override with imported data
            // Special handling: if imported has explicit 'ignored' value, use it;
            // otherwise preserve existing
            ignored: m.ignored !== undefined ? m.ignored : existing.ignored,
          });
        } else {
          messageMap.set(m.id, m);
        }
      });
      const mergedMessages = Array.from(messageMap.values());
      mergedMessages.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      await saveDiscordMessages(mergedMessages);
    });
  }
};
