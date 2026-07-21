import React from 'react';
import { render } from '@testing-library/react-native';
import { CharacterListScreen } from '@screens/character/CharacterListScreen';
import { describeListScreenContract } from '../../helpers/screenContracts';
import { getStorageMock } from '../../helpers/storage';
import { makeCharacter } from '../../helpers/factories';

jest.mock('@utils/characterStorage');

const storage = getStorageMock();

describeListScreenContract({
  name: 'CharacterListScreen',
  renderScreen: () => render(<CharacterListScreen />),
  emptyStateTitle: 'No characters found',
  searchPlaceholder: 'Search characters by name...',
  loadFns: () => [storage.loadCharacters],
  primePopulated: () => {
    storage.loadCharacters.mockResolvedValue([
      makeCharacter({ name: 'Alice' }),
    ]);
  },
  populatedTexts: ['Alice', 'No factions'],
});
