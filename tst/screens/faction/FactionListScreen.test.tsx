import React from 'react';
import { render } from '@testing-library/react-native';
import { FactionListScreen } from '@screens/faction/FactionListScreen';
import { describeListScreenContract } from '../../helpers/screenContracts';
import { getStorageMock } from '../../helpers/storage';
import { makeStoredFaction } from '../../helpers/factories';

jest.mock('@utils/characterStorage');

const storage = getStorageMock();

describeListScreenContract({
  name: 'FactionListScreen',
  renderScreen: () => render(<FactionListScreen />),
  emptyStateTitle: 'No factions found',
  searchPlaceholder: 'Search factions by name...',
  loadFns: () => [
    storage.migrateFactionDescriptions,
    storage.loadCharacters,
    storage.loadFactions,
  ],
  primePopulated: () => {
    storage.loadFactions.mockResolvedValue([
      makeStoredFaction({ name: 'Iron Legion' }),
    ]);
  },
  populatedTexts: ['Iron Legion'],
});
