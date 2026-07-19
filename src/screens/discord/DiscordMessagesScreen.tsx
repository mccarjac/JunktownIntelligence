import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { colors as themeColors } from '@/styles/theme';
import type {
  DiscordMessage,
  GameCharacter,
  DiscordServerConfig,
} from '@models/types';
import {
  getDiscordMessages,
  getDiscordServerConfigs,
  saveDiscordMessages,
  applyAliasToMessages,
} from '@/utils/discordStorage';
import { loadCharacters } from '@/utils/characterStorage';
import { confirmCharacterMapping } from '@/utils/discordCharacterExtraction';

type FilterType = 'all' | 'untagged' | 'tagged' | 'ignored';

export const DiscordMessagesScreen: React.FC = () => {
  const [messages, setMessages] = useState<DiscordMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<DiscordMessage[]>(
    []
  );
  const [serverConfigs, setServerConfigs] = useState<DiscordServerConfig[]>([]);
  const [selectedServerConfigId, setSelectedServerConfigId] =
    useState<string>('all');
  const [characters, setCharacters] = useState<GameCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedMessage, setSelectedMessage] = useState<DiscordMessage | null>(
    null
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [msgs, chars, configs] = await Promise.all([
        getDiscordMessages(
          selectedServerConfigId === 'all' ? undefined : selectedServerConfigId
        ),
        loadCharacters(),
        getDiscordServerConfigs(),
      ]);

      console.log(`[Discord Messages Screen] Loaded ${msgs.length} messages`);
      if (msgs.length > 0) {
        console.log(
          `[Discord Messages Screen] Sample message:`,
          JSON.stringify({
            id: msgs[0].id,
            content: msgs[0].content?.substring(0, 100) || '(empty)',
            contentLength: msgs[0].content?.length || 0,
            contentType: typeof msgs[0].content,
            serverConfigId: msgs[0].serverConfigId,
          })
        );
      }

      // Sort messages by timestamp (newest first)
      const sortedMsgs = msgs.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setMessages(sortedMsgs);
      setCharacters(chars);
      setServerConfigs(configs);
      applyFilter(sortedMsgs, filter);
    } catch (error) {
      console.error('[Discord Messages Screen] Error loading data:', error);
      Alert.alert('Error', 'Failed to load Discord messages', [{ text: 'OK' }]);
    } finally {
      setLoading(false);
    }
  }, [filter, selectedServerConfigId]);

  const applyFilter = (msgs: DiscordMessage[], filterType: FilterType) => {
    let filtered = msgs;
    if (filterType === 'untagged') {
      filtered = msgs.filter(m => !m.characterId && !m.ignored);
    } else if (filterType === 'tagged') {
      filtered = msgs.filter(m => m.characterId && !m.ignored);
    } else if (filterType === 'ignored') {
      filtered = msgs.filter(m => m.ignored);
    } else {
      // 'all' - exclude ignored messages
      filtered = msgs.filter(m => !m.ignored);
    }
    setFilteredMessages(filtered);
  };

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    applyFilter(messages, newFilter);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const openMappingModal = (message: DiscordMessage) => {
    setSelectedMessage(message);
    setSelectedCharacterId(message.characterId || '');
    setModalVisible(true);
  };

  const handleSaveMapping = async () => {
    if (!selectedMessage || !selectedCharacterId) {
      Alert.alert('Error', 'Please select a character', [{ text: 'OK' }]);
      return;
    }

    setSaving(true);
    try {
      // Update the message with the selected character
      const updatedMessages = messages.map(m =>
        m.id === selectedMessage.id
          ? { ...m, characterId: selectedCharacterId }
          : m
      );
      await saveDiscordMessages(updatedMessages);

      // If there's an extracted character name, save it as an alias
      // and apply to ALL messages from this user with the same extracted name
      let bulkUpdateCount = 0;
      if (selectedMessage.extractedCharacterName) {
        console.log(
          `[Discord Messages] Creating alias: "${selectedMessage.extractedCharacterName}" -> ${selectedCharacterId}`
        );

        await confirmCharacterMapping(
          selectedMessage.extractedCharacterName,
          selectedCharacterId,
          selectedMessage.authorId
        );

        // Apply this mapping to all other messages with the same extracted name
        bulkUpdateCount = await applyAliasToMessages(
          selectedMessage.extractedCharacterName,
          selectedCharacterId,
          selectedMessage.authorId
        );

        console.log(
          `[Discord Messages] Bulk updated ${bulkUpdateCount} messages with same extracted name`
        );
      }

      setModalVisible(false);
      setSelectedMessage(null);
      setSelectedCharacterId('');
      await loadData();

      const message =
        bulkUpdateCount > 1
          ? `Character mapping saved and applied to ${bulkUpdateCount} messages`
          : 'Character mapping saved';

      Alert.alert('Success', message, [{ text: 'OK' }]);
    } catch (error) {
      Alert.alert(`Error: ${error}`, 'Failed to save character mapping', [
        { text: 'OK' },
      ]);
    } finally {
      setSaving(false);
    }
  };

  const handleIgnoreMessage = async (message: DiscordMessage) => {
    const newIgnoredState = !message.ignored;
    const actionText = newIgnoredState ? 'ignore' : 'unignore';

    Alert.alert(
      `${newIgnoredState ? 'Ignore' : 'Unignore'} Message`,
      `Are you sure you want to ${actionText} this message? ${
        newIgnoredState
          ? 'Ignored messages will not appear in the main message list.'
          : 'This message will appear in the main message list again.'
      }`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: newIgnoredState ? 'Ignore' : 'Unignore',
          onPress: async () => {
            try {
              const updatedMessages = messages.map(m =>
                m.id === message.id ? { ...m, ignored: newIgnoredState } : m
              );
              await saveDiscordMessages(updatedMessages);
              await loadData();
              Alert.alert(
                'Success',
                `Message ${newIgnoredState ? 'ignored' : 'unignored'} successfully`,
                [{ text: 'OK' }]
              );
            } catch {
              Alert.alert('Error', `Failed to ${actionText} message`, [
                { text: 'OK' },
              ]);
            }
          },
        },
      ]
    );
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getCharacterName = (characterId: string | undefined) => {
    if (!characterId) return 'Untagged';
    const character = characters.find(c => c.id === characterId);
    return character?.name || 'Unknown Character';
  };

  const renderMessage = ({ item }: { item: DiscordMessage }) => {
    const characterName = getCharacterName(item.characterId);
    const isUntagged = !item.characterId;
    const isIgnored = item.ignored;
    const serverConfig = serverConfigs.find(
      sc => sc.id === item.serverConfigId
    );

    return (
      <View
        style={[
          styles.messageCard,
          isUntagged && styles.untaggedCard,
          isIgnored && styles.ignoredCard,
        ]}
      >
        <TouchableOpacity
          onPress={() => openMappingModal(item)}
          activeOpacity={0.7}
        >
          {/* Server/Channel indicator */}
          {serverConfig && (
            <View style={styles.serverIndicator}>
              <Text style={styles.serverIndicatorText}>
                📡 {serverConfig.name}
              </Text>
            </View>
          )}

          <View style={styles.messageHeader}>
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>{item.authorUsername}</Text>
              <Text style={styles.discordId}>ID: {item.authorId}</Text>
            </View>
            <View style={styles.tagInfo}>
              {isIgnored ? (
                <View style={styles.ignoredBadge}>
                  <Text style={styles.ignoredBadgeText}>IGNORED</Text>
                </View>
              ) : isUntagged ? (
                <View style={styles.untaggedBadge}>
                  <Text style={styles.untaggedBadgeText}>UNTAGGED</Text>
                </View>
              ) : (
                <View style={styles.taggedBadge}>
                  <Text style={styles.taggedBadgeText}>{characterName}</Text>
                </View>
              )}
            </View>
          </View>

          {item.extractedCharacterName && (
            <View style={styles.extractedNameContainer}>
              <Text style={styles.extractedNameLabel}>Extracted Name:</Text>
              <Text style={styles.extractedName}>
                {item.extractedCharacterName}
              </Text>
            </View>
          )}

          <Text style={styles.messageContent} numberOfLines={4}>
            {item.content ? item.content : '[No text content]'}
          </Text>

          {item.imageUris && item.imageUris.length > 0 && (
            <View style={styles.imagesContainer}>
              <Text style={styles.imagesLabel}>
                📷 {item.imageUris.length} image(s)
              </Text>
            </View>
          )}

          <Text style={styles.timestamp}>
            {formatTimestamp(item.timestamp)}
          </Text>
        </TouchableOpacity>

        {/* Ignore/Unignore Button */}
        <TouchableOpacity
          style={styles.ignoreButton}
          onPress={e => {
            e.stopPropagation();
            handleIgnoreMessage(item);
          }}
        >
          <Text style={styles.ignoreButtonText}>
            {isIgnored ? '↻ Unignore' : '✕ Ignore'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderMappingModal = () => {
    if (!selectedMessage) return null;

    return (
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>Link Message to Character</Text>

              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Discord User:</Text>
                <Text style={styles.modalValue}>
                  {selectedMessage.authorUsername}
                </Text>
                <Text style={styles.modalSubValue}>
                  ID: {selectedMessage.authorId}
                </Text>
              </View>

              {selectedMessage.extractedCharacterName && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Extracted Name:</Text>
                  <Text style={styles.modalValue}>
                    {selectedMessage.extractedCharacterName}
                  </Text>
                </View>
              )}

              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Message Preview:</Text>
                <Text style={styles.modalValue} numberOfLines={5}>
                  {selectedMessage.content
                    ? selectedMessage.content
                    : '[No text content - may have attachments only]'}
                </Text>
              </View>

              {selectedMessage.imageUris &&
                selectedMessage.imageUris.length > 0 && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Images:</Text>
                    <ScrollView horizontal style={styles.imageScroll}>
                      {selectedMessage.imageUris.map((uri, index) => (
                        <Image
                          key={index}
                          source={{ uri }}
                          style={styles.thumbnailImage}
                          resizeMode="cover"
                        />
                      ))}
                    </ScrollView>
                  </View>
                )}

              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>
                  Select Character <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={selectedCharacterId}
                    onValueChange={setSelectedCharacterId}
                    style={styles.picker}
                    dropdownIconColor={'#FFFFFF'}
                  >
                    <Picker.Item label="Select a character" value="" />
                    {characters.map(char => (
                      <Picker.Item
                        key={char.id}
                        label={char.name}
                        value={char.id}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setModalVisible(false);
                    setSelectedMessage(null);
                    setSelectedCharacterId('');
                  }}
                  disabled={saving}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.saveButton,
                    saving && styles.buttonDisabled,
                  ]}
                  onPress={handleSaveMapping}
                  disabled={saving || !selectedCharacterId}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={themeColors.accent.primary} />
        <Text style={styles.loadingText}>Loading Discord messages...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Discord Messages</Text>
        <Text style={styles.subtitle}>{messages.length} total messages</Text>
      </View>

      {/* Server/Channel Filter */}
      {serverConfigs.length > 0 && (
        <View style={styles.serverFilterContainer}>
          <Text style={styles.serverFilterLabel}>Server/Channel:</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedServerConfigId}
              onValueChange={value => setSelectedServerConfigId(value)}
              style={styles.picker}
              dropdownIconColor={'#FFFFFF'}
            >
              <Picker.Item label="All Servers/Channels" value="all" />
              {serverConfigs.map(config => (
                <Picker.Item
                  key={config.id}
                  label={config.name}
                  value={config.id}
                />
              ))}
            </Picker>
          </View>
        </View>
      )}

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.activeFilter]}
          onPress={() => handleFilterChange('all')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'all' && styles.activeFilterText,
            ]}
          >
            All ({messages.filter(m => !m.ignored).length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'untagged' && styles.activeFilter,
          ]}
          onPress={() => handleFilterChange('untagged')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'untagged' && styles.activeFilterText,
            ]}
          >
            Untagged (
            {messages.filter(m => !m.characterId && !m.ignored).length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'tagged' && styles.activeFilter,
          ]}
          onPress={() => handleFilterChange('tagged')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'tagged' && styles.activeFilterText,
            ]}
          >
            Tagged ({messages.filter(m => m.characterId && !m.ignored).length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'ignored' && styles.activeFilter,
          ]}
          onPress={() => handleFilterChange('ignored')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'ignored' && styles.activeFilterText,
            ]}
          >
            Ignored ({messages.filter(m => m.ignored).length})
          </Text>
        </TouchableOpacity>
      </View>

      {filteredMessages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No {filter === 'all' ? '' : filter} messages found
          </Text>
          {filter === 'untagged' && messages.length > 0 && (
            <Text style={styles.emptySubtext}>
              All messages have been tagged to characters!
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredMessages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}

      {renderMappingModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.primary,
  },
  centerContainer: {
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
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
    backgroundColor: themeColors.surface,
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
  serverFilterContainer: {
    backgroundColor: themeColors.surface,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  serverFilterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.text.primary,
    marginBottom: 8,
  },
  serverIndicator: {
    backgroundColor: themeColors.elevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  serverIndicatorText: {
    fontSize: 11,
    color: themeColors.text.secondary,
    fontWeight: '500',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: themeColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  filterButton: {
    flex: 1,
    padding: 10,
    marginHorizontal: 4,
    borderRadius: 6,
    backgroundColor: themeColors.elevated,
    alignItems: 'center',
  },
  activeFilter: {
    backgroundColor: themeColors.accent.primary,
  },
  filterText: {
    fontSize: 14,
    color: themeColors.text.secondary,
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
  },
  messageCard: {
    backgroundColor: themeColors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  untaggedCard: {
    borderLeftWidth: 4,
    borderLeftColor: themeColors.accent.warning,
  },
  ignoredCard: {
    borderLeftWidth: 4,
    borderLeftColor: themeColors.text.muted,
    opacity: 0.6,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.text.primary,
    marginBottom: 2,
  },
  discordId: {
    fontSize: 11,
    color: themeColors.text.muted,
    fontFamily: 'monospace',
  },
  tagInfo: {
    marginLeft: 8,
  },
  untaggedBadge: {
    backgroundColor: themeColors.accent.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  untaggedBadgeText: {
    color: themeColors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  taggedBadge: {
    backgroundColor: themeColors.accent.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  taggedBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  ignoredBadge: {
    backgroundColor: themeColors.text.muted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  ignoredBadgeText: {
    color: themeColors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  extractedNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: themeColors.elevated,
    borderRadius: 4,
  },
  extractedNameLabel: {
    fontSize: 12,
    color: themeColors.text.secondary,
    marginRight: 8,
  },
  extractedName: {
    fontSize: 13,
    fontWeight: '600',
    color: themeColors.accent.primary,
  },
  messageContent: {
    fontSize: 14,
    color: themeColors.text.primary,
    lineHeight: 20,
    marginBottom: 8,
  },
  imagesContainer: {
    marginBottom: 8,
  },
  imagesLabel: {
    fontSize: 12,
    color: themeColors.text.secondary,
  },
  timestamp: {
    fontSize: 11,
    color: themeColors.text.muted,
    marginTop: 4,
  },
  ignoreButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: themeColors.elevated,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: themeColors.border,
    alignSelf: 'flex-start',
  },
  ignoreButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: themeColors.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: themeColors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: themeColors.text.secondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: themeColors.surface,
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: themeColors.text.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalSection: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.text.primary,
    marginBottom: 8,
  },
  required: {
    color: themeColors.accent.danger,
  },
  modalValue: {
    fontSize: 14,
    color: themeColors.text.secondary,
    lineHeight: 20,
  },
  modalSubValue: {
    fontSize: 11,
    color: themeColors.text.muted,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  imageScroll: {
    marginTop: 8,
  },
  thumbnailImage: {
    width: 80,
    height: 80,
    borderRadius: 6,
    marginRight: 8,
    backgroundColor: themeColors.elevated,
  },
  pickerWrapper: {
    backgroundColor: themeColors.elevated,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    color: themeColors.text.primary,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: themeColors.elevated,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  cancelButtonText: {
    color: themeColors.text.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: themeColors.accent.primary,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
