import React from 'react';
import { render } from '@testing-library/react-native';
import { CharacterDetailScreen } from '@screens/character/CharacterDetailScreen';
import { describeDetailScreenContract } from '../../helpers/screenContracts';
import { getStorageMock } from '../../helpers/storage';
import { makeCharacter } from '../../helpers/factories';
import * as discordStorage from '@/utils/discordStorage';

jest.mock('@utils/characterStorage');
jest.mock('@/utils/discordStorage');

const storage = getStorageMock();
const character = makeCharacter({ id: 'char-1', name: 'Alice' });

describeDetailScreenContract({
  name: 'CharacterDetailScreen',
  renderScreen: () => render(<CharacterDetailScreen />),
  routeParams: { character },
  prime: () => {
    storage.loadCharacters.mockResolvedValue([character]);
    jest
      .mocked(discordStorage.getDiscordMessagesForCharacter)
      .mockResolvedValue([]);
  },
  expectedContent: ['Alice', /Species: Human/],
  edit: {
    expectedScreen: 'CharacterForm',
    expectedParams: { character },
  },
  del: {
    deleteFn: () => storage.deleteCharacter,
    primeDelete: () => {
      storage.deleteCharacter.mockResolvedValue(true);
    },
  },
});
