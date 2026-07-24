import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { EventsDetailScreen } from '@screens/events/EventsDetailScreen';
import { describeDetailScreenContract } from '../../helpers/screenContracts';
import { getStorageMock, primeStorageDefaults } from '../../helpers/storage';
import { makeEvent, makeQuest } from '../../helpers/factories';
import { QuestStatus } from '@models/types';
import {
  installNavigationMock,
  installRouteParams,
  resetNavigationMocks,
  NavMock,
} from '../../helpers/navigation';

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
      event: { ...event, characterNames: [], quests: [] },
    },
  },
  del: {
    deleteFn: () => storage.deleteEvent,
    primeDelete: () => {
      storage.deleteEvent.mockResolvedValue(true);
    },
  },
});

describe('EventsDetailScreen — narrative thread', () => {
  let nav: NavMock;

  beforeEach(() => {
    jest.clearAllMocks();
    primeStorageDefaults();
    nav = installNavigationMock();
    installRouteParams({ eventId: EVENT_ID });
  });

  afterEach(() => {
    resetNavigationMocks();
  });

  it('lists the quests the event belongs to and navigates to one on tap', async () => {
    const quest = makeQuest({
      id: 'quest-1',
      name: 'Recover the Cargo',
      status: QuestStatus.InProgress,
    });
    const linkedEvent = makeEvent({
      id: EVENT_ID,
      title: 'The Great Fire',
      questIds: [quest.id],
    });

    storage.loadEvents.mockResolvedValue([linkedEvent]);
    storage.loadQuests.mockResolvedValue([quest]);

    const { getByText } = render(<EventsDetailScreen />);

    await waitFor(() => {
      expect(getByText('Recover the Cargo')).toBeTruthy();
    });
    expect(getByText('In Progress')).toBeTruthy();

    fireEvent.press(getByText('Recover the Cargo'));

    expect(nav.navigate).toHaveBeenCalledWith('QuestsDetail', {
      questId: quest.id,
    });
  });
});
