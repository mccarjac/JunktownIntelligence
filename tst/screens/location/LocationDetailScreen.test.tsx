import React from 'react';
import { render } from '@testing-library/react-native';
import { LocationDetailsScreen } from '@screens/location/LocationDetailScreen';
import { describeDetailScreenContract } from '../../helpers/screenContracts';
import { getStorageMock } from '../../helpers/storage';
import { makeLocation } from '../../helpers/factories';

jest.mock('@utils/characterStorage');

const storage = getStorageMock();
const LOCATION_ID = 'location-1';
const location = makeLocation({ id: LOCATION_ID, name: 'The Docks' });

describeDetailScreenContract({
  name: 'LocationDetailsScreen',
  renderScreen: () => render(<LocationDetailsScreen />),
  routeParams: { locationId: LOCATION_ID },
  prime: () => {
    storage.getLocation.mockResolvedValue(location);
  },
  expectedContent: ['The Docks', 'Statistics', 'Total Characters'],
  edit: {
    expectedScreen: 'LocationForm',
    expectedParams: { location },
  },
  del: {
    deleteFn: () => storage.deleteLocationCompletely,
    primeDelete: () => {
      storage.deleteLocationCompletely.mockResolvedValue({
        success: true,
        charactersUpdated: 0,
      });
    },
  },
});
