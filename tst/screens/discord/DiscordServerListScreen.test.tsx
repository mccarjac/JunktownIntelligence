import React from 'react';
import { Switch } from 'react-native';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import { DiscordServerListScreen } from '@screens/discord/DiscordServerListScreen';
import * as discordStorage from '@utils/discordStorage';
import * as discordApi from '@utils/discordApi';
import {
  installNavigationMock,
  installFocusEffectOnce,
  resetNavigationMocks,
} from '../../helpers/navigation';
import { spyOnAlert, pressAlertButton } from '../../helpers/alertAndPlatform';
import { makeDiscordServerConfig } from '../../helpers/factories';

jest.mock('@utils/discordStorage');
jest.mock('@utils/discordApi');

const storage = jest.mocked(discordStorage);
const api = jest.mocked(discordApi);

const primeDefaults = () => {
  storage.getDiscordServerConfigs.mockResolvedValue([]);
  storage.getDiscordConfig.mockResolvedValue({
    enabled: false,
    autoSync: true,
    serverConfigs: [],
  });
};

describe('DiscordServerListScreen', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    primeDefaults();
    installFocusEffectOnce();
    alertSpy = spyOnAlert();
  });

  afterEach(() => {
    resetNavigationMocks();
    jest.restoreAllMocks();
  });

  it('renders the empty state when there are no server configs', async () => {
    const { getByText } = render(<DiscordServerListScreen />);

    await waitFor(() => {
      expect(getByText('No server configurations yet')).toBeTruthy();
    });
  });

  it('loads server configs and global config on mount', async () => {
    render(<DiscordServerListScreen />);

    await waitFor(() => {
      expect(storage.getDiscordServerConfigs).toHaveBeenCalled();
      expect(storage.getDiscordConfig).toHaveBeenCalled();
    });
  });

  it('renders a server card for each configured server', async () => {
    storage.getDiscordServerConfigs.mockResolvedValue([
      makeDiscordServerConfig({ name: 'Main RP Server', channelId: 'chan-1' }),
    ]);

    const { getByText } = render(<DiscordServerListScreen />);

    await waitFor(() => {
      expect(getByText('Main RP Server')).toBeTruthy();
      expect(getByText('chan-1')).toBeTruthy();
    });
  });

  it('navigates to the form screen to add a new server', async () => {
    const nav = installNavigationMock();
    const { getByText } = render(<DiscordServerListScreen />);

    await waitFor(() => {
      expect(getByText('+ Add Server/Channel')).toBeTruthy();
    });
    fireEvent.press(getByText('+ Add Server/Channel'));

    expect(nav.navigate).toHaveBeenCalledWith('DiscordServerForm', {});
  });

  it('navigates to the form screen to edit an existing server', async () => {
    const nav = installNavigationMock();
    storage.getDiscordServerConfigs.mockResolvedValue([
      makeDiscordServerConfig({ id: 'server-99', name: 'Main RP Server' }),
    ]);

    const { getByText } = render(<DiscordServerListScreen />);

    await waitFor(() => {
      expect(getByText('Edit')).toBeTruthy();
    });
    fireEvent.press(getByText('Edit'));

    expect(nav.navigate).toHaveBeenCalledWith('DiscordServerForm', {
      serverConfigId: 'server-99',
    });
  });

  it('tests the connection for a server and shows the result', async () => {
    storage.getDiscordServerConfigs.mockResolvedValue([
      makeDiscordServerConfig({ name: 'Main RP Server' }),
    ]);
    api.testDiscordConnection.mockResolvedValue({ success: true });

    const { getByText } = render(<DiscordServerListScreen />);

    await waitFor(() => {
      expect(getByText('Test')).toBeTruthy();
    });
    await act(async () => {
      fireEvent.press(getByText('Test'));
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Success',
        expect.stringContaining('Main RP Server'),
        expect.any(Array)
      );
    });
  });

  it('deletes a server configuration after confirmation', async () => {
    storage.getDiscordServerConfigs.mockResolvedValue([
      makeDiscordServerConfig({ id: 'server-99', name: 'Main RP Server' }),
    ]);
    storage.removeDiscordServerConfig.mockResolvedValue(undefined);

    const { getByText } = render(<DiscordServerListScreen />);

    await waitFor(() => {
      expect(getByText('Delete')).toBeTruthy();
    });
    fireEvent.press(getByText('Delete'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });
    await pressAlertButton(alertSpy, 'Delete');

    await waitFor(() => {
      expect(storage.removeDiscordServerConfig).toHaveBeenCalledWith(
        'server-99'
      );
    });
  });

  it('does not delete when the confirmation is cancelled', async () => {
    storage.getDiscordServerConfigs.mockResolvedValue([
      makeDiscordServerConfig({ id: 'server-99', name: 'Main RP Server' }),
    ]);

    const { getByText } = render(<DiscordServerListScreen />);

    await waitFor(() => {
      expect(getByText('Delete')).toBeTruthy();
    });
    fireEvent.press(getByText('Delete'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });
    await pressAlertButton(alertSpy, 'Cancel');

    expect(storage.removeDiscordServerConfig).not.toHaveBeenCalled();
  });

  it('toggles global Discord integration and persists it', async () => {
    storage.getDiscordConfig.mockResolvedValue({
      enabled: false,
      autoSync: true,
      serverConfigs: [],
    });
    storage.saveDiscordConfig.mockResolvedValue(undefined);

    const { getByText, UNSAFE_getAllByType } = render(
      <DiscordServerListScreen />
    );

    await waitFor(() => {
      expect(getByText('Discord Integration')).toBeTruthy();
    });
    const [globalSwitch] = UNSAFE_getAllByType(Switch);
    fireEvent(globalSwitch, 'valueChange', true);

    await waitFor(() => {
      expect(storage.saveDiscordConfig).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: true })
      );
    });
  });
});
