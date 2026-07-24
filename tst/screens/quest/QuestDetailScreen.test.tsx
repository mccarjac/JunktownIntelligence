import React from 'react';
import { render } from '@testing-library/react-native';
import { QuestDetailScreen } from '@screens/quest/QuestDetailScreen';
import { describeDetailScreenContract } from '../../helpers/screenContracts';
import { getStorageMock } from '../../helpers/storage';
import { makeQuest } from '../../helpers/factories';

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
      quest: { ...quest, characterNames: [], eventTitles: [] },
    },
  },
  del: {
    deleteFn: () => storage.deleteQuest,
    primeDelete: () => {
      storage.deleteQuest.mockResolvedValue(true);
    },
  },
});
