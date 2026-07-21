import React from 'react';
import { render } from '@testing-library/react-native';
import { EventsFormScreen } from '@screens/events/EventsFormScreen';
import { describeFormScreenContract } from '../../helpers/screenContracts';
import { getStorageMock } from '../../helpers/storage';
import { makeEvent } from '../../helpers/factories';

jest.mock('@utils/characterStorage');

const storage = getStorageMock();
const existingEvent = makeEvent({ id: 'event-1', title: 'Old Gathering' });

describeFormScreenContract({
  name: 'EventsFormScreen',
  renderScreen: () => render(<EventsFormScreen />),
  requiredFieldPlaceholder: 'Event title',
  requiredFieldValue: 'The Wedding',
  validationErrorText: 'Title is required',
  submitLabels: { create: 'Create Event', update: 'Update Event' },
  createFn: () => storage.createEvent,
  updateFn: () => storage.updateEvent,
  primeCreate: () => {
    storage.createEvent.mockResolvedValue(makeEvent());
  },
  edit: {
    routeParams: { event: existingEvent },
    prime: () => {
      storage.updateEvent.mockResolvedValue(existingEvent);
    },
    prefilledValue: 'Old Gathering',
  },
});
