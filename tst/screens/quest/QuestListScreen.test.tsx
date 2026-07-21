import React from 'react';
import { render } from '@testing-library/react-native';
import { QuestListScreen } from '@screens/quest/QuestListScreen';
import { describeListScreenContract } from '../../helpers/screenContracts';
import { getStorageMock } from '../../helpers/storage';
import { makeQuest } from '../../helpers/factories';

jest.mock('@utils/characterStorage');

const storage = getStorageMock();

describeListScreenContract({
  name: 'QuestListScreen',
  renderScreen: () => render(<QuestListScreen />),
  emptyStateTitle: 'No quests found',
  searchPlaceholder: 'Search quests by name...',
  loadFns: () => [storage.loadQuests],
  primePopulated: () => {
    storage.loadQuests.mockResolvedValue([
      makeQuest({ name: 'Recover the Cargo' }),
    ]);
  },
  populatedTexts: ['Recover the Cargo'],
});
