import * as FileSystem from 'expo-file-system/legacy';
import { DiscordMessage, DiscordAttachment } from '@models/types';
import {
  getDiscordConfig,
  getDiscordServerConfig,
  updateDiscordServerConfig,
  addDiscordMessages,
  getCharacterIdForDiscordUser,
  getDiscordMessages,
} from './discordStorage';
import {
  extractCharacterName,
  resolveCharacterFromName,
} from './discordCharacterExtraction';

// Discord API base URL
const DISCORD_API_BASE = 'https://discord.com/api/v10';

/**
 * Check if Discord is configured and enabled
 * Can check globally or for a specific server config
 */
export const isDiscordConfigured = async (
  serverConfigId?: string
): Promise<boolean> => {
  const config = await getDiscordConfig();

  if (!config.enabled) {
    return false;
  }

  // If no specific server config, check if ANY server config is valid
  if (!serverConfigId) {
    // Legacy check
    if (config.botToken && config.channelId) {
      return true;
    }
    // Multi-server check
    return (config.serverConfigs || []).some(
      sc => sc.enabled && sc.botToken && sc.channelId
    );
  }

  // Check specific server config
  const serverConfig = await getDiscordServerConfig(serverConfigId);
  return (
    !!serverConfig &&
    serverConfig.enabled &&
    !!serverConfig.botToken &&
    !!serverConfig.channelId
  );
};

/**
 * Verify Discord bot token by making a test API call
 */
export const verifyDiscordToken = async (token: string): Promise<boolean> => {
  try {
    const response = await fetch(`${DISCORD_API_BASE}/users/@me`, {
      headers: {
        Authorization: `Bot ${token}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Verify channel access
 */
export const verifyChannelAccess = async (
  token: string,
  channelId: string
): Promise<boolean> => {
  try {
    const response = await fetch(`${DISCORD_API_BASE}/channels/${channelId}`, {
      headers: {
        Authorization: `Bot ${token}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
};

interface DiscordApiMessage {
  id: string;
  channel_id: string;
  author: {
    id: string;
    username: string;
    discriminator: string;
  };
  content: string;
  timestamp: string;
  attachments: Array<{
    id: string;
    filename: string;
    url: string;
    content_type?: string;
    size: number;
  }>;
}

/**
 * Fetch messages from a Discord channel using a specific server config
 */
export const fetchDiscordMessages = async (
  serverConfigId: string,
  limit: number = 100,
  before?: string
): Promise<DiscordMessage[]> => {
  const serverConfig = await getDiscordServerConfig(serverConfigId);
  if (!serverConfig) {
    throw new Error(`Server config not found: ${serverConfigId}`);
  }

  if (!serverConfig.botToken || !serverConfig.channelId) {
    throw new Error('Discord server config incomplete');
  }

  let url = `${DISCORD_API_BASE}/channels/${serverConfig.channelId}/messages?limit=${limit}`;
  if (before) {
    url += `&before=${before}`;
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bot ${serverConfig.botToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch messages: ${response.status} ${errorText}`
    );
  }

  const messages: DiscordApiMessage[] = await response.json();

  // Convert to our format and fetch character mappings
  const convertedMessages: DiscordMessage[] = await Promise.all(
    messages.map(async msg => {
      // First try to get character from user mapping
      let characterId = await getCharacterIdForDiscordUser(msg.author.id);
      let extractedCharacterName: string | undefined;

      // If no direct mapping, try to extract character name from message content
      if (!characterId) {
        const extractedName = extractCharacterName(msg.content);
        if (extractedName) {
          extractedCharacterName = extractedName;

          // Try to resolve the character
          const resolution = await resolveCharacterFromName(
            extractedName,
            msg.author.id
          );

          if (resolution.characterId) {
            characterId = resolution.characterId;
          }
          // If needsManualSelection is true, we'll store the extracted name
          // and the user can manually map it later
        }
      }

      // Download attachments if they are images
      const imageUris: string[] = [];
      const attachments: DiscordAttachment[] = [];

      for (const attachment of msg.attachments) {
        attachments.push({
          id: attachment.id,
          filename: attachment.filename,
          url: attachment.url,
          contentType: attachment.content_type,
          size: attachment.size,
        });

        // Download images
        if (
          attachment.content_type &&
          attachment.content_type.startsWith('image/')
        ) {
          try {
            const imageUri = await downloadDiscordImage(
              attachment.url,
              attachment.filename
            );
            if (imageUri) {
              imageUris.push(imageUri);
            }
          } catch (error) {
            console.error(
              `Failed to download Discord image ${attachment.filename}:`,
              error
            );
          }
        }
      }

      return {
        id: msg.id,
        channelId: msg.channel_id,
        guildId: serverConfig.guildId,
        serverConfigId: serverConfig.id,
        authorId: msg.author.id,
        authorUsername: `${msg.author.username}#${msg.author.discriminator}`,
        content: msg.content,
        timestamp: msg.timestamp,
        characterId,
        extractedCharacterName,
        imageUris: imageUris.length > 0 ? imageUris : undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
        createdAt: new Date().toISOString(),
      };
    })
  );

  return convertedMessages;
};

/**
 * Download an image from Discord and save it locally
 */
const downloadDiscordImage = async (
  url: string,
  filename: string
): Promise<string | null> => {
  try {
    const timestamp = Date.now();
    const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const localUri =
      (FileSystem.documentDirectory || FileSystem.cacheDirectory || '') +
      `discord_images/${timestamp}_${safeFilename}`;

    // Ensure directory exists
    const dirUri =
      (FileSystem.documentDirectory || FileSystem.cacheDirectory || '') +
      'discord_images/';
    const dirInfo = await FileSystem.getInfoAsync(dirUri);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dirUri, { intermediates: true });
    }

    // Download the image
    const downloadResult = await FileSystem.downloadAsync(url, localUri);
    return downloadResult.uri;
  } catch (error) {
    console.error('Failed to download Discord image:', error);
    return null;
  }
};

