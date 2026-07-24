import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { DiscordCharacterMappingScreen } from '@screens/discord/DiscordCharacterMappingScreen';
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
  makeDiscordCharacterAlias,
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
  storage.getDiscordCharacterAliases.mockResolvedValue([]);
};

describe('DiscordCharacterMappingScreen', () => {
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

  it('shows an empty state when there are no unmapped messages', async () => {
    const { getByText } = render(<DiscordCharacterMappingScreen />);

    await waitFor(() => {
      expect(getByText('No unmapped character names found.')).toBeTruthy();
    });
  });

  it('groups unmapped messages by extracted name', async () => {
    storage.getDiscordMessages.mockResolvedValue([
      makeDiscordMessage({
        id: 'message-1',
        extractedCharacterName: 'Boone',
        authorUsername: 'Player1',
        content: '>[Boone] says hello',
      }),
      makeDiscordMessage({
        id: 'message-2',
        extractedCharacterName: 'Boone',
        authorUsername: 'Player1',
        content: '>[Boone] says hi again',
      }),
    ]);

    const { getByText } = render(<DiscordCharacterMappingScreen />);

    await waitFor(() => {
      expect(getByText('"Boone"')).toBeTruthy();
      expect(getByText('Needs Mapping (1)')).toBeTruthy();
    });
  });

  it('excludes messages that already have a characterId', async () => {
    storage.getDiscordMessages.mockResolvedValue([
      makeDiscordMessage({
        id: 'message-1',
        extractedCharacterName: 'Boone',
        characterId: 'character-1',
      }),
    ]);

    const { getByText } = render(<DiscordCharacterMappingScreen />);

    await waitFor(() => {
      expect(getByText('No unmapped character names found.')).toBeTruthy();
    });
  });

  it('saves selected mappings and confirms the alias', async () => {
    storage.getDiscordMessages.mockResolvedValue([
      makeDiscordMessage({
        id: 'message-1',
        authorId: 'author-1',
        extractedCharacterName: 'Boone',
      }),
    ]);
    charStorage.loadCharacters.mockResolvedValue([
      makeCharacter({ id: 'character-1', name: 'Boone' }),
    ]);
    storage.saveDiscordMessages.mockResolvedValue(undefined);
    extraction.confirmCharacterMapping.mockResolvedValue(undefined);

    const { getByText, UNSAFE_getByType } = render(
      <DiscordCharacterMappingScreen />
    );

    await waitFor(() => {
      expect(getByText('"Boone"')).toBeTruthy();
    });

    const { Picker } = jest.requireActual('@react-native-picker/picker');
    fireEvent(UNSAFE_getByType(Picker), 'valueChange', 'character-1');

    await waitFor(() => {
      expect(getByText('Save 1 Mapping')).toBeTruthy();
    });
    fireEvent.press(getByText('Save 1 Mapping'));

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
        'Character mappings saved successfully',
        expect.any(Array)
      );
    });
  });

  it('switches to the existing mappings view and deletes an alias after confirmation', async () => {
    storage.getDiscordCharacterAliases.mockResolvedValue([
      makeDiscordCharacterAlias({
        alias: 'Boone',
        characterId: 'character-1',
        discordUserId: 'discord-user-1',
      }),
    ]);
    charStorage.loadCharacters.mockResolvedValue([
      makeCharacter({ id: 'character-1', name: 'Boone Character' }),
    ]);
    storage.saveDiscordCharacterAliases.mockResolvedValue(undefined);

    const { getByText } = render(<DiscordCharacterMappingScreen />);

    await waitFor(() => {
      expect(getByText('Existing Mappings (1)')).toBeTruthy();
    });
    fireEvent.press(getByText('Existing Mappings (1)'));

    await waitFor(() => {
      expect(getByText('"Boone"')).toBeTruthy();
      expect(getByText('Boone Character')).toBeTruthy();
    });
    fireEvent.press(getByText('🗑️'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });
    await pressAlertButton(alertSpy, 'Delete');

    await waitFor(() => {
      expect(storage.saveDiscordCharacterAliases).toHaveBeenCalledWith([]);
    });
  });
});
