import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/navigation/types';
import { colors as themeColors } from '@/styles/theme';
import { DiscordServerConfig } from '@models/types';
import {
  getDiscordServerConfigs,
  removeDiscordServerConfig,
  updateDiscordServerConfig,
  getDiscordConfig,
  saveDiscordConfig,
} from '@/utils/discordStorage';
import {
  testDiscordConnection,
  syncDiscordMessagesForServer,
} from '@/utils/discordApi';

type NavigationProp = StackNavigationProp<RootStackParamList>;

export const DiscordServerListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [serverConfigs, setServerConfigs] = useState<DiscordServerConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalEnabled, setGlobalEnabled] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [syncingServerId, setSyncingServerId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [configs, globalConfig] = await Promise.all([
        getDiscordServerConfigs(),
        getDiscordConfig(),
      ]);
      setServerConfigs(configs);
      setGlobalEnabled(globalConfig.enabled);
      setAutoSync(globalConfig.autoSync);
    } catch (error) {
      console.error('[Discord Server List] Error loading data:', error);
      Alert.alert('Error', 'Failed to load server configurations', [
        { text: 'OK' },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleGlobalToggle = async (value: boolean) => {
    try {
      const config = await getDiscordConfig();
      config.enabled = value;
      await saveDiscordConfig(config);
      setGlobalEnabled(value);
    } catch {
      Alert.alert('Error', 'Failed to update Discord integration status', [
        { text: 'OK' },
      ]);
    }
  };

  const handleAutoSyncToggle = async (value: boolean) => {
    try {
      const config = await getDiscordConfig();
      config.autoSync = value;
      await saveDiscordConfig(config);
      setAutoSync(value);
    } catch {
      Alert.alert('Error', 'Failed to update auto-sync status', [
        { text: 'OK' },
      ]);
    }
  };

  const handleServerToggle = async (serverId: string, value: boolean) => {
    try {
      await updateDiscordServerConfig(serverId, { enabled: value });
      await loadData();
    } catch {
      Alert.alert('Error', 'Failed to update server configuration', [
        { text: 'OK' },
      ]);
    }
  };

  const handleTestConnection = async (serverId: string, serverName: string) => {
    try {
      const result = await testDiscordConnection(serverId);
      if (result.success) {
        Alert.alert(
          'Success',
          `Connection test successful for ${serverName}!`,
          [{ text: 'OK' }]
        );
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
    }
  };

  const handleSyncServer = async (serverId: string, serverName: string) => {
    setSyncingServerId(serverId);
    try {
      const result = await syncDiscordMessagesForServer(serverId);
      Alert.alert(
        'Sync Complete',
        `Synced ${result.newMessages} new messages from ${serverName}.\nTotal messages: ${result.totalMessages}`,
        [{ text: 'OK' }]
      );
      await loadData();
    } catch (error) {
      Alert.alert(
        'Sync Failed',
        error instanceof Error ? error.message : 'Unknown error',
        [{ text: 'OK' }]
      );
    } finally {
      setSyncingServerId(null);
    }
  };

  const handleDeleteServer = async (serverId: string, serverName: string) => {
    Alert.alert(
      'Delete Server Configuration?',
      `Are you sure you want to delete "${serverName}"? Messages from this server will remain stored but won't be synced anymore.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeDiscordServerConfig(serverId);
              await loadData();
              Alert.alert('Success', 'Server configuration deleted', [
                { text: 'OK' },
              ]);
            } catch {
              Alert.alert('Error', 'Failed to delete server configuration', [
                { text: 'OK' },
              ]);
            }
          },
        },
      ]
    );
  };

  const renderServerCard = ({ item }: { item: DiscordServerConfig }) => {
    const isSyncing = syncingServerId === item.id;
    const lastSyncText = item.lastSync
      ? new Date(item.lastSync).toLocaleString()
      : 'Never';

    return (
      <View style={styles.serverCard}>
        <View style={styles.serverHeader}>
          <Text style={styles.serverName}>{item.name}</Text>
          <Switch
            value={item.enabled}
            onValueChange={value => handleServerToggle(item.id, value)}
            trackColor={{
              false: themeColors.border,
              true: themeColors.accent.primary,
            }}
            thumbColor={themeColors.primary}
          />
        </View>

        <View style={styles.serverDetails}>
          <Text style={styles.detailLabel}>Channel ID:</Text>
          <Text style={styles.detailValue}>{item.channelId}</Text>
        </View>

        {item.guildId && (
          <View style={styles.serverDetails}>
            <Text style={styles.detailLabel}>Server ID:</Text>
            <Text style={styles.detailValue}>{item.guildId}</Text>
          </View>
        )}

        <View style={styles.serverDetails}>
          <Text style={styles.detailLabel}>Last Sync:</Text>
          <Text style={styles.detailValue}>{lastSyncText}</Text>
        </View>

        <View style={styles.serverActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() =>
              navigation.navigate('DiscordServerForm', {
                serverConfigId: item.id,
              })
            }
          >
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.testButton]}
            onPress={() => handleTestConnection(item.id, item.name)}
          >
            <Text style={styles.actionButtonText}>Test</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.syncButton,
              isSyncing && styles.actionButtonDisabled,
            ]}
            onPress={() => handleSyncServer(item.id, item.name)}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color={themeColors.primary} />
            ) : (
              <Text style={styles.actionButtonText}>Sync</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteServer(item.id, item.name)}
          >
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.accent.primary} />
        <Text style={styles.loadingText}>Loading server configurations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Discord Servers</Text>
        <Text style={styles.subtitle}>
          Manage multiple Discord server/channel configurations
        </Text>
      </View>

      <View style={styles.globalSettings}>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Discord Integration</Text>
          <Switch
            value={globalEnabled}
            onValueChange={handleGlobalToggle}
            trackColor={{
              false: themeColors.border,
              true: themeColors.accent.primary,
            }}
            thumbColor={themeColors.primary}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Auto-sync when online</Text>
          <Switch
            value={autoSync}
            onValueChange={handleAutoSyncToggle}
            trackColor={{
              false: themeColors.border,
              true: themeColors.accent.primary,
            }}
            thumbColor={themeColors.primary}
          />
        </View>
      </View>

      {serverConfigs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No server configurations yet</Text>
          <Text style={styles.emptySubtext}>
            Add a server/channel to start syncing Discord messages
          </Text>
        </View>
      ) : (
        <FlatList
          data={serverConfigs}
          renderItem={renderServerCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            navigation.navigate('DiscordServerForm', {});
          }}
        >
          <Text style={styles.addButtonText}>+ Add Server/Channel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: themeColors.primary,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: themeColors.text.secondary,
  },
  header: {
    padding: 16,
    backgroundColor: themeColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: themeColors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: themeColors.text.secondary,
  },
  globalSettings: {
    backgroundColor: themeColors.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: themeColors.text.primary,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
  },
  serverCard: {
    backgroundColor: themeColors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  serverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  serverName: {
    fontSize: 18,
    fontWeight: '600',
    color: themeColors.text.primary,
    flex: 1,
  },
  serverDetails: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: themeColors.text.secondary,
    width: 100,
  },
  detailValue: {
    fontSize: 14,
    color: themeColors.text.primary,
    fontFamily: 'monospace',
    flex: 1,
  },
  serverActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: themeColors.elevated,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  testButton: {
    backgroundColor: themeColors.accent.primary,
  },
  syncButton: {
    backgroundColor: themeColors.accent.success,
  },
  deleteButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: themeColors.accent.danger,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: themeColors.accent.danger,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: themeColors.text.primary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: themeColors.text.secondary,
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    backgroundColor: themeColors.surface,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  addButton: {
    backgroundColor: themeColors.accent.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
