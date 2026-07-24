import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Picker } from '@react-native-picker/picker';
import { DiscordMessagesScreen } from '@screens/discord/DiscordMessagesScreen';
import * as discordStorage from '@utils/discordStorage';
import * as characterStorage from '@utils/characterStorage';
import * as discordCharacterExtraction from '@utils/discordCharacterExtraction';
import {
  installFocusEffectOnce,
  resetNavigationMocks,
} from '../../helpers/navigation';
import { spyOnAlert, pressAlertButton } from '../../helpers/alertAndPlatform';
import {
  makeCharacter,
  makeDiscordMessage,
  makeDiscordServerConfig,
} from '../../helpers/factories';

jest.mock('@utils/discordStorage');
jest.mock('@utils/characterStorage');
jest.mock('@utils/discordCharacterExtraction');

const storage = jest.mocked(discordStorage);
const charStorage = jest.mocked(characterStorage);
const extraction = jest.mocked(discordCharacterExtraction);

const primeDefaults = () => {
  storage.getDiscordMessages.mockResolvedValue([]);
  charStorage.loadCharacters.mockResolvedValue([]);
  storage.getDiscordServerConfigs.mockResolvedValue([]);
};

describe('DiscordMessagesScreen', () => {
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

  it('shows an empty state when there are no messages', async () => {
    const { getByText } = render(<DiscordMessagesScreen />);

    await waitFor(() => {
      expect(getByText('No  messages found')).toBeTruthy();
    });
  });

  it('renders a card for each loaded message with its tag status', async () => {
    storage.getDiscordMessages.mockResolvedValue([
      makeDiscordMessage({
        id: 'message-1',
        authorUsername: 'Alice',
        content: 'Untagged message',
      }),
      makeDiscordMessage({
        id: 'message-2',
        authorUsername: 'Bob',
        content: 'Tagged message',
        characterId: 'character-1',
      }),
    ]);
    charStorage.loadCharacters.mockResolvedValue([
      makeCharacter({ id: 'character-1', name: 'Boone' }),
    ]);

    const { getByText } = render(<DiscordMessagesScreen />);

    await waitFor(() => {
      expect(getByText('Untagged message')).toBeTruthy();
      expect(getByText('Tagged message')).toBeTruthy();
      expect(getByText('UNTAGGED')).toBeTruthy();
      expect(getByText('Boone')).toBeTruthy();
    });
  });

  it('filters messages by tagged/untagged/ignored', async () => {
    storage.getDiscordMessages.mockResolvedValue([
      makeDiscordMessage({ id: 'message-1', content: 'Untagged one' }),
      makeDiscordMessage({
        id: 'message-2',
        content: 'Tagged one',
        characterId: 'character-1',
      }),
      makeDiscordMessage({
        id: 'message-3',
        content: 'Ignored one',
        ignored: true,
      }),
    ]);
    charStorage.loadCharacters.mockResolvedValue([
      makeCharacter({ id: 'character-1', name: 'Boone' }),
    ]);

    const { getByText, queryByText } = render(<DiscordMessagesScreen />);

    await waitFor(() => {
      expect(getByText('Untagged one')).toBeTruthy();
      expect(getByText('Tagged one')).toBeTruthy();
    });
    expect(queryByText('Ignored one')).toBeNull();

    fireEvent.press(getByText('Untagged (1)'));
    await waitFor(() => {
      expect(getByText('Untagged one')).toBeTruthy();
    });
    expect(queryByText('Tagged one')).toBeNull();

    fireEvent.press(getByText('Ignored (1)'));
    await waitFor(() => {
      expect(getByText('Ignored one')).toBeTruthy();
    });
    expect(queryByText('Untagged one')).toBeNull();
  });

  it('ignores a message after confirmation', async () => {
    storage.getDiscordMessages.mockResolvedValue([
      makeDiscordMessage({ id: 'message-1', content: 'To be ignored' }),
    ]);
    storage.saveDiscordMessages.mockResolvedValue(undefined);

    const { getByText } = render(<DiscordMessagesScreen />);

    await waitFor(() => {
      expect(getByText('✕ Ignore')).toBeTruthy();
    });
    fireEvent.press(getByText('✕ Ignore'), { stopPropagation: () => {} });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });
    await pressAlertButton(alertSpy, 'Ignore');

    await waitFor(() => {
      expect(storage.saveDiscordMessages).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'message-1', ignored: true }),
      ]);
    });
  });

  it('shows the server/channel filter picker when server configs exist', async () => {
    storage.getDiscordServerConfigs.mockResolvedValue([
      makeDiscordServerConfig({ id: 'server-1', name: 'Main Server' }),
    ]);

    const { getByText } = render(<DiscordMessagesScreen />);

    await waitFor(() => {
      expect(getByText('Server/Channel:')).toBeTruthy();
    });
  });

  it('opens the mapping modal and saves a character mapping', async () => {
    storage.getDiscordMessages.mockResolvedValue([
      makeDiscordMessage({
        id: 'message-1',
        authorId: 'author-1',
        authorUsername: 'Alice',
        content: 'Please tag me',
        extractedCharacterName: 'Boone',
      }),
    ]);
    charStorage.loadCharacters.mockResolvedValue([
      makeCharacter({ id: 'character-1', name: 'Boone' }),
    ]);
    storage.saveDiscordMessages.mockResolvedValue(undefined);
    extraction.confirmCharacterMapping.mockResolvedValue(undefined);
    storage.applyAliasToMessages.mockResolvedValue(1);

    const { getByText, UNSAFE_getAllByType } = render(
      <DiscordMessagesScreen />
    );

    await waitFor(() => {
      expect(getByText('Please tag me')).toBeTruthy();
    });
    fireEvent.press(getByText('Please tag me'));

    await waitFor(() => {
      expect(getByText('Link Message to Character')).toBeTruthy();
    });

    const pickers = UNSAFE_getAllByType(Picker);
    fireEvent(pickers[pickers.length - 1], 'valueChange', 'character-1');

    fireEvent.press(getByText('Save'));

    await waitFor(() => {
      expect(storage.saveDiscordMessages).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'message-1',
          characterId: 'character-1',
        }),
      ]);
      expect(extraction.confirmCharacterMapping).toHaveBeenCalledWith(
        'Boone',
        'character-1',
        'author-1'
      );
      expect(alertSpy).toHaveBeenCalledWith(
        'Success',
        expect.any(String),
        expect.any(Array)
      );
    });
  });
});