/**
 * Sync Discord messages for a specific server config
 */
export const syncDiscordMessagesForServer = async (
  serverConfigId: string,
  onProgress?: (status: string) => void
): Promise<{ newMessages: number; totalMessages: number }> => {
  const serverConfig = await getDiscordServerConfig(serverConfigId);
  if (!serverConfig) {
    throw new Error(`Server config not found: ${serverConfigId}`);
  }

  if (
    !serverConfig.enabled ||
    !serverConfig.botToken ||
    !serverConfig.channelId
  ) {
    throw new Error('Server config is not properly configured or enabled');
  }

  onProgress?.(`Fetching messages from ${serverConfig.name}...`);

  // Fetch initial batch
  let allMessages: DiscordMessage[] = [];
  let lastMessageId: string | undefined;
  let hasMore = true;
  let fetchCount = 0;
  const maxFetches = 10; // Limit to 1000 messages per sync (100 per fetch)

  while (hasMore && fetchCount < maxFetches) {
    const messages = await fetchDiscordMessages(
      serverConfigId,
      100,
      lastMessageId
    );
    if (messages.length === 0) {
      hasMore = false;
    } else {
      allMessages = [...allMessages, ...messages];
      lastMessageId = messages[messages.length - 1].id;
      fetchCount++;
      onProgress?.(
        `Fetched ${allMessages.length} messages from ${serverConfig.name}...`
      );
    }
  }

  // Store messages
  onProgress?.('Saving messages to local storage...');
  const existingMessages = await getDiscordMessages(serverConfigId);
  const beforeCount = existingMessages.length;
  await addDiscordMessages(allMessages);
  const updatedMessages = await getDiscordMessages(serverConfigId);
  const afterCount = updatedMessages.length;

  // Update last sync timestamp for this server
  await updateDiscordServerConfig(serverConfigId, {
    lastSync: new Date().toISOString(),
  });

  onProgress?.(`Sync complete for ${serverConfig.name}!`);

  return {
    newMessages: afterCount - beforeCount,
    totalMessages: afterCount,
  };
};

/**
 * Sync Discord messages for all enabled server configs
 */
export const syncDiscordMessages = async (
  onProgress?: (status: string) => void
): Promise<{ newMessages: number; totalMessages: number; servers: number }> => {
  const config = await getDiscordConfig();
  const serverConfigs = (config.serverConfigs || []).filter(sc => sc.enabled);

  if (serverConfigs.length === 0) {
    throw new Error('No Discord server configurations are enabled');
  }

  let totalNewMessages = 0;
  let totalMessages = 0;

  for (let i = 0; i < serverConfigs.length; i++) {
    const serverConfig = serverConfigs[i];
    onProgress?.(
      `Syncing ${i + 1}/${serverConfigs.length}: ${serverConfig.name}...`
    );

    try {
      const result = await syncDiscordMessagesForServer(
        serverConfig.id,
        status => onProgress?.(`[${serverConfig.name}] ${status}`)
      );
      totalNewMessages += result.newMessages;
      totalMessages += result.totalMessages;
    } catch (error) {
      console.error(
        `[Discord Sync] Failed to sync ${serverConfig.name}:`,
        error
      );
      onProgress?.(`⚠️ Failed to sync ${serverConfig.name}`);
    }
  }

  onProgress?.('All servers synced!');

  return {
    newMessages: totalNewMessages,
    totalMessages: totalMessages,
    servers: serverConfigs.length,
  };
};

/**
 * Test Discord connection for a specific server config
 */
export const testDiscordConnection = async (
  serverConfigId?: string
): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    // If specific server config provided, test that one
    if (serverConfigId) {
      const serverConfig = await getDiscordServerConfig(serverConfigId);
      if (!serverConfig) {
        return { success: false, error: 'Server config not found' };
      }
      if (!serverConfig.botToken) {
        return { success: false, error: 'Bot token not configured' };
      }
      if (!serverConfig.channelId) {
        return { success: false, error: 'Channel ID not configured' };
      }

      const tokenValid = await verifyDiscordToken(serverConfig.botToken);
      if (!tokenValid) {
        return { success: false, error: 'Invalid bot token' };
      }

      const channelAccessible = await verifyChannelAccess(
        serverConfig.botToken,
        serverConfig.channelId
      );
      if (!channelAccessible) {
        return { success: false, error: 'Cannot access channel' };
      }

      return { success: true };
    }

    // Legacy: Test old config format
    const config = await getDiscordConfig();
    if (!config.botToken) {
      return { success: false, error: 'Bot token not configured' };
    }
    if (!config.channelId) {
      return { success: false, error: 'Channel ID not configured' };
    }

    const tokenValid = await verifyDiscordToken(config.botToken);
    if (!tokenValid) {
      return { success: false, error: 'Invalid bot token' };
    }

    const channelAccessible = await verifyChannelAccess(
      config.botToken,
      config.channelId
    );
    if (!channelAccessible) {
      return { success: false, error: 'Cannot access channel' };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
