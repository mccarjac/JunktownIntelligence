import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { CharacterFormScreen } from '@screens/character/CharacterFormScreen';
import { getStorageMock, primeStorageDefaults } from '../../helpers/storage';
import { makeCharacter } from '../../helpers/factories';
import {
  installNavigationMock,
  installRouteParams,
  resetNavigationMocks,
} from '../../helpers/navigation';
import { spyOnAlert } from '../../helpers/alertAndPlatform';

// This screen validates via Alert.alert (no inline error text) and renders
// its submit action with RN's <Button>, not a styled TouchableOpacity like
// the other form screens, so it doesn't fit describeFormScreenContract and
// gets a bespoke test file instead.
jest.mock('@utils/characterStorage');

const storage = getStorageMock();

describe('CharacterFormScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    primeStorageDefaults();
    installRouteParams({});
  });

  afterEach(() => {
    resetNavigationMocks();
    jest.restoreAllMocks();
  });

  it('shows the create action when no character is being edited', async () => {
    const { getByText } = render(<CharacterFormScreen />);

    await waitFor(() => {
      expect(getByText('Create Character')).toBeTruthy();
    });
  });

  it('alerts instead of creating when the name is blank', async () => {
    const alertSpy = spyOnAlert();

    const { getByText } = render(<CharacterFormScreen />);

    await waitFor(() => {
      expect(getByText('Create Character')).toBeTruthy();
    });
    fireEvent.press(getByText('Create Character'));

    expect(alertSpy).toHaveBeenCalledWith('Error', 'Name is required');
    expect(storage.addCharacter).not.toHaveBeenCalled();
  });

  it('creates the character and navigates back on success', async () => {
    const nav = installNavigationMock();
    storage.addCharacter.mockResolvedValue(
      makeCharacter({ id: 'new-1', name: 'Newbie' })
    );
    storage.saveCharacters.mockResolvedValue(undefined);

    const { getByText, getByPlaceholderText } = render(<CharacterFormScreen />);

    await waitFor(() => {
      expect(getByText('Create Character')).toBeTruthy();
    });
    fireEvent.changeText(getByPlaceholderText('Character Name'), 'Newbie');
    fireEvent.press(getByText('Create Character'));

    await waitFor(() => {
      expect(storage.addCharacter).toHaveBeenCalled();
      expect(nav.goBack).toHaveBeenCalled();
    });
  });

  it('prefills existing data and updates instead of creating', async () => {
    const nav = installNavigationMock();
    const existing = makeCharacter({ id: 'char-1', name: 'Alice' });
    installRouteParams({ character: existing });
    storage.updateCharacter.mockResolvedValue(existing);
    storage.loadCharacters.mockResolvedValue([existing]);
    storage.saveCharacters.mockResolvedValue(undefined);

    const { getByText, getByDisplayValue } = render(<CharacterFormScreen />);

    await waitFor(() => {
      expect(getByDisplayValue('Alice')).toBeTruthy();
      expect(getByText('Update Character')).toBeTruthy();
    });
    fireEvent.press(getByText('Update Character'));

    await waitFor(() => {
      expect(storage.updateCharacter).toHaveBeenCalledWith(
        'char-1',
        expect.objectContaining({ name: 'Alice' })
      );
      expect(nav.goBack).toHaveBeenCalled();
    });
    expect(storage.addCharacter).not.toHaveBeenCalled();
  });
});
