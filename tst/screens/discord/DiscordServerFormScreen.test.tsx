import React from 'react';
import {
  render,
  waitFor,
  fireEvent,
  type RenderResult,
} from '@testing-library/react-native';
import { DiscordServerFormScreen } from '@screens/discord/DiscordServerFormScreen';
import * as discordStorage from '@utils/discordStorage';
import * as discordApi from '@utils/discordApi';
import {
  installNavigationMock,
  installRouteParams,
  resetNavigationMocks,
} from '../../helpers/navigation';
import { spyOnAlert, pressAlertButton } from '../../helpers/alertAndPlatform';
import { makeDiscordServerConfig } from '../../helpers/factories';

jest.mock('@utils/discordStorage');
jest.mock('@utils/discordApi');

const storage = jest.mocked(discordStorage);
const api = jest.mocked(discordApi);

const fillRequiredFields = (
  getByPlaceholderText: RenderResult['getByPlaceholderText']
) => {
  fireEvent.changeText(
    getByPlaceholderText('e.g., Main RP Server - IC Chat'),
    'Main RP Server'
  );
  fireEvent.changeText(
    getByPlaceholderText('Enter Discord bot token'),
    'bot-token-123'
  );
  fireEvent.changeText(
    getByPlaceholderText('Enter Discord channel ID'),
    'channel-123'
  );
};

describe('DiscordServerFormScreen', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    installNavigationMock();
    installRouteParams({});
    alertSpy = spyOnAlert();
  });

  afterEach(() => {
    resetNavigationMocks();
    jest.restoreAllMocks();
  });

  it('shows the create action when adding a new server', async () => {
    const { getByText } = render(<DiscordServerFormScreen />);

    await waitFor(() => {
      expect(getByText('Add Server Configuration')).toBeTruthy();
      expect(getByText('Save Configuration')).toBeTruthy();
    });
  });

  it('shows a validation error instead of saving an incomplete form', async () => {
    const { getByText } = render(<DiscordServerFormScreen />);

    await waitFor(() => {
      expect(getByText('Save Configuration')).toBeTruthy();
    });
    fireEvent.press(getByText('Save Configuration'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Error',
        'Please enter a name for this configuration',
        expect.any(Array)
      );
    });
    expect(storage.addDiscordServerConfig).not.toHaveBeenCalled();
  });

  it('adds a new server configuration and navigates back on success', async () => {
    storage.addDiscordServerConfig.mockResolvedValue(makeDiscordServerConfig());
    const nav = installNavigationMock();

    const { getByText, getByPlaceholderText } = render(
      <DiscordServerFormScreen />
    );

    await waitFor(() => {
      expect(getByText('Save Configuration')).toBeTruthy();
    });
    fillRequiredFields(getByPlaceholderText);
    fireEvent.press(getByText('Save Configuration'));

    await waitFor(() => {
      expect(storage.addDiscordServerConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Main RP Server',
          botToken: 'bot-token-123',
          channelId: 'channel-123',
        })
      );
      expect(alertSpy).toHaveBeenCalledWith(
        'Success',
        'Server configuration added successfully',
        expect.any(Array)
      );
    });
    await pressAlertButton(alertSpy, 'OK');

    expect(nav.goBack).toHaveBeenCalled();
  });

  it('prefills existing data and updates instead of creating', async () => {
    installRouteParams({ serverConfigId: 'server-99' });
    storage.getDiscordServerConfig.mockResolvedValue(
      makeDiscordServerConfig({
        id: 'server-99',
        name: 'Existing Server',
        botToken: 'existing-token',
        channelId: 'existing-channel',
      })
    );
    storage.updateDiscordServerConfig.mockResolvedValue(
      makeDiscordServerConfig({ id: 'server-99' })
    );
    const nav = installNavigationMock();

    const { getByText, getByDisplayValue } = render(
      <DiscordServerFormScreen />
    );

    await waitFor(() => {
      expect(getByDisplayValue('Existing Server')).toBeTruthy();
      expect(getByText('Update Configuration')).toBeTruthy();
    });
    fireEvent.press(getByText('Update Configuration'));

    await waitFor(() => {
      expect(storage.updateDiscordServerConfig).toHaveBeenCalledWith(
        'server-99',
        expect.objectContaining({ name: 'Existing Server' })
      );
      expect(alertSpy).toHaveBeenCalledWith(
        'Success',
        'Server configuration updated successfully',
        expect.any(Array)
      );
    });
    expect(storage.addDiscordServerConfig).not.toHaveBeenCalled();

    await pressAlertButton(alertSpy, 'OK');
    expect(nav.goBack).toHaveBeenCalled();
  });

  it('tests the connection using the entered token and channel', async () => {
    api.verifyDiscordToken.mockResolvedValue(true);
    api.verifyChannelAccess.mockResolvedValue(true);
    installRouteParams({ serverConfigId: 'server-99' });
    storage.getDiscordServerConfig.mockResolvedValue(
      makeDiscordServerConfig({ id: 'server-99' })
    );

    const { getByText } = render(<DiscordServerFormScreen />);

    await waitFor(() => {
      expect(getByText('Test Connection')).toBeTruthy();
    });
    fireEvent.press(getByText('Test Connection'));

    await waitFor(() => {
      expect(api.verifyDiscordToken).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith(
        'Success',
        'Connection test successful!',
        expect.any(Array)
      );
    });
  });

  it('navigates back when Cancel is pressed', async () => {
    const nav = installNavigationMock();
    const { getByText } = render(<DiscordServerFormScreen />);

    await waitFor(() => {
      expect(getByText('Cancel')).toBeTruthy();
    });
    fireEvent.press(getByText('Cancel'));

    expect(nav.goBack).toHaveBeenCalled();
  });
});
