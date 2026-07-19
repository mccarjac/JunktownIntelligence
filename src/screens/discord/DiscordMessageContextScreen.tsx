import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '@/navigation/types';
import { DiscordMessage } from '@/models/types';
import { getDiscordMessages } from '@/utils/discordStorage';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from '@/styles/theme';

type DiscordMessageContextRouteProp = RouteProp<
  RootStackParamList,
  'DiscordMessageContext'
>;

export const DiscordMessageContextScreen: React.FC = () => {
  const route = useRoute<DiscordMessageContextRouteProp>();
  const { messageId, characterId } = route.params;
  const [messages, setMessages] = useState<DiscordMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const highlightedMessageRef = useRef<View>(null);

  useEffect(() => {
    loadMessages();
  }, [characterId]);

  const loadMessages = async () => {
    try {
      const allMessages = await getDiscordMessages();

      // Filter messages to only show from the same channel/server as the target message
      const targetMessage = allMessages.find(m => m.id === messageId);

      let contextMessages = allMessages;
      if (targetMessage && targetMessage.serverConfigId) {
        // Show only messages from the same server/channel configuration
        contextMessages = allMessages.filter(
          m => m.serverConfigId === targetMessage.serverConfigId
        );
        console.log(
          `[DiscordMessageContext] Filtered to ${contextMessages.length} messages from same server config`
        );
      } else if (targetMessage && targetMessage.channelId) {
        // Fallback for legacy messages without serverConfigId: filter by channelId
        contextMessages = allMessages.filter(
          m => m.channelId === targetMessage.channelId
        );
        console.log(
          `[DiscordMessageContext] Filtered to ${contextMessages.length} messages from same channel (no serverConfigId)`
        );
      }

      // Sort by timestamp (oldest first for conversation context)
      const sorted = contextMessages.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      setMessages(sorted);
    } catch (error) {
      console.error('[DiscordMessageContext] Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Scroll to highlighted message after render
  useEffect(() => {
    if (!loading && messages.length > 0 && highlightedMessageRef.current) {
      // Small delay to ensure layout is complete
      setTimeout(() => {
        highlightedMessageRef.current?.measureLayout(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          scrollViewRef.current as any,
          (_x, y) => {
            scrollViewRef.current?.scrollTo({
              y: Math.max(0, y - 100),
              animated: true,
            });
          },
          () => {
            console.log('[DiscordMessageContext] Failed to measure layout');
          }
        );
      }, 100);
    }
  }, [loading, messages.length]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading conversation...</Text>
      </View>
    );
  }

  if (messages.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No messages found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {messages.map((msg, index) => {
        const isHighlighted = msg.id === messageId;
        return (
          <View
            key={msg.id || index}
            ref={isHighlighted ? highlightedMessageRef : null}
            style={[
              styles.messageContainer,
              isHighlighted && styles.highlightedMessage,
            ]}
          >
            <View style={styles.messageHeader}>
              <Text style={styles.authorName}>{msg.authorUsername}</Text>
              <Text style={styles.timestamp}>
                {new Date(msg.timestamp).toLocaleString()}
              </Text>
            </View>
            <Text style={styles.messageContent}>
              {msg.content || '[No content]'}
            </Text>
            {msg.imageUris && msg.imageUris.length > 0 && (
              <Text style={styles.imageIndicator}>
                📷 {msg.imageUris.length} image
                {msg.imageUris.length !== 1 ? 's' : ''}
              </Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  contentContainer: {
    padding: spacing.base,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  loadingText: {
    marginTop: spacing.base,
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
    padding: spacing.xxl,
  },
  emptyText: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  messageContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.base,
    padding: spacing.base,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.small,
  },
  highlightedMessage: {
    backgroundColor: colors.elevated,
    borderColor: colors.accent.warning,
    borderWidth: 2,
    ...shadows.large,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  authorName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.accent.primary,
  },
  timestamp: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
    fontWeight: typography.fontWeight.normal,
  },
  messageContent: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    lineHeight: typography.lineHeight.relaxed,
  },
  imageIndicator: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
});
