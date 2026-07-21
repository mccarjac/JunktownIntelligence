import React from 'react';
import { render } from '@testing-library/react-native';
import { EventsDetailScreen } from '@screens/events/EventsDetailScreen';
import { describeDetailScreenContract } from '../../helpers/screenContracts';
import { getStorageMock } from '../../helpers/storage';
import { makeEvent } from '../../helpers/factories';

jest.mock('@utils/characterStorage');

const storage = getStorageMock();
const EVENT_ID = 'event-1';
const event = makeEvent({ id: EVENT_ID, title: 'The Great Fire' });

describeDetailScreenContract({
  name: 'EventsDetailScreen',
  renderScreen: () => render(<EventsDetailScreen />),
  routeParams: { eventId: EVENT_ID },
  prime: () => {
    storage.loadEvents.mockResolvedValue([event]);
  },
  expectedContent: ['The Great Fire', 'Confirmed', 'Date:'],
  edit: {
    expectedScreen: 'EventsForm',
    expectedParams: {
      event: { ...event, characterNames: [] },
    },
  },
  del: {
    deleteFn: () => storage.deleteEvent,
    primeDelete: () => {
      storage.deleteEvent.mockResolvedValue(true);
    },
  },
});
