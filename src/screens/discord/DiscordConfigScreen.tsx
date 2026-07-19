import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Switch,
} from 'react-native';
import { colors as themeColors } from '@/styles/theme';
import {
  getDiscordConfig,
  saveDiscordConfig,
  clearDiscordMessages,
} from '@/utils/discordStorage';
import { testDiscordConnection, syncDiscordMessages } from '@/utils/discordApi';
import { DiscordServerConfig } from '@models/types';

export const DiscordConfigScreen: React.FC = () => {
  const [botToken, setBotToken] = useState('');
  const [guildId, setGuildId] = useState('');
  const [channelId, setChannelId] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [lastSync, setLastSync] = useState<string | undefined>();
  // Preserve any existing multi-server configs so saving the legacy fields
  // on this screen doesn't wipe them out.
  const [serverConfigs, setServerConfigs] = useState<DiscordServerConfig[]>([]);

  // Load existing config on mount
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const config = await getDiscordConfig();
    setBotToken(config.botToken || '');
    setGuildId(config.guildId || '');
    setChannelId(config.channelId || '');
    setEnabled(config.enabled);
    setAutoSync(config.autoSync);
    setLastSync(config.lastSync);
    setServerConfigs(config.serverConfigs || []);
  };

  const handleSave = async () => {
    try {
      await saveDiscordConfig({
        botToken: botToken.trim(),
        guildId: guildId.trim(),
        channelId: channelId.trim(),
        enabled,
        autoSync,
        lastSync,
        serverConfigs,
      });
      Alert.alert('Success', 'Discord configuration saved successfully', [
        { text: 'OK' },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to save Discord configuration', [
        { text: 'OK' },
      ]);
    }
  };

  const handleTestConnection = async () => {
    if (!botToken.trim() || !channelId.trim()) {
      Alert.alert('Error', 'Please enter bot token and channel ID', [
        { text: 'OK' },
      ]);
      return;
    }

    setTesting(true);
    try {
      // Save config first
      await saveDiscordConfig({
        botToken: botToken.trim(),
        guildId: guildId.trim(),
        channelId: channelId.trim(),
        enabled,
        autoSync,
        lastSync,
        serverConfigs,
      });

      const result = await testDiscordConnection();
      if (result.success) {
        Alert.alert('Success', 'Connection test successful!', [{ text: 'OK' }]);
      } else {
        Alert.alert('Connection Failed', result.error || 'Unknown error', [
          { text: 'OK' },
        ]);
      }
    } catch (error) {
      Alert.alert(
        'Connection Failed',
        error instanceof Error ? error.message : 'Unknown error',
        [{ text: 'OK' }]
      );
    } finally {
      setTesting(false);
    }
  };

  const handleSyncNow = async () => {
    if (!botToken.trim() || !channelId.trim()) {
      Alert.alert(
        'Error',
        'Please configure Discord settings and test connection first',
        [{ text: 'OK' }]
      );
      return;
    }

    setSyncing(true);
    setSyncStatus('Starting sync...');
    try {
      console.log('[Discord Config] Starting message sync...');
      const result = await syncDiscordMessages(status => {
        console.log(`[Discord Sync Progress] ${status}`);
        setSyncStatus(status);
      });

      const config = await getDiscordConfig();
      setLastSync(config.lastSync);

      console.log(
        `[Discord Config] Sync complete: ${result.newMessages} new, ${result.totalMessages} total`
      );
      Alert.alert(
        'Sync Complete',
        `Synced ${result.newMessages} new messages.\nTotal messages: ${result.totalMessages}\n\nCheck console logs for content details.`,
        [{ text: 'OK' }]
      );
      setSyncStatus('');
    } catch (error) {
      console.error('[Discord Config] Sync error:', error);
      Alert.alert(
        'Sync Failed',
        error instanceof Error ? error.message : 'Unknown error',
        [{ text: 'OK' }]
      );
      setSyncStatus('');
    } finally {
      setSyncing(false);
    }
  };

  const handleClearMessages = async () => {
    Alert.alert(
      'Clear All Messages?',
      'This will delete all synced Discord messages. You can re-sync to fetch them again. This is useful if messages were synced before enabling MESSAGE_CONTENT intent.\n\nContinue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Messages',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearDiscordMessages();
              Alert.alert(
                'Messages Cleared',
                'All Discord messages have been deleted. Use "Sync Messages Now" to fetch them again.',
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('[Discord Config] Clear messages error:', error);
              Alert.alert(
                'Error',
                'Failed to clear messages: ' +
                  (error instanceof Error ? error.message : 'Unknown error'),
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  };

  const formatLastSync = () => {
    if (!lastSync) return 'Never';
    const date = new Date(lastSync);
    return date.toLocaleString();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.header}>Discord Integration Setup</Text>
        <Text style={styles.description}>
          Connect to a Discord channel to automatically import and monitor
          messages. You'll need a Discord bot token with read permissions.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Configuration</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bot Token *</Text>
            <TextInput
              style={styles.input}
              value={botToken}
              onChangeText={setBotToken}
              placeholder="Enter Discord bot token"
              placeholderTextColor={themeColors.text.secondary}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Guild/Server ID</Text>
            <TextInput
              style={styles.input}
              value={guildId}
              onChangeText={setGuildId}
              placeholder="Optional: Discord server ID"
              placeholderTextColor={themeColors.text.secondary}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Channel ID *</Text>
            <TextInput
              style={styles.input}
              value={channelId}
              onChangeText={setChannelId}
              placeholder="Enter Discord channel ID"
              placeholderTextColor={themeColors.text.secondary}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.label}>Enable Discord Integration</Text>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{
                false: themeColors.border,
                true: themeColors.primary,
              }}
              thumbColor={themeColors.primary}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.label}>Auto-sync when online</Text>
            <Switch
              value={autoSync}
              onValueChange={setAutoSync}
              trackColor={{
                false: themeColors.border,
                true: themeColors.primary,
              }}
              thumbColor={themeColors.primary}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Actions</Text>

          <TouchableOpacity
            style={[styles.button, testing && styles.buttonDisabled]}
            onPress={handleTestConnection}
            disabled={testing}
          >
            {testing ? (
              <ActivityIndicator color={themeColors.primary} />
            ) : (
              <Text style={styles.buttonText}>Test Connection</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.buttonSecondary,
              syncing && styles.buttonDisabled,
            ]}
            onPress={handleSyncNow}
            disabled={syncing}
          >
            {syncing ? (
              <ActivityIndicator color={themeColors.primary} />
            ) : (
              <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
                Sync Messages Now
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonDanger]}
            onPress={handleClearMessages}
          >
            <Text style={[styles.buttonText, styles.buttonTextDanger]}>
              Clear All Messages
            </Text>
          </TouchableOpacity>

          {syncStatus && (
            <View style={styles.syncStatusContainer}>
              <Text style={styles.syncStatus}>{syncStatus}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={handleSave}
          >
            <Text style={styles.buttonText}>Save Configuration</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Status</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Last Sync:</Text>
            <Text style={styles.statusValue}>{formatLastSync()}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Integration Status:</Text>
            <Text
              style={[
                styles.statusValue,
                enabled ? styles.statusEnabled : styles.statusDisabled,
              ]}
            >
              {enabled ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
        </View>

        <View style={styles.helpSection}>
          <Text style={styles.helpHeader}>Setup Instructions:</Text>
          <Text style={styles.helpText}>
            1. Create a Discord bot at discord.com/developers{'\n'}
            2. Copy the bot token and paste it above{'\n'}
            3. Enable developer mode in Discord settings{'\n'}
            4. Right-click your server and copy the Server ID{'\n'}
            5. Right-click the channel and copy the Channel ID{'\n'}
            6. Invite the bot to your server with read permissions{'\n'}
            7. Test the connection and sync messages
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.primary,
  },
  content: {
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: themeColors.text.primary,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: themeColors.text.secondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: themeColors.text.primary,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: themeColors.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: themeColors.text.primary,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: themeColors.accent.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonPrimary: {
    backgroundColor: themeColors.accent.primary,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: themeColors.accent.primary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: themeColors.accent.primary,
  },
  buttonDanger: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  buttonTextDanger: {
    color: '#F44336',
  },
  syncStatusContainer: {
    padding: 12,
    backgroundColor: themeColors.surface,
    borderRadius: 8,
    marginBottom: 12,
  },
  syncStatus: {
    color: themeColors.text.primary,
    fontSize: 14,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: themeColors.text.secondary,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
    color: themeColors.text.primary,
  },
  statusEnabled: {
    color: '#4CAF50',
  },
  statusDisabled: {
    color: '#F44336',
  },
  helpSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: themeColors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  helpHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.text.primary,
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    color: themeColors.text.secondary,
    lineHeight: 20,
  },
});
