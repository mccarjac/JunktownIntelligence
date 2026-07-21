import React from 'react';
import { render } from '@testing-library/react-native';
import { LocationFormScreen } from '@screens/location/LocationFormScreen';
import { describeFormScreenContract } from '../../helpers/screenContracts';
import { getStorageMock } from '../../helpers/storage';
import { makeLocation } from '../../helpers/factories';

jest.mock('@utils/characterStorage');

const storage = getStorageMock();
const existingLocation = makeLocation({ id: 'loc-1', name: 'Old Docks' });

describeFormScreenContract({
  name: 'LocationFormScreen',
  renderScreen: () => render(<LocationFormScreen />),
  requiredFieldPlaceholder: 'Enter location name',
  requiredFieldValue: 'The Docks',
  validationErrorText: 'Location name is required',
  submitLabels: { create: 'Create Location', update: 'Update Location' },
  createFn: () => storage.createLocation,
  updateFn: () => storage.updateLocation,
  primeCreate: () => {
    storage.createLocation.mockResolvedValue(makeLocation());
  },
  edit: {
    routeParams: { location: existingLocation },
    prime: () => {
      storage.updateLocation.mockResolvedValue(existingLocation);
    },
    prefilledValue: 'Old Docks',
  },
});
