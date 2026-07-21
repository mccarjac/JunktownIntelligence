import React from 'react';
import { render } from '@testing-library/react-native';
import { FactionDetailsScreen } from '@screens/faction/FactionDetailScreen';
import { describeDetailScreenContract } from '../../helpers/screenContracts';
import { getStorageMock } from '../../helpers/storage';
import { makeStoredFaction } from '../../helpers/factories';

jest.mock('@utils/characterStorage');

const storage = getStorageMock();
const FACTION_NAME = 'Iron Legion';

describeDetailScreenContract({
  name: 'FactionDetailsScreen',
  renderScreen: () => render(<FactionDetailsScreen />),
  routeParams: { factionName: FACTION_NAME },
  prime: () => {
    storage.loadFactions.mockResolvedValue([
      makeStoredFaction({ name: FACTION_NAME }),
    ]);
  },
  expectedContent: [FACTION_NAME, 'No description provided', 'Statistics'],
  edit: {
    expectedScreen: 'FactionForm',
    expectedParams: { factionName: FACTION_NAME },
  },
  del: {
    deleteFn: () => storage.deleteFactionCompletely,
    primeDelete: () => {
      storage.deleteFactionCompletely.mockResolvedValue({
        success: true,
        charactersUpdated: 0,
      });
    },
  },
});
