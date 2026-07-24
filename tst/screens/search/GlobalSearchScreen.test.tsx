import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { GlobalSearchScreen } from '@screens/search/GlobalSearchScreen';
import { getStorageMock, primeStorageDefaults } from '../../helpers/storage';
import {
  installNavigationMock,
  installFocusEffectOnce,
  resetNavigationMocks,
  NavMock,
} from '../../helpers/navigation';
import {
  makeCharacter,
  makeStoredFaction,
  makeLocation,
  makeEvent,
  makeQuest,
} from '../../helpers/factories';

jest.mock('@utils/characterStorage');

const storage = getStorageMock();

const SEARCH_PLACEHOLDER = 'Search all domains...';

describe('GlobalSearchScreen', () => {
  let nav: NavMock;

  beforeEach(() => {
    jest.clearAllMocks();
    primeStorageDefaults();
    nav = installNavigationMock();
    installFocusEffectOnce();
  });

  afterEach(() => {
    resetNavigationMocks();
  });

  const primePopulated = () => {
    storage.loadCharacters.mockResolvedValue([
      makeCharacter({ id: 'c1', name: 'Rusty Nail', occupation: 'Mechanic' }),
    ]);
    storage.loadFactions.mockResolvedValue([
      makeStoredFaction({ name: 'Rust Barons' }),
    ]);
    storage.loadLocations.mockResolvedValue([
      makeLocation({ id: 'l1', name: 'Rust Yard' }),
    ]);
    storage.loadEvents.mockResolvedValue([
      makeEvent({ id: 'e1', title: 'Rust Storm' }),
    ]);
    storage.loadQuests.mockResolvedValue([
      makeQuest({ id: 'q1', name: 'Clear the Rust' }),
    ]);
  };

  it('shows the idle state and calls all five loaders on mount', async () => {
    const { getByText, getByPlaceholderText } = render(<GlobalSearchScreen />);

    await waitFor(() => {
      expect(storage.loadCharacters).toHaveBeenCalled();
      expect(storage.loadFactions).toHaveBeenCalled();
      expect(storage.loadLocations).toHaveBeenCalled();
      expect(storage.loadEvents).toHaveBeenCalled();
      expect(storage.loadQuests).toHaveBeenCalled();
    });
    expect(getByText('Search everything')).toBeTruthy();
    expect(getByPlaceholderText(SEARCH_PLACEHOLDER)).toBeTruthy();
  });

  it('shows grouped results across domains when a query is entered', async () => {
    primePopulated();

    const { getByText, getByPlaceholderText } = render(<GlobalSearchScreen />);

    await waitFor(() => {
      expect(storage.loadQuests).toHaveBeenCalled();
    });
    fireEvent.changeText(getByPlaceholderText(SEARCH_PLACEHOLDER), 'rust');

    await waitFor(() => {
      expect(getByText('Characters (1)')).toBeTruthy();
      expect(getByText('Factions (1)')).toBeTruthy();
      expect(getByText('Locations (1)')).toBeTruthy();
      expect(getByText('Events (1)')).toBeTruthy();
      expect(getByText('Quests (1)')).toBeTruthy();
      expect(getByText('Rusty Nail')).toBeTruthy();
      expect(getByText('Rust Barons')).toBeTruthy();
      expect(getByText('Rust Yard')).toBeTruthy();
      expect(getByText('Rust Storm')).toBeTruthy();
      expect(getByText('Clear the Rust')).toBeTruthy();
    });
  });

  it('navigates to the character detail with the full character object', async () => {
    const character = makeCharacter({ id: 'c1', name: 'Rusty Nail' });
    storage.loadCharacters.mockResolvedValue([character]);

    const { getByText, getByPlaceholderText } = render(<GlobalSearchScreen />);

    await waitFor(() => {
      expect(storage.loadCharacters).toHaveBeenCalled();
    });
    fireEvent.changeText(getByPlaceholderText(SEARCH_PLACEHOLDER), 'rusty');

    await waitFor(() => {
      expect(getByText('Rusty Nail')).toBeTruthy();
    });
    fireEvent.press(getByText('Rusty Nail'));

    expect(nav.navigate).toHaveBeenCalledWith('CharacterDetail', {
      character,
    });
  });

  it('navigates to the faction detail keyed by faction name', async () => {
    storage.loadFactions.mockResolvedValue([
      makeStoredFaction({ name: 'Rust Barons' }),
    ]);

    const { getByText, getByPlaceholderText } = render(<GlobalSearchScreen />);

    await waitFor(() => {
      expect(storage.loadFactions).toHaveBeenCalled();
    });
    fireEvent.changeText(getByPlaceholderText(SEARCH_PLACEHOLDER), 'barons');

    await waitFor(() => {
      expect(getByText('Rust Barons')).toBeTruthy();
    });
    fireEvent.press(getByText('Rust Barons'));

    expect(nav.navigate).toHaveBeenCalledWith('FactionDetails', {
      factionName: 'Rust Barons',
    });
  });

  it('navigates to location, event, and quest details by id', async () => {
    primePopulated();

    const { getByText, getByPlaceholderText } = render(<GlobalSearchScreen />);

    await waitFor(() => {
      expect(storage.loadQuests).toHaveBeenCalled();
    });
    fireEvent.changeText(getByPlaceholderText(SEARCH_PLACEHOLDER), 'rust');

    await waitFor(() => {
      expect(getByText('Rust Yard')).toBeTruthy();
    });
    fireEvent.press(getByText('Rust Yard'));
    fireEvent.press(getByText('Rust Storm'));
    fireEvent.press(getByText('Clear the Rust'));

    expect(nav.navigate).toHaveBeenCalledWith('LocationDetails', {
      locationId: 'l1',
    });
    expect(nav.navigate).toHaveBeenCalledWith('EventsDetail', {
      eventId: 'e1',
    });
    expect(nav.navigate).toHaveBeenCalledWith('QuestsDetail', {
      questId: 'q1',
    });
  });

  it('shows the no-results state for a query that matches nothing', async () => {
    primePopulated();

    const { getByText, getByPlaceholderText } = render(<GlobalSearchScreen />);

    await waitFor(() => {
      expect(storage.loadQuests).toHaveBeenCalled();
    });
    fireEvent.changeText(
      getByPlaceholderText(SEARCH_PLACEHOLDER),
      'zzz-no-match'
    );

    await waitFor(() => {
      expect(getByText('No results')).toBeTruthy();
    });
  });
});
