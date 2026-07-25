import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Picker } from '@react-native-picker/picker';
import { EventsFormScreen } from '@screens/events/EventsFormScreen';
import { describeFormScreenContract } from '../../helpers/screenContracts';
import { getStorageMock, primeStorageDefaults } from '../../helpers/storage';
import { makeEvent, makeQuest } from '../../helpers/factories';
import {
  installNavigationMock,
  installRouteParams,
  resetNavigationMocks,
} from '../../helpers/navigation';

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

describe('EventsFormScreen — quest links', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    primeStorageDefaults();
    installNavigationMock();
    installRouteParams({});
  });

  afterEach(() => {
    resetNavigationMocks();
  });

  it('includes a selected quest in the create payload', async () => {
    const quest = makeQuest({ id: 'quest-1', name: 'Retrieve the Cargo' });
    storage.loadQuests.mockResolvedValue([quest]);
    storage.createEvent.mockResolvedValue(makeEvent());

    const { getByPlaceholderText, getByText, UNSAFE_getAllByType } = render(
      <EventsFormScreen />
    );

    await waitFor(() => {
      expect(getByText('Related Quests')).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText('Event title'), 'The Wedding');

    const pickers = UNSAFE_getAllByType(Picker);
    fireEvent(pickers[pickers.length - 1], 'valueChange', quest.id);

    await waitFor(() => {
      expect(getByText('Retrieve the Cargo')).toBeTruthy();
    });

    fireEvent.press(getByText('Create Event'));

    await waitFor(() => {
      expect(storage.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({ questIds: [quest.id] })
      );
    });
  });

  it('prefills existing quest links when editing an event', async () => {
    const quest = makeQuest({ id: 'quest-1', name: 'Retrieve the Cargo' });
    const eventWithQuest = makeEvent({
      id: 'event-2',
      title: 'The Ambush',
      questIds: [quest.id],
    });
    storage.loadQuests.mockResolvedValue([quest]);
    storage.updateEvent.mockResolvedValue(eventWithQuest);
    installRouteParams({ event: eventWithQuest });

    const { getByText } = render(<EventsFormScreen />);

    await waitFor(() => {
      expect(getByText('Retrieve the Cargo')).toBeTruthy();
    });
  });
});
