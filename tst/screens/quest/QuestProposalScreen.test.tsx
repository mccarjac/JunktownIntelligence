import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { QuestProposalScreen } from '@screens/quest/QuestProposalScreen';
import { QuestStatus } from '@models/types';
import { getStorageMock, primeStorageDefaults } from '../../helpers/storage';
import { makeCharacter, makeQuest } from '../../helpers/factories';
import {
  installNavigationMock,
  resetNavigationMocks,
  getLastHeaderRight,
} from '../../helpers/navigation';

// This screen has no route params and drives its own headerRight buttons
// (Regenerate/Save All) rather than the edit/delete shape the other detail
// screens share, so it doesn't fit describeDetailScreenContract and gets a
// bespoke test file instead.
jest.mock('@utils/characterStorage');

const storage = getStorageMock();

const quest = makeQuest({
  id: 'quest-1',
  name: 'Recover the Cargo',
  status: QuestStatus.NotStarted,
});
const character = makeCharacter({
  id: 'char-1',
  name: 'Alice',
  present: true,
});

describe('QuestProposalScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    primeStorageDefaults();
  });

  afterEach(() => {
    resetNavigationMocks();
  });

  it('shows a loading state before rendering the generated proposals', async () => {
    storage.loadQuests.mockResolvedValue([quest]);
    storage.loadCharacters.mockResolvedValue([character]);

    const { getByText } = render(<QuestProposalScreen />);

    expect(getByText('Generating proposals...')).toBeTruthy();

    await waitFor(() => {
      expect(getByText('Recover the Cargo')).toBeTruthy();
      expect(getByText('Alice')).toBeTruthy();
    });
  });

  it('shows the empty state when there is nothing to propose', async () => {
    const { getByText } = render(<QuestProposalScreen />);

    await waitFor(() => {
      expect(getByText('Nothing to propose')).toBeTruthy();
    });
  });

  it('saves a proposed team and marks it saved', async () => {
    storage.loadQuests.mockResolvedValue([quest]);
    storage.loadCharacters.mockResolvedValue([character]);
    storage.updateQuest.mockResolvedValue(quest);

    const { getByText } = render(<QuestProposalScreen />);

    await waitFor(() => {
      expect(getByText('Save Team')).toBeTruthy();
    });
    fireEvent.press(getByText('Save Team'));

    await waitFor(() => {
      expect(storage.updateQuest).toHaveBeenCalledWith('quest-1', {
        assignedCharacterIds: ['char-1'],
        status: QuestStatus.Assigned,
      });
      expect(getByText('Saved')).toBeTruthy();
    });
  });

  it('navigates back when discarding', async () => {
    const nav = installNavigationMock();

    const { getByText } = render(<QuestProposalScreen />);

    await waitFor(() => {
      expect(getByText('Discard Proposals')).toBeTruthy();
    });
    fireEvent.press(getByText('Discard Proposals'));

    expect(nav.goBack).toHaveBeenCalled();
  });

  it('regenerates proposals from the header Regenerate button', async () => {
    const nav = installNavigationMock();
    storage.loadQuests.mockResolvedValue([quest]);
    storage.loadCharacters.mockResolvedValue([character]);

    render(<QuestProposalScreen />);

    await waitFor(() => {
      expect(nav.setOptions).toHaveBeenCalled();
    });
    const header = render(getLastHeaderRight(nav));

    fireEvent.press(header.getByText('Regenerate'));

    await waitFor(() => {
      expect(storage.loadQuests).toHaveBeenCalledTimes(2);
    });
  });
});
