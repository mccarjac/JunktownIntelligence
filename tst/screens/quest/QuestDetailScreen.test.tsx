import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { QuestDetailScreen } from '@screens/quest/QuestDetailScreen';
import { describeDetailScreenContract } from '../../helpers/screenContracts';
import { getStorageMock, primeStorageDefaults } from '../../helpers/storage';
import { makeQuest, makeEvent, makeCharacter } from '../../helpers/factories';
import {
  installNavigationMock,
  installRouteParams,
  resetNavigationMocks,
  NavMock,
} from '../../helpers/navigation';

jest.mock('@utils/characterStorage');

const storage = getStorageMock();
const QUEST_ID = 'quest-1';
const quest = makeQuest({ id: QUEST_ID, name: 'Recover the Cargo' });

describeDetailScreenContract({
  name: 'QuestDetailScreen',
  renderScreen: () => render(<QuestDetailScreen />),
  routeParams: { questId: QUEST_ID },
  prime: () => {
    storage.loadQuests.mockResolvedValue([quest]);
  },
  expectedContent: [
    'Recover the Cargo',
    'Not Started',
    'Team Size Goal',
    'Default',
  ],
  edit: {
    expectedScreen: 'QuestsForm',
    expectedParams: {
      quest: { ...quest, timeline: [], participants: [] },
    },
  },
  del: {
    deleteFn: () => storage.deleteQuest,
    primeDelete: () => {
      storage.deleteQuest.mockResolvedValue(true);
    },
  },
});

describe('QuestDetailScreen — narrative thread', () => {
  let nav: NavMock;

  beforeEach(() => {
    jest.clearAllMocks();
    primeStorageDefaults();
    nav = installNavigationMock();
    installRouteParams({ questId: QUEST_ID });
  });

  afterEach(() => {
    resetNavigationMocks();
  });

  it('shows the quest timeline in date order and navigates to the event on tap', async () => {
    const laterEvent = makeEvent({
      id: 'event-later',
      title: 'Second Skirmish',
      date: '2026-02-01',
    });
    const earlierEvent = makeEvent({
      id: 'event-earlier',
      title: 'First Contact',
      date: '2026-01-01',
    });
    const narrativeQuest = makeQuest({
      id: QUEST_ID,
      name: 'Recover the Cargo',
      eventIds: [laterEvent.id, earlierEvent.id],
    });

    storage.loadQuests.mockResolvedValue([narrativeQuest]);
    storage.loadEvents.mockResolvedValue([laterEvent, earlierEvent]);

    const { getByText, getAllByText } = render(<QuestDetailScreen />);

    await waitFor(() => {
      expect(getByText('Quest Timeline (2)')).toBeTruthy();
    });

    fireEvent.press(getByText('Quest Timeline (2)'));

    const titles = getAllByText(/First Contact|Second Skirmish/);
    expect(titles[0].props.children).toBe('First Contact');
    expect(titles[1].props.children).toBe('Second Skirmish');

    fireEvent.press(getByText('First Contact'));

    expect(nav.navigate).toHaveBeenCalledWith('EventsDetail', {
      eventId: earlierEvent.id,
    });
  });

  it('tags participants as assigned, in-events, or both and navigates to the character on tap', async () => {
    const assignedOnly = makeCharacter({
      id: 'char-assigned',
      name: 'Assigned Only',
    });
    const eventOnly = makeCharacter({ id: 'char-event', name: 'Event Only' });
    const both = makeCharacter({ id: 'char-both', name: 'Both Roles' });

    const event = makeEvent({
      id: 'event-1',
      characterIds: [eventOnly.id, both.id],
    });
    const narrativeQuest = makeQuest({
      id: QUEST_ID,
      assignedCharacterIds: [assignedOnly.id, both.id],
      eventIds: [event.id],
    });

    storage.loadQuests.mockResolvedValue([narrativeQuest]);
    storage.loadEvents.mockResolvedValue([event]);
    storage.loadCharacters.mockResolvedValue([assignedOnly, eventOnly, both]);

    const { getByText } = render(<QuestDetailScreen />);

    await waitFor(() => {
      expect(getByText('Participants (3)')).toBeTruthy();
    });

    expect(getByText('Assigned Only')).toBeTruthy();
    expect(getByText('Event Only')).toBeTruthy();
    expect(getByText('Both Roles')).toBeTruthy();

    fireEvent.press(getByText('Both Roles'));

    expect(nav.navigate).toHaveBeenCalledWith('CharacterDetail', {
      character: both,
    });
  });
});
