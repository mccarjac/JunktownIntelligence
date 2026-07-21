import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { EventsTimelineScreen } from '@screens/events/EventsListScreen';
import { describeListScreenContract } from '../../helpers/screenContracts';
import { getStorageMock, primeStorageDefaults } from '../../helpers/storage';
import { makeEvent } from '../../helpers/factories';
import {
  installNavigationMock,
  resetNavigationMocks,
  getLastHeaderRight,
} from '../../helpers/navigation';

jest.mock('@utils/characterStorage');

const storage = getStorageMock();

describeListScreenContract({
  name: 'EventsTimelineScreen',
  renderScreen: () => render(<EventsTimelineScreen />),
  emptyStateTitle: 'No events found',
  searchPlaceholder: 'Search events...',
  loadFns: () => [
    storage.loadEvents,
    storage.loadCharacters,
    storage.loadLocations,
    storage.loadFactions,
  ],
  primePopulated: () => {
    storage.loadEvents.mockResolvedValue([
      makeEvent({ title: 'The Great Fire' }),
    ]);
  },
  populatedTexts: ['The Great Fire'],
});

describe('EventsTimelineScreen — header actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    primeStorageDefaults();
  });

  afterEach(() => {
    resetNavigationMocks();
  });

  it('navigates to the create form from the header add button', async () => {
    const nav = installNavigationMock();
    render(<EventsTimelineScreen />);

    await waitFor(() => {
      expect(nav.setOptions).toHaveBeenCalled();
    });
    const header = render(getLastHeaderRight(nav));

    fireEvent.press(header.getByText('+'));
    expect(nav.navigate).toHaveBeenCalledWith('EventsForm', {});
  });
});
