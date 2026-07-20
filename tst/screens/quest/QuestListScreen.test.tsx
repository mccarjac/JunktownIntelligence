import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { QuestListScreen } from '@screens/quest/QuestListScreen';
import * as characterStorage from '@utils/characterStorage';
import { QuestStatus } from '@models/types';

// Mock the character storage module
jest.mock('@utils/characterStorage', () => ({
  loadQuests: jest.fn(),
}));

describe('QuestListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', async () => {
    (characterStorage.loadQuests as jest.Mock).mockResolvedValue([]);

    const { getByText } = render(<QuestListScreen />);

    await waitFor(() => {
      expect(getByText('No quests found')).toBeTruthy();
    });
  });

  it('should load quests on mount', async () => {
    const mockQuests = [
      {
        id: 'quest-1',
        name: 'Test Quest',
        status: QuestStatus.NotStarted,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      },
    ];

    (characterStorage.loadQuests as jest.Mock).mockResolvedValue(mockQuests);

    const { getByText } = render(<QuestListScreen />);

    await waitFor(() => {
      expect(characterStorage.loadQuests).toHaveBeenCalled();
      expect(getByText('Test Quest')).toBeTruthy();
    });
  });

  it('should display search input', async () => {
    (characterStorage.loadQuests as jest.Mock).mockResolvedValue([]);

    const { getByPlaceholderText } = render(<QuestListScreen />);

    await waitFor(() => {
      expect(getByPlaceholderText('Search quests by name...')).toBeTruthy();
    });
  });
});
