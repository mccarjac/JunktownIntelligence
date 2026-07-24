import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { DiscordConfigScreen } from '@screens/discord/DiscordConfigScreen';
import * as discordStorage from '@utils/discordStorage';
import * as discordApi from '@utils/discordApi';
import { resetNavigationMocks } from '../../helpers/navigation';
import { spyOnAlert, pressAlertButton } from '../../helpers/alertAndPlatform';

jest.mock('@utils/discordStorage');
jest.mock('@utils/discordApi');

const storage = jest.mocked(discordStorage);
const api = jest.mocked(discordApi);

const primeDefaults = () => {
  storage.getDiscordConfig.mockResolvedValue({
    enabled: false,
    autoSync: true,
    serverConfigs: [],
  });
};

describe('DiscordConfigScreen', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    primeDefaults();
    alertSpy = spyOnAlert();
  });

  afterEach(() => {
    resetNavigationMocks();
    jest.restoreAllMocks();
  });

  it('loads and displays the existing config', async () => {
    storage.getDiscordConfig.mockResolvedValue({
      botToken: 'existing-token',
      guildId: 'guild-1',
      channelId: 'channel-1',
      enabled: true,
      autoSync: false,
      lastSync: '2026-01-01T00:00:00.000Z',
      serverConfigs: [],
    });

    const { getByDisplayValue, getByText } = render(<DiscordConfigScreen />);

    await waitFor(() => {
      expect(getByDisplayValue('guild-1')).toBeTruthy();
      expect(getByDisplayValue('channel-1')).toBeTruthy();
      expect(getByText('Enabled')).toBeTruthy();
    });
  });

  it('shows an error when testing without a token or channel', async () => {
    const { getByText } = render(<DiscordConfigScreen />);

    await waitFor(() => {
      expect(getByText('Test Connection')).toBeTruthy();
    });
    fireEvent.press(getByText('Test Connection'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Error',
        'Please enter bot token and channel ID',
        expect.any(Array)
      );
    });
    expect(api.testDiscordConnection).not.toHaveBeenCalled();
  });

  it('saves the config then tests the connection', async () => {
    storage.saveDiscordConfig.mockResolvedValue(undefined);
    api.testDiscordConnection.mockResolvedValue({ success: true });

    const { getByText, getByPlaceholderText } = render(<DiscordConfigScreen />);

    await waitFor(() => {
      expect(getByText('Test Connection')).toBeTruthy();
    });
    fireEvent.changeText(
      getByPlaceholderText('Enter Discord bot token'),
      'a-token'
    );
    fireEvent.changeText(
      getByPlaceholderText('Enter Discord channel ID'),
      'a-channel'
    );
    fireEvent.press(getByText('Test Connection'));

    await waitFor(() => {
      expect(storage.saveDiscordConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          botToken: 'a-token',
          channelId: 'a-channel',
        })
      );
      expect(alertSpy).toHaveBeenCalledWith(
        'Success',
        'Connection test successful!',
        expect.any(Array)
      );
    });
  });

  it('reports connection failure with the returned error', async () => {
    api.testDiscordConnection.mockResolvedValue({
      success: false,
      error: 'Bad token',
    });

    const { getByText, getByPlaceholderText } = render(<DiscordConfigScreen />);

    await waitFor(() => {
      expect(getByText('Test Connection')).toBeTruthy();
    });
    fireEvent.changeText(
      getByPlaceholderText('Enter Discord bot token'),
      'a-token'
    );
    fireEvent.changeText(
      getByPlaceholderText('Enter Discord channel ID'),
      'a-channel'
    );
    fireEvent.press(getByText('Test Connection'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Connection Failed',
        'Bad token',
        expect.any(Array)
      );
    });
  });

  it('syncs messages and reports the result', async () => {
    api.syncDiscordMessages.mockResolvedValue({
      newMessages: 3,
      totalMessages: 10,
      servers: 1,
    });

    const { getByText, getByPlaceholderText } = render(<DiscordConfigScreen />);

    await waitFor(() => {
      expect(getByText('Sync Messages Now')).toBeTruthy();
    });
    fireEvent.changeText(
      getByPlaceholderText('Enter Discord bot token'),
      'a-token'
    );
    fireEvent.changeText(
      getByPlaceholderText('Enter Discord channel ID'),
      'a-channel'
    );
    fireEvent.press(getByText('Sync Messages Now'));

    await waitFor(() => {
      expect(api.syncDiscordMessages).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith(
        'Sync Complete',
        expect.stringContaining('Synced 3 new messages'),
        expect.any(Array)
      );
    });
  });

  it('clears messages after confirmation', async () => {
    storage.clearDiscordMessages.mockResolvedValue(undefined);

    const { getByText } = render(<DiscordConfigScreen />);

    await waitFor(() => {
      expect(getByText('Clear All Messages')).toBeTruthy();
    });
    fireEvent.press(getByText('Clear All Messages'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });
    await pressAlertButton(alertSpy, 'Clear Messages');

    await waitFor(() => {
      expect(storage.clearDiscordMessages).toHaveBeenCalled();
    });
  });

  it('does not clear messages when the confirmation is cancelled', async () => {
    const { getByText } = render(<DiscordConfigScreen />);

    await waitFor(() => {
      expect(getByText('Clear All Messages')).toBeTruthy();
    });
    fireEvent.press(getByText('Clear All Messages'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });
    await pressAlertButton(alertSpy, 'Cancel');

    expect(storage.clearDiscordMessages).not.toHaveBeenCalled();
  });

  it('saves the configuration from the Save button', async () => {
    storage.saveDiscordConfig.mockResolvedValue(undefined);

    const { getByText } = render(<DiscordConfigScreen />);

    await waitFor(() => {
      expect(getByText('Save Configuration')).toBeTruthy();
    });
    fireEvent.press(getByText('Save Configuration'));

    await waitFor(() => {
      expect(storage.saveDiscordConfig).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith(
        'Success',
        'Discord configuration saved successfully',
        expect.any(Array)
      );
    });
  });
});
