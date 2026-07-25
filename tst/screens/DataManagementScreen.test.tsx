import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { DataManagementScreen } from '@screens/DataManagementScreen';
import * as characterStorage from '@utils/characterStorage';
import * as gitIntegration from '@utils/gitIntegration';
import { spyOnAlert, pressAlertButton } from '../helpers/alertAndPlatform';
import { makeCharacter } from '../helpers/factories';

jest.mock('@utils/characterStorage');
jest.mock('@utils/exportImport');
// Automocking @utils/gitIntegration still loads the real module once to
// infer the mock shape, which imports the real @octokit/rest — whose
// transitive `universal-user-agent` dependency ships ESM outside
// transformIgnorePatterns. Stub it out so that load never happens for real.
jest.mock('@octokit/rest', () => ({ Octokit: jest.fn() }));
jest.mock('@utils/gitIntegration');
jest.mock('@utils/discordStorage');

const storage = jest.mocked(characterStorage);
const git = jest.mocked(gitIntegration);

const emptyDataset = () => ({
  characters: [],
  factions: [],
  locations: [],
  events: [],
  quests: [],
});

describe('DataManagementScreen', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = spyOnAlert();
    git.getGitHubConfig.mockResolvedValue({ token: 'abc123' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the "Set Up GitHub Token" button when no token is configured', async () => {
    git.getGitHubConfig.mockResolvedValue({});

    const { getByText, queryByText } = render(<DataManagementScreen />);

    await waitFor(() => {
      expect(getByText('Set Up GitHub Token')).toBeTruthy();
    });
    expect(queryByText('Sync from GitHub (Merge)')).toBeNull();
  });

  it('shows sync actions and last-sync status once configured', async () => {
    git.getGitHubConfig.mockResolvedValue({
      token: 'abc123',
      sync: { pulledAt: '2026-01-01T00:00:00.000Z' },
    });

    const { getByText } = render(<DataManagementScreen />);

    await waitFor(() => {
      expect(getByText('Sync from GitHub (Merge)')).toBeTruthy();
      expect(getByText('Export to GitHub (Create PR)')).toBeTruthy();
      expect(getByText('Import from GitHub (Replace)')).toBeTruthy();
      expect(getByText(/Last synced:/)).toBeTruthy();
    });
  });

  it('confirms before replacing local data, then imports on confirmation', async () => {
    git.importFromGitHub.mockResolvedValue({
      success: true,
      data: JSON.stringify(emptyDataset()),
    });
    (storage.importDataset as jest.Mock).mockResolvedValue(true);

    const { getByText } = render(<DataManagementScreen />);
    await waitFor(() => getByText('Import from GitHub (Replace)'));

    fireEvent.press(getByText('Import from GitHub (Replace)'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Replace Local Data?',
      expect.stringContaining('overwrites your local'),
      expect.any(Array)
    );

    await pressAlertButton(alertSpy, 'Replace');

    await waitFor(() => {
      expect(git.importFromGitHub).toHaveBeenCalled();
      expect(storage.importDataset).toHaveBeenCalledWith(
        JSON.stringify(emptyDataset())
      );
    });
  });

  it('auto-applies a merge sync with no conflicts, without showing the conflict modal', async () => {
    git.computeGitHubSyncPlan.mockResolvedValue({
      success: true,
      remoteCommitSha: 'remote-sha',
      plan: {
        merged: emptyDataset(),
        conflicts: [],
        stats: {
          characters: { added: 0, updated: 0, removed: 0, conflicted: 0 },
          factions: { added: 0, updated: 0, removed: 0, conflicted: 0 },
          locations: { added: 0, updated: 0, removed: 0, conflicted: 0 },
          events: { added: 0, updated: 0, removed: 0, conflicted: 0 },
          quests: { added: 0, updated: 0, removed: 0, conflicted: 0 },
        },
      },
    });
    git.applyGitHubSyncPlan.mockResolvedValue({ success: true });

    const { getByText, queryByText } = render(<DataManagementScreen />);
    await waitFor(() => getByText('Sync from GitHub (Merge)'));

    fireEvent.press(getByText('Sync from GitHub (Merge)'));

    await waitFor(() => {
      expect(git.applyGitHubSyncPlan).toHaveBeenCalledWith(
        expect.any(Object),
        {},
        'remote-sha'
      );
    });
    expect(queryByText('Resolve Sync Conflicts')).toBeNull();
    expect(alertSpy).toHaveBeenCalledWith(
      'Sync Successful',
      expect.any(String),
      expect.any(Array)
    );
  });

  it('shows the conflict modal when the merge plan has conflicts, and applies the chosen resolution', async () => {
    const local = makeCharacter({ id: 'c1', name: 'Alice', notes: 'mine' });
    const remote = { ...local, notes: 'theirs' };
    git.computeGitHubSyncPlan.mockResolvedValue({
      success: true,
      remoteCommitSha: 'remote-sha',
      plan: {
        merged: { ...emptyDataset(), characters: [local] },
        conflicts: [
          {
            collection: 'characters',
            key: 'c1',
            label: 'Alice',
            fields: ['notes'],
            local,
            remote,
          },
        ],
        stats: {
          characters: { added: 0, updated: 0, removed: 0, conflicted: 1 },
          factions: { added: 0, updated: 0, removed: 0, conflicted: 0 },
          locations: { added: 0, updated: 0, removed: 0, conflicted: 0 },
          events: { added: 0, updated: 0, removed: 0, conflicted: 0 },
          quests: { added: 0, updated: 0, removed: 0, conflicted: 0 },
        },
      },
    });
    git.applyGitHubSyncPlan.mockResolvedValue({ success: true });

    const { getByText } = render(<DataManagementScreen />);
    await waitFor(() => getByText('Sync from GitHub (Merge)'));

    fireEvent.press(getByText('Sync from GitHub (Merge)'));

    await waitFor(() => {
      expect(getByText('Resolve Sync Conflicts')).toBeTruthy();
      expect(getByText('Character: Alice')).toBeTruthy();
    });
    expect(git.applyGitHubSyncPlan).not.toHaveBeenCalled();

    fireEvent.press(getByText('Apply'));

    await waitFor(() => {
      expect(git.applyGitHubSyncPlan).toHaveBeenCalledWith(
        expect.any(Object),
        { 'characters:c1': 'local' },
        'remote-sha'
      );
    });
  });

  it('offers to sync first or export anyway when the remote has moved', async () => {
    git.exportToGitHub.mockResolvedValueOnce({
      success: false,
      remoteMoved: true,
      errorKind: 'conflict',
      error: 'The repository has changed since your last sync.',
    });
    git.exportToGitHub.mockResolvedValueOnce({
      success: true,
      prUrl: 'https://github.com/mccarjac/AWInvestigationsDataLibrary/pull/2',
    });

    const { getByText } = render(<DataManagementScreen />);
    await waitFor(() => getByText('Export to GitHub (Create PR)'));

    fireEvent.press(getByText('Export to GitHub (Create PR)'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Repository Has Changed',
        expect.any(String),
        expect.any(Array)
      );
    });

    await pressAlertButton(alertSpy, 'Export Anyway');

    await waitFor(() => {
      expect(git.exportToGitHub).toHaveBeenLastCalledWith({ force: true });
    });
  });
});
