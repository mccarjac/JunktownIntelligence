import React from 'react';
import { render } from '@testing-library/react-native';
import { FactionFormScreen } from '@screens/faction/FactionFormScreen';
import { describeFormScreenContract } from '../../helpers/screenContracts';
import { getStorageMock } from '../../helpers/storage';
import { makeStoredFaction } from '../../helpers/factories';

jest.mock('@utils/characterStorage');

const storage = getStorageMock();
const FACTION_NAME = 'Iron Legion';

describeFormScreenContract({
  name: 'FactionFormScreen',
  renderScreen: () => render(<FactionFormScreen />),
  requiredFieldPlaceholder: 'Enter faction name',
  requiredFieldValue: 'New Faction',
  validationErrorText: 'Faction name is required',
  submitLabels: { create: 'Create Faction', update: 'Update Faction' },
  createFn: () => storage.createFaction,
  updateFn: () => storage.updateFaction,
  primeCreate: () => {
    storage.createFaction.mockResolvedValue(true);
  },
  edit: {
    routeParams: { factionName: FACTION_NAME },
    prime: () => {
      storage.loadFactions.mockResolvedValue([
        makeStoredFaction({ name: FACTION_NAME, description: 'Old guard' }),
      ]);
      storage.updateFaction.mockResolvedValue(
        makeStoredFaction({ name: FACTION_NAME })
      );
    },
    prefilledValue: FACTION_NAME,
  },
});
