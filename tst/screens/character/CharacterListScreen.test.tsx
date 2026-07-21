import React from 'react';
import { render } from '@testing-library/react-native';
import { CharacterListScreen } from '@screens/character/CharacterListScreen';
import { RelationshipStanding } from '@models/types';
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
      makeCharacter({
        id: 'char-1',
        name: 'Alice',
        present: true,
        factions: [
          { name: 'Iron Legion', standing: RelationshipStanding.Ally },
        ],
      }),
      makeCharacter({ id: 'char-2', name: 'Bob' }),
    ]);
  },
  populatedTexts: [
    'Alice',
    'Present',
    'Iron Legion',
    'Bob',
    'Absent',
    'No factions',
  ],
});
