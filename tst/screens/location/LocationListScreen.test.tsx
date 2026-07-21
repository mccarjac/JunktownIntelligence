import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { LocationListScreen } from '@screens/location/LocationListScreen';
import { describeListScreenContract } from '../../helpers/screenContracts';
import { getStorageMock, primeStorageDefaults } from '../../helpers/storage';
import { makeLocation } from '../../helpers/factories';
import {
  installNavigationMock,
  resetNavigationMocks,
  getLastHeaderRight,
} from '../../helpers/navigation';

jest.mock('@utils/characterStorage');

const storage = getStorageMock();

describeListScreenContract({
  name: 'LocationListScreen',
  renderScreen: () => render(<LocationListScreen />),
  emptyStateTitle: 'No locations found',
  searchPlaceholder: 'Search locations by name...',
  loadFns: () => [storage.loadCharacters, storage.loadLocations],
  primePopulated: () => {
    storage.loadLocations.mockResolvedValue([
      makeLocation({ name: 'The Docks' }),
    ]);
  },
  populatedTexts: ['The Docks'],
});

describe('LocationListScreen — header actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    primeStorageDefaults();
  });

  afterEach(() => {
    resetNavigationMocks();
  });

  it('navigates to the map and the create form from the header buttons', async () => {
    const nav = installNavigationMock();
    render(<LocationListScreen />);

    await waitFor(() => {
      expect(nav.setOptions).toHaveBeenCalled();
    });
    const header = render(getLastHeaderRight(nav));

    fireEvent.press(header.getByText('🗺️'));
    expect(nav.navigate).toHaveBeenCalledWith('LocationMap');

    fireEvent.press(header.getByText('+'));
    expect(nav.navigate).toHaveBeenCalledWith('LocationForm', {});
  });
});
