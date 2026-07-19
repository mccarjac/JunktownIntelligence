# Discord Integration

Junktown Intelligence now supports Discord integration, allowing you to import and monitor **multiple Discord servers and channels** to track conversations linked to characters.

## Overview

The Discord integration provides the following features:

- **Multi-Server/Channel Support**: Connect to multiple Discord servers and channels simultaneously
- **Discord Bot Configuration**: Manage multiple server/channel configurations with individual settings
- **Message Import**: Automatically fetch and store Discord messages from all configured channels
- **User-Character Mapping**: Link Discord users to characters in your game
- **Image Support**: Download and store images sent in Discord messages
- **Auto-Sync**: Optionally sync messages automatically when the app has internet access
- **Export/Import**: Discord logs and configurations are included in data export/import operations
- **Message Context**: View messages in the context of their original server/channel

## What's New in Multi-Server Support

**Version 2.0** introduces support for multiple Discord servers and channels:

- Add unlimited server/channel configurations
- Each configuration has its own bot token, channel ID, and sync settings
- Messages are automatically tagged with their source server/channel
- Filter messages by server/channel in the messages view
- Context views show only messages from the same server/channel
- Individual sync control for each server/channel
- Backward compatible with existing single-server setups

## Setup Instructions

### 1. Create a Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Give your application a name
4. Go to the "Bot" section
5. Click "Add Bot"
6. Copy the bot token (you'll need this later)
7. **IMPORTANT**: Enable "MESSAGE CONTENT INTENT" in the bot settings

### 2. Configure Bot Permissions

Your bot needs the following permissions:

- Read Messages/View Channels
- Read Message History

### 3. Invite Bot to Your Server(s)

1. Go to the "OAuth2" section in the Developer Portal
2. Select "bot" under scopes
3. Select the permissions mentioned above
4. Copy the generated URL and paste it in your browser
5. Select your server and authorize the bot
6. Repeat for each server you want to monitor

### 4. Get IDs

Enable Developer Mode in Discord:

- User Settings → Advanced → Enable Developer Mode

Then you can right-click to copy IDs:

- Right-click your server → Copy ID (Server/Guild ID - optional but recommended)
- Right-click the channel → Copy ID (Channel ID - required)
- Right-click users → Copy ID (User ID - for mapping to characters)

## Using the Discord Integration

### Configure Discord Servers/Channels

1. Open the app and navigate to **"Server/Channel Management"** from the Discord menu
2. The global Discord integration toggle must be enabled
3. Click **"+ Add Server/Channel"** to add a new configuration
4. Fill in the form:
   - **Configuration Name**: A friendly name (e.g., "Main RP Server - IC Chat")
   - **Bot Token**: Your Discord bot's authentication token
   - **Guild/Server ID**: (Optional) The Discord server ID
   - **Channel ID**: The specific channel ID to monitor
   - **Enable**: Toggle whether this configuration is active
5. Click **"Save Configuration"**
6. Use the **"Test"** button to verify the connection
7. Use the **"Sync"** button to fetch messages from that channel

### Managing Multiple Servers/Channels

From the **Server/Channel Management** screen:

- **View All Configurations**: See all your configured servers/channels in one place
- **Enable/Disable**: Toggle individual configurations on/off
- **Edit**: Modify any configuration's settings
- **Test Connection**: Verify bot access to each channel
- **Sync Individual**: Sync messages from a specific server/channel
- **Delete**: Remove a configuration (messages remain stored)

### Sync Messages

There are multiple ways to sync Discord messages:

**Manual Sync (All Servers):**

1. Go to "Discord Setup (Legacy)" (for backward compatibility)
2. Click "Sync Messages Now"
3. This will sync all enabled server/channel configurations

**Manual Sync (Single Server):**

1. Go to "Server/Channel Management"
2. Click the **"Sync"** button on a specific server card
3. Only that server/channel will be synced

**Auto-Sync:**

- Enable "Auto-sync when online" in Server/Channel Management
- The app will periodically sync all enabled servers when connected to the internet

### Map Discord Users to Characters

1. Navigate to "Character Name Mapping" from the Discord menu
2. For each Discord user you want to track:
   - Enter their Discord User ID
   - Enter their Discord username (for display purposes)
   - Select the character they represent
   - Click "Add Mapping"
3. Users without mappings will still have their messages stored, but won't be linked to characters

### Viewing Discord Messages

Discord messages can be viewed in multiple ways:

1. **Discord Messages Screen**:
   - Navigate to "Discord Messages" from the Discord menu
   - Use the **Server/Channel filter** dropdown to view messages from specific servers or all servers
   - Tag messages to characters by clicking on them
   - Filter by tagged, untagged, or ignored messages

2. **Message Context**:
   - From the messages screen or character detail, view a message in its full context
   - Shows the conversation stream from the same server/channel
   - Highlights the selected message for easy reference

3. **By Character**: Navigate to a character's detail screen to see their Discord messages (filtered by server/channel if needed)

4. **Exported Data**: Discord logs are included when you export your game data

5. **Imported Data**: Discord logs are imported when you import game data

## Data Storage

Discord data is stored locally on your device and includes:

- **Global Configuration**: Overall Discord integration settings (enabled, auto-sync)
- **Server Configurations**: Multiple server/channel configurations with individual settings
- **User Mappings**: Discord user to character associations (global across all servers)
- **Messages**: Message content, timestamps, author information, server/channel tags
- **Character Aliases**: Learned character name mappings from message content
- **Images**: Downloaded Discord images are stored locally

## Export/Import

When you export your game data:

- All Discord server/channel configurations are included (with bot tokens for restoration)
- All user mappings are included
- All messages from all servers/channels are included
- All character aliases are included
- Discord images are packaged in the export

When you import game data:

- Discord data is merged with your existing data
- Server configurations are merged by ID (prevents duplicates)
- Duplicate messages are automatically filtered
- User mappings and aliases are merged
- Compatible with both old (single-server) and new (multi-server) export formats

## Migration from Single-Server Setup

If you're upgrading from a previous version with single-server configuration:

1. **Automatic Migration**: Your existing configuration will be automatically converted to a multi-server configuration named "Default Server"
2. **Existing Messages**: All your existing messages will be retroactively tagged with the migrated server config
3. **No Data Loss**: All your settings, messages, and mappings are preserved
4. **Add More Servers**: You can now add additional server/channel configurations alongside your existing one

## Security Considerations

- **Bot Tokens**: Your Discord bot tokens are stored securely on your device
- **Token Export**: Bot tokens are included in exports - keep export files private
- **Permissions**: Bots only need read permissions and cannot send messages or modify servers
- **Data Privacy**: All Discord data is stored locally on your device
- **Multiple Bots**: You can use the same bot token across multiple server configs, or use different bots for different servers

## Troubleshooting

### "Connection Failed" Error

- Verify your bot token is correct for that specific server configuration
- Check that the bot is invited to the server
- Ensure the bot has read permissions for the channel
- Verify the channel ID is correct
- Make sure MESSAGE CONTENT INTENT is enabled in the bot settings

### Messages Not Syncing

- Check that Discord integration is globally enabled (toggle in Server/Channel Management)
- Verify the specific server configuration is enabled
- Verify you have internet access
- Ensure the bot has access to the channel
- Check the last sync timestamp in Discord Setup

### User Mappings Not Working

- Verify the Discord User ID is correct (enable Developer Mode in Discord)
- Check that the user has sent messages in the monitored channel
- User mappings only apply to messages synced after the mapping is created

### Messages Appearing in Wrong Server/Channel

- Each message should be tagged with its source server configuration
- If messages appear mixed, re-sync the affected server configurations
- Check that you're using the correct bot token for each server

### Cannot See Messages from Specific Channel

- Verify the server/channel filter is set correctly in the Discord Messages screen
- Check that messages were successfully synced (check last sync time)
- Ensure the server configuration is enabled

### Filtering Not Working

- Make sure you've selected the correct server/channel from the dropdown
- Try selecting "All Servers/Channels" to see all messages
- Refresh the screen by navigating away and back

## Limitations

- The bot can only read messages from channels it has access to
- Each sync fetches up to 1000 messages per channel (10 batches of 100)
- Large message histories may take time to sync initially
- Discord image links may expire, so download them promptly
- The bot cannot read deleted messages
- Rate limits apply to Discord API calls (handled automatically)

## API Usage

The integration uses Discord's REST API v10:

- Messages are fetched in batches of 100 per server/channel
- Pagination is used to fetch message history
- Multiple channels can be synced simultaneously
- Images are downloaded and stored locally
- API rate limits are respected
- Each server configuration is synced independently

## Technical Details

### Data Models (Version 2.0)

**DiscordConfig** (Global Configuration)

- `enabled`: Whether Discord integration is active globally
- `autoSync`: Whether to automatically sync messages
- `serverConfigs`: Array of individual server/channel configurations
- `botToken`, `guildId`, `channelId`, `lastSync`: Legacy fields (deprecated but preserved for migration)

**DiscordServerConfig** (Individual Server/Channel)

- `id`: Unique identifier for this configuration
- `name`: User-friendly name
- `botToken`: Discord bot authentication token (can be shared or unique per server)
- `guildId`: Discord server/guild ID (optional)
- `channelId`: Discord channel ID to monitor
- `enabled`: Whether this specific configuration is active
- `lastSync`: Timestamp of last successful sync for this channel
- `createdAt`, `updatedAt`: Timestamps for tracking

**DiscordMessage**

- `id`: Discord message ID
- `channelId`: Channel where message was sent
- `guildId`: Discord server/guild ID (optional)
- `serverConfigId`: Reference to the DiscordServerConfig that fetched this message
- `authorId`: Discord user ID of author
- `authorUsername`: Discord username of author
- `content`: Message text content
- `timestamp`: When the message was sent
- `characterId`: Linked character ID (if mapped)
- `extractedCharacterName`: Character name extracted from >[Name] format
- `imageUris`: Local URIs of downloaded images
- `attachments`: Original attachment metadata
- `createdAt`: When the message was stored locally
- `ignored`: Whether to ignore this message

**DiscordUserMapping** (Global)

- `discordUserId`: Discord user's unique ID
- `discordUsername`: Discord username for display
- `characterId`: Linked game character ID
- `createdAt`: When the mapping was created
- `updatedAt`: When the mapping was last updated

**DiscordCharacterAlias**

- `alias`: Nickname or shortened character name
- `characterId`: The character ID this alias maps to
- `discordUserId`: The Discord user who uses this alias
- `confidence`: Confidence level in the mapping (0-1)
- `usageCount`: Number of times this alias has been used
- `createdAt`, `updatedAt`: Timestamps

### Storage

All Discord data is stored using AsyncStorage with the following keys:

- `gameCharacterManager_discord_config`: Global Discord configuration with all server configs
- `gameCharacterManager_discord_mappings`: User to character mappings
- `gameCharacterManager_discord_messages`: All Discord messages from all servers
- `gameCharacterManager_discord_aliases`: Character aliases learned from messages

### API Integration

The Discord API integration (`src/utils/discordApi.ts`) provides:

- Bot token verification
- Channel access verification per server config
- Message fetching with pagination for specific channels
- Multi-server sync support
- Image downloading and storage
- Automatic sync coordination
- Per-server connection testing

### UI Components

**Server/Channel Management Screen** (`src/screens/discord/DiscordServerListScreen.tsx`)

- List all configured servers/channels
- Enable/disable individual configurations
- Test connections per server
- Sync individual or all servers
- Manage global settings

**Server Configuration Form** (`src/screens/discord/DiscordServerFormScreen.tsx`)

- Add new server/channel configurations
- Edit existing configurations
- Validate connection settings

**Discord Configuration Screen (Legacy)** (`src/screens/discord/DiscordConfigScreen.tsx`)

- Maintained for backward compatibility
- Syncs all enabled servers at once

**Discord Messages Screen** (`src/screens/discord/DiscordMessagesScreen.tsx`)

- View messages from all or specific servers/channels
- Filter by server/channel using dropdown
- Tag messages to characters
- Filter by tagged, untagged, or ignored messages
- Display server/channel source for each message

**Message Context Screen** (`src/screens/discord/DiscordMessageContextScreen.tsx`)

- View messages in conversation context
- Automatically filters to same server/channel as selected message
- Highlights the target message

**Character Name Mapping Screen** (`src/screens/discord/DiscordCharacterMappingScreen.tsx`)

- Manage Discord user to character mappings
- View existing mappings
- Add/remove mappings
- Mappings are global across all servers

## Support

For issues or questions:

- Check the troubleshooting section above
- Review Discord's bot documentation: https://discord.com/developers/docs
- Check MESSAGE CONTENT INTENT: https://support-dev.discord.com/hc/en-us/articles/4404772028055
- Open an issue on the GitHub repository

## Version History

**Version 2.0** (Current)

- Added multi-server/channel support
- Individual server configuration management
- Per-server sync control
- Server/channel filtering in message views
- Automatic migration from v1.0 single-server configs
- Improved context views with channel filtering

**Version 1.0**

- Initial Discord integration
- Single server/channel support
- Basic message syncing and character mapping
