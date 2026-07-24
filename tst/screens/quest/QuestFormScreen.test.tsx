import React from 'react';
import { render } from '@testing-library/react-native';
import { QuestFormScreen } from '@screens/quest/QuestFormScreen';
import { describeFormScreenContract } from '../../helpers/screenContracts';
import { getStorageMock } from '../../helpers/storage';
import { makeQuest } from '../../helpers/factories';

jest.mock('@utils/characterStorage');

const storage = getStorageMock();
const existingQuest = makeQuest({ id: 'quest-1', name: 'Old Mission' });

describeFormScreenContract({
  name: 'QuestFormScreen',
  renderScreen: () => render(<QuestFormScreen />),
  requiredFieldPlaceholder: 'Mission name',
  requiredFieldValue: 'Retrieve Artifact',
  validationErrorText: 'Mission name is required',
  submitLabels: { create: 'Create Quest', update: 'Update Quest' },
  createFn: () => storage.createQuest,
  updateFn: () => storage.updateQuest,
  primeCreate: () => {
    storage.createQuest.mockResolvedValue(makeQuest());
  },
  edit: {
    routeParams: { quest: existingQuest },
    prime: () => {
      storage.updateQuest.mockResolvedValue(existingQuest);
    },
    prefilledValue: 'Old Mission',
  },
});
