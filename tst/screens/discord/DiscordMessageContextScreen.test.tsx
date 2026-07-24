import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { DiscordMessageContextScreen } from '@screens/discord/DiscordMessageContextScreen';
import * as discordStorage from '@utils/discordStorage';
import {
  installRouteParams,
  resetNavigationMocks,
} from '../../helpers/navigation';
import { makeDiscordMessage } from '../../helpers/factories';

jest.mock('@utils/discordStorage');

const storage = jest.mocked(discordStorage);

describe('DiscordMessageContextScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    resetNavigationMocks();
  });

  it('renders an empty state when there are no messages', async () => {
    installRouteParams({ messageId: 'message-1' });
    storage.getDiscordMessages.mockResolvedValue([]);

    const { getByText } = render(<DiscordMessageContextScreen />);

    await waitFor(() => {
      expect(getByText('No messages found')).toBeTruthy();
    });
  });

  it('filters to messages from the same server config as the target message', async () => {
    installRouteParams({ messageId: 'message-1' });
    storage.getDiscordMessages.mockResolvedValue([
      makeDiscordMessage({
        id: 'message-1',
        serverConfigId: 'server-1',
        authorUsername: 'Alice',
        content: 'Hello there',
        timestamp: '2026-01-01T00:00:00.000Z',
      }),
      makeDiscordMessage({
        id: 'message-2',
        serverConfigId: 'server-1',
        authorUsername: 'Bob',
        content: 'Same server',
        timestamp: '2026-01-01T00:01:00.000Z',
      }),
      makeDiscordMessage({
        id: 'message-3',
        serverConfigId: 'server-2',
        authorUsername: 'Carl',
        content: 'Different server',
        timestamp: '2026-01-01T00:02:00.000Z',
      }),
    ]);

    const { getByText, queryByText } = render(<DiscordMessageContextScreen />);

    await waitFor(() => {
      expect(getByText('Hello there')).toBeTruthy();
      expect(getByText('Same server')).toBeTruthy();
    });
    expect(queryByText('Different server')).toBeNull();
  });

  it('falls back to filtering by channelId for legacy messages without serverConfigId', async () => {
    installRouteParams({ messageId: 'message-1' });
    storage.getDiscordMessages.mockResolvedValue([
      makeDiscordMessage({
        id: 'message-1',
        channelId: 'channel-1',
        content: 'Legacy target',
      }),
      makeDiscordMessage({
        id: 'message-2',
        channelId: 'channel-1',
        content: 'Same legacy channel',
      }),
      makeDiscordMessage({
        id: 'message-3',
        channelId: 'channel-2',
        content: 'Other channel',
      }),
    ]);

    const { getByText, queryByText } = render(<DiscordMessageContextScreen />);

    await waitFor(() => {
      expect(getByText('Legacy target')).toBeTruthy();
      expect(getByText('Same legacy channel')).toBeTruthy();
    });
    expect(queryByText('Other channel')).toBeNull();
  });

  it('sorts messages oldest first', async () => {
    installRouteParams({ messageId: 'message-1' });
    storage.getDiscordMessages.mockResolvedValue([
      makeDiscordMessage({
        id: 'message-1',
        serverConfigId: 'server-1',
        authorUsername: 'Newer',
        content: 'Newer message',
        timestamp: '2026-01-01T00:05:00.000Z',
      }),
      makeDiscordMessage({
        id: 'message-2',
        serverConfigId: 'server-1',
        authorUsername: 'Older',
        content: 'Older message',
        timestamp: '2026-01-01T00:00:00.000Z',
      }),
    ]);

    const { getByText } = render(<DiscordMessageContextScreen />);

    await waitFor(() => {
      expect(getByText('Older message')).toBeTruthy();
      expect(getByText('Newer message')).toBeTruthy();
    });
  });

  it('shows an image indicator when a message has attached images', async () => {
    installRouteParams({ messageId: 'message-1' });
    storage.getDiscordMessages.mockResolvedValue([
      makeDiscordMessage({
        id: 'message-1',
        content: 'Look at this',
        imageUris: ['file://one.jpg', 'file://two.jpg'],
      }),
    ]);

    const { getByText } = render(<DiscordMessageContextScreen />);

    await waitFor(() => {
      expect(getByText('📷 2 images')).toBeTruthy();
    });
  });
});
