import { Octokit } from '@octokit/rest';
import { Buffer } from 'buffer';
import * as FileSystem from 'expo-file-system/legacy';
import * as characterStorage from '@utils/characterStorage';
import {
  applyGitHubSyncPlan,
  computeGitHubSyncPlan,
  exportToGitHub,
  getGitHubConfig,
  importFromGitHub,
  isGitHubConfigured,
  saveGitHubConfig,
  verifyGitHubToken,
} from '@utils/gitIntegration';
import { makeCharacter } from '../helpers/factories';
import type { SyncDataset, SyncPlan } from '@utils/syncMerge';
import {
  createMockOctokitClient,
  octokitError,
  primeMockOctokitDefaults,
  MockOctokitClient,
} from '../helpers/octokit';

// characterStorage.ts (imported by gitIntegration.ts for `exportDataset`)
// pulls in the real `uuid` package, which ships ESM and isn't in
// transformIgnorePatterns.
jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid-1234') }));
jest.mock('@utils/characterStorage');
// An explicit factory (rather than a bare `jest.mock('@octokit/rest')`)
// avoids ever loading the real package — automocking would still require it
// once to infer the mock shape, and its transitive `universal-user-agent`
// dependency ships ESM outside `transformIgnorePatterns`.
jest.mock('@octokit/rest', () => ({ Octokit: jest.fn() }));

const CONFIG_PATH = 'file://mock-document-directory/@github_config';
const SYNC_BASE_PATH = 'file://mock-document-directory/@github_sync_base.json';

const emptyExportedDataset = () =>
  JSON.stringify({
    characters: [],
    factions: [],
    locations: [],
    events: [],
    quests: [],
    discord: {},
    version: '1.0',
    lastUpdated: '2026-01-01T00:00:00.000Z',
  });

describe('gitIntegration', () => {
  let client: MockOctokitClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = createMockOctokitClient();
    primeMockOctokitDefaults(client);
    (Octokit as unknown as jest.Mock).mockImplementation(() => client);
    (FileSystem.readAsStringAsync as jest.Mock).mockReset();
    (FileSystem.writeAsStringAsync as jest.Mock).mockReset();
    (FileSystem.getInfoAsync as jest.Mock).mockReset();
    (FileSystem.makeDirectoryAsync as jest.Mock).mockResolvedValue(undefined);
    (characterStorage.exportDataset as jest.Mock).mockResolvedValue(
      emptyExportedDataset()
    );
  });

  describe('config persistence', () => {
    it('returns an empty config when no file has been written yet', async () => {
      (FileSystem.readAsStringAsync as jest.Mock).mockRejectedValue(
        new Error('ENOENT')
      );

      await expect(getGitHubConfig()).resolves.toEqual({});
    });

    it('round-trips a saved config through readAsStringAsync/writeAsStringAsync', async () => {
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
        JSON.stringify({ token: 'abc123' })
      );

      await expect(getGitHubConfig()).resolves.toEqual({ token: 'abc123' });

      await saveGitHubConfig({ token: 'xyz789' });

      expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        CONFIG_PATH,
        JSON.stringify({ token: 'xyz789' })
      );
    });
  });

  describe('isGitHubConfigured', () => {
    it('is false with no stored token', async () => {
      (FileSystem.readAsStringAsync as jest.Mock).mockRejectedValue(
        new Error('ENOENT')
      );

      await expect(isGitHubConfigured()).resolves.toBe(false);
    });

    it('is true once a token is stored', async () => {
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
        JSON.stringify({ token: 'abc123' })
      );

      await expect(isGitHubConfigured()).resolves.toBe(true);
    });
  });

  describe('verifyGitHubToken', () => {
    it('resolves valid for a token the API accepts', async () => {
      client.rest.users.getAuthenticated.mockResolvedValue({
        data: { login: 'test-user' },
      });

      await expect(verifyGitHubToken('good-token')).resolves.toEqual({
        valid: true,
      });
    });

    it('resolves invalid with an auth-kind error for a rejected token', async () => {
      client.rest.users.getAuthenticated.mockRejectedValue(
        octokitError(401, 'Bad credentials')
      );

      const result = await verifyGitHubToken('bad-token');

      expect(result.valid).toBe(false);
      expect(result.error?.kind).toBe('auth');
    });

    it('resolves invalid with an offline-kind error when the request fails offline (not "invalid token")', async () => {
      client.rest.users.getAuthenticated.mockRejectedValue(
        new Error('Network request failed')
      );

      const result = await verifyGitHubToken('good-token');

      expect(result.valid).toBe(false);
      expect(result.error?.kind).toBe('offline');
      expect(result.error?.message).not.toMatch(/invalid token/i);
    });
  });

  describe('exportToGitHub', () => {
    beforeEach(() => {
      (FileSystem.readAsStringAsync as jest.Mock).mockImplementation(
        (path: string) => {
          if (path === CONFIG_PATH) {
            return Promise.resolve(JSON.stringify({ token: 'abc123' }));
          }
          return Promise.reject(new Error(`unexpected read: ${path}`));
        }
      );
      client.rest.repos.getContent.mockRejectedValue(
        octokitError(404, 'Not Found')
      );
    });

    it('fails fast when no token is configured', async () => {
      (FileSystem.readAsStringAsync as jest.Mock).mockRejectedValue(
        new Error('ENOENT')
      );

      const result = await exportToGitHub();

      expect(result).toEqual({
        success: false,
        error: 'GitHub token not configured. Please set up your token first.',
      });
      expect(client.rest.git.createRef).not.toHaveBeenCalled();
    });

    it('fails when the repository cannot be verified', async () => {
      client.rest.repos.get.mockRejectedValue(octokitError(404, 'Not Found'));

      const result = await exportToGitHub();

      expect(result.success).toBe(false);
      expect(result.errorKind).toBe('notFound');
    });

    it('creates a branch, commits data.json, and opens a PR on the happy path', async () => {
      const result = await exportToGitHub();

      expect(result.success).toBe(true);
      expect(result.prUrl).toBe(
        'https://github.com/mccarjac/AWInvestigationsDataLibrary/pull/1'
      );

      expect(client.rest.git.createRef).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'mccarjac',
          repo: 'AWInvestigationsDataLibrary',
          sha: 'base-sha',
        })
      );
      expect(client.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'data.json' })
      );
      expect(client.rest.pulls.create).toHaveBeenCalledWith(
        expect.objectContaining({
          base: 'main',
          head: expect.stringMatching(/^data-export-/),
        })
      );
      expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        CONFIG_PATH,
        expect.stringContaining('lastSync')
      );
    });

    it('swallows a failed image blob upload and still succeeds (current behavior)', async () => {
      (characterStorage.exportDataset as jest.Mock).mockResolvedValue(
        JSON.stringify({
          characters: [
            {
              id: 'c1',
              name: 'Alice',
              imageUris: ['data:image/png;base64,QQ=='],
            },
          ],
          factions: [],
          locations: [],
          events: [],
          quests: [],
          version: '1.0',
          lastUpdated: '2026-01-01T00:00:00.000Z',
        })
      );
      client.rest.git.createBlob.mockRejectedValue(new Error('blob failed'));

      const result = await exportToGitHub();

      expect(result.success).toBe(true);
      expect(client.rest.git.createTree).toHaveBeenCalledWith(
        expect.objectContaining({ tree: [] })
      );
    });

    it('cleans up the created branch when a later step fails', async () => {
      client.rest.git.getCommit.mockRejectedValue(
        new Error('Network request failed')
      );

      const result = await exportToGitHub();

      expect(result.success).toBe(false);
      expect(result.errorKind).toBe('offline');
      expect(client.rest.git.createRef).toHaveBeenCalled();
      expect(client.rest.git.deleteRef).toHaveBeenCalledWith(
        expect.objectContaining({
          ref: expect.stringMatching(/^heads\/data-export-/),
        })
      );
    });

    it('does not attempt cleanup when branch creation itself failed', async () => {
      client.rest.git.createRef.mockRejectedValue(
        new Error('Network request failed')
      );

      const result = await exportToGitHub();

      expect(result.success).toBe(false);
      expect(client.rest.git.deleteRef).not.toHaveBeenCalled();
    });

    it('detects the remote has moved and refuses to export without force', async () => {
      (FileSystem.readAsStringAsync as jest.Mock).mockImplementation(
        (path: string) => {
          if (path === CONFIG_PATH) {
            return Promise.resolve(
              JSON.stringify({
                token: 'abc123',
                sync: { baseCommitSha: 'stale-sha' },
              })
            );
          }
          return Promise.reject(new Error(`unexpected read: ${path}`));
        }
      );
      client.rest.git.getRef.mockResolvedValue({
        data: { object: { sha: 'new-main-sha' } },
      });

      const result = await exportToGitHub();

      expect(result.success).toBe(false);
      expect(result.remoteMoved).toBe(true);
      expect(client.rest.git.createRef).not.toHaveBeenCalled();
    });

    it('exports anyway when forced despite the remote having moved', async () => {
      (FileSystem.readAsStringAsync as jest.Mock).mockImplementation(
        (path: string) => {
          if (path === CONFIG_PATH) {
            return Promise.resolve(
              JSON.stringify({
                token: 'abc123',
                sync: { baseCommitSha: 'stale-sha' },
              })
            );
          }
          return Promise.reject(new Error(`unexpected read: ${path}`));
        }
      );
      client.rest.git.getRef.mockResolvedValue({
        data: { object: { sha: 'new-main-sha' } },
      });

      const result = await exportToGitHub({ force: true });

      expect(result.success).toBe(true);
      expect(client.rest.git.createRef).toHaveBeenCalled();
    });

    it('does not check for a moved remote when no base sha has been recorded yet', async () => {
      const result = await exportToGitHub();

      expect(result.success).toBe(true);
    });

    it('does not update sync.baseCommitSha on a successful push (main has not moved)', async () => {
      (FileSystem.readAsStringAsync as jest.Mock).mockImplementation(
        (path: string) => {
          if (path === CONFIG_PATH) {
            return Promise.resolve(
              JSON.stringify({
                token: 'abc123',
                sync: { baseCommitSha: 'base-sha' },
              })
            );
          }
          return Promise.reject(new Error(`unexpected read: ${path}`));
        }
      );

      await exportToGitHub();

      const [, savedConfigJson] = (FileSystem.writeAsStringAsync as jest.Mock)
        .mock.calls[0];
      const savedConfig = JSON.parse(savedConfigJson);
      expect(savedConfig.sync.baseCommitSha).toBe('base-sha');
      expect(savedConfig.sync.lastPushedPrUrl).toBe(
        'https://github.com/mccarjac/AWInvestigationsDataLibrary/pull/1'
      );
    });
  });

  describe('importFromGitHub', () => {
    beforeEach(() => {
      (FileSystem.readAsStringAsync as jest.Mock).mockImplementation(
        (path: string) => {
          if (path === CONFIG_PATH) {
            return Promise.resolve(JSON.stringify({ token: 'abc123' }));
          }
          return Promise.reject(new Error(`unexpected read: ${path}`));
        }
      );
    });

    const remoteDataset = (imageUris: string[]) => ({
      characters: [{ id: 'c1', name: 'Alice', imageUris }],
      factions: [],
      locations: [],
      events: [],
      quests: [],
      version: '1.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
    });

    it('fails fast when no token is configured', async () => {
      (FileSystem.readAsStringAsync as jest.Mock).mockRejectedValue(
        new Error('ENOENT')
      );

      const result = await importFromGitHub();

      expect(result).toEqual({
        success: false,
        error: 'GitHub token not configured. Please set up your token first.',
      });
    });

    it('fails when the repository cannot be verified', async () => {
      client.rest.repos.get.mockRejectedValue(octokitError(403, 'Forbidden'));

      const result = await importFromGitHub();

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/access denied/i);
    });

    it('skips re-downloading an image already cached locally at the same size', async () => {
      const dataset = remoteDataset(['images/characters/c1_0.jpg']);
      client.rest.repos.getContent.mockImplementation(
        ({ path }: { path: string }) => {
          if (path === 'data.json') {
            return Promise.resolve({
              data: {
                content: Buffer.from(JSON.stringify(dataset)).toString(
                  'base64'
                ),
              },
            });
          }
          return Promise.resolve({ data: { sha: 'img-sha', size: 100 } });
        }
      );
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 100,
      });

      const result = await importFromGitHub();

      expect(result.success).toBe(true);
      expect(client.rest.git.getBlob).not.toHaveBeenCalled();
      const parsed = JSON.parse(result.data as string);
      expect(parsed.characters[0].imageUris[0]).toBe(
        'file://mock-document-directory/images/characters/c1_0.jpg'
      );
    });

    it('downloads an image via the git blob API on a cache miss', async () => {
      const dataset = remoteDataset(['images/characters/c1_0.jpg']);
      client.rest.repos.getContent.mockImplementation(
        ({ path }: { path: string }) => {
          if (path === 'data.json') {
            return Promise.resolve({
              data: {
                content: Buffer.from(JSON.stringify(dataset)).toString(
                  'base64'
                ),
              },
            });
          }
          return Promise.resolve({ data: { sha: 'img-sha', size: 100 } });
        }
      );
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: false,
      });
      client.rest.git.getBlob.mockResolvedValue({
        data: { content: 'ZmFrZS1pbWFnZS1kYXRh' },
      });

      const result = await importFromGitHub();

      expect(result.success).toBe(true);
      expect(client.rest.git.getBlob).toHaveBeenCalledWith(
        expect.objectContaining({ file_sha: 'img-sha' })
      );
      expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        'file://mock-document-directory/images/characters/c1_0.jpg',
        'ZmFrZS1pbWFnZS1kYXRh',
        expect.objectContaining({ encoding: 'base64' })
      );
    });

    it('clears imageUri/imageUris when every image for a record fails to download (current behavior)', async () => {
      const dataset = remoteDataset(['images/characters/c1_0.jpg']);
      client.rest.repos.getContent.mockImplementation(
        ({ path }: { path: string }) => {
          if (path === 'data.json') {
            return Promise.resolve({
              data: {
                content: Buffer.from(JSON.stringify(dataset)).toString(
                  'base64'
                ),
              },
            });
          }
          return Promise.reject(new Error('image fetch failed'));
        }
      );

      const result = await importFromGitHub();

      expect(result.success).toBe(true);
      const parsed = JSON.parse(result.data as string);
      expect(parsed.characters[0].imageUri).toBeUndefined();
      expect(parsed.characters[0].imageUris).toBeUndefined();
    });

    it('records lastSync on a successful pull', async () => {
      client.rest.repos.getContent.mockResolvedValue({
        data: {
          content: Buffer.from(JSON.stringify(remoteDataset([]))).toString(
            'base64'
          ),
        },
      });

      await importFromGitHub();

      expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        CONFIG_PATH,
        expect.stringContaining('lastSync')
      );
    });
  });

  describe('computeGitHubSyncPlan / applyGitHubSyncPlan', () => {
    const emptyDataset = (): SyncDataset => ({
      characters: [],
      factions: [],
      locations: [],
      events: [],
      quests: [],
    });

    beforeEach(() => {
      (FileSystem.readAsStringAsync as jest.Mock).mockImplementation(
        (path: string) => {
          if (path === CONFIG_PATH) {
            return Promise.resolve(JSON.stringify({ token: 'abc123' }));
          }
          if (path === SYNC_BASE_PATH) {
            return Promise.reject(new Error('ENOENT'));
          }
          return Promise.reject(new Error(`unexpected read: ${path}`));
        }
      );
      client.rest.repos.getContent.mockImplementation(
        ({ path }: { path: string }) => {
          if (path === 'data.json') {
            return Promise.resolve({
              data: {
                content: Buffer.from(JSON.stringify(emptyDataset())).toString(
                  'base64'
                ),
              },
            });
          }
          return Promise.reject(octokitError(404, 'Not Found'));
        }
      );
      client.rest.git.getRef.mockResolvedValue({
        data: { object: { sha: 'remote-commit-sha' } },
      });
      (characterStorage.exportDataset as jest.Mock).mockResolvedValue(
        JSON.stringify(emptyDataset())
      );
    });

    it('propagates a failure to fetch the remote dataset', async () => {
      client.rest.repos.get.mockRejectedValue(octokitError(404, 'Not Found'));

      const result = await computeGitHubSyncPlan();

      expect(result.success).toBe(false);
      expect(result.errorKind).toBe('notFound');
    });

    it('falls back to a two-way plan when there is no base snapshot yet', async () => {
      const localOnly = makeCharacter({ id: 'local-1', name: 'Local Only' });
      (characterStorage.exportDataset as jest.Mock).mockResolvedValue(
        JSON.stringify({ ...emptyDataset(), characters: [localOnly] })
      );

      const result = await computeGitHubSyncPlan();

      expect(result.success).toBe(true);
      expect(result.remoteCommitSha).toBe('remote-commit-sha');
      // Two-way fallback keeps the local-only record without flagging it.
      expect(result.plan?.merged.characters).toEqual([localOnly]);
      expect(result.plan?.conflicts).toEqual([]);
    });

    it('surfaces a genuine conflict against a saved base snapshot', async () => {
      const base = makeCharacter({ id: 'c1', name: 'Alice', notes: 'base' });
      const local = { ...base, notes: 'local edit' };
      const remote = { ...base, notes: 'remote edit' };

      (FileSystem.readAsStringAsync as jest.Mock).mockImplementation(
        (path: string) => {
          if (path === CONFIG_PATH) {
            return Promise.resolve(JSON.stringify({ token: 'abc123' }));
          }
          if (path === SYNC_BASE_PATH) {
            return Promise.resolve(
              JSON.stringify({ ...emptyDataset(), characters: [base] })
            );
          }
          return Promise.reject(new Error(`unexpected read: ${path}`));
        }
      );
      client.rest.repos.getContent.mockImplementation(
        ({ path }: { path: string }) => {
          if (path === 'data.json') {
            return Promise.resolve({
              data: {
                content: Buffer.from(
                  JSON.stringify({ ...emptyDataset(), characters: [remote] })
                ).toString('base64'),
              },
            });
          }
          return Promise.reject(octokitError(404, 'Not Found'));
        }
      );
      (characterStorage.exportDataset as jest.Mock).mockResolvedValue(
        JSON.stringify({ ...emptyDataset(), characters: [local] })
      );

      const result = await computeGitHubSyncPlan();

      expect(result.success).toBe(true);
      expect(result.plan?.conflicts).toHaveLength(1);
      expect(result.plan?.conflicts[0]).toMatchObject({
        collection: 'characters',
        key: 'c1',
        fields: ['notes'],
      });
    });

    it('applies a plan, saves the merge base, and records the new baseCommitSha', async () => {
      const remote = makeCharacter({ id: 'c1', name: 'Alice' });
      const plan: SyncPlan = {
        merged: { ...emptyDataset(), characters: [remote] },
        conflicts: [],
        stats: {
          characters: { added: 1, updated: 0, removed: 0, conflicted: 0 },
          factions: { added: 0, updated: 0, removed: 0, conflicted: 0 },
          locations: { added: 0, updated: 0, removed: 0, conflicted: 0 },
          events: { added: 0, updated: 0, removed: 0, conflicted: 0 },
          quests: { added: 0, updated: 0, removed: 0, conflicted: 0 },
        },
      };
      (characterStorage.applyMergedDataset as jest.Mock).mockResolvedValue(
        true
      );
      (FileSystem.readAsStringAsync as jest.Mock).mockImplementation(
        (path: string) => {
          if (path === CONFIG_PATH) {
            return Promise.resolve(JSON.stringify({ token: 'abc123' }));
          }
          return Promise.reject(new Error(`unexpected read: ${path}`));
        }
      );

      const result = await applyGitHubSyncPlan(plan, {}, 'remote-commit-sha');

      expect(result.success).toBe(true);
      expect(characterStorage.applyMergedDataset).toHaveBeenCalledWith(
        plan.merged
      );
      expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        SYNC_BASE_PATH,
        JSON.stringify(plan.merged)
      );
      const [, savedConfigJson] = (
        FileSystem.writeAsStringAsync as jest.Mock
      ).mock.calls.find(([path]) => path === CONFIG_PATH) as [string, string];
      const savedConfig = JSON.parse(savedConfigJson);
      expect(savedConfig.sync.baseCommitSha).toBe('remote-commit-sha');
      expect(savedConfig.sync.pulledAt).toEqual(expect.any(String));
    });

    it('does not persist a base snapshot or config update when the local write fails', async () => {
      const plan: SyncPlan = {
        merged: emptyDataset(),
        conflicts: [],
        stats: {
          characters: { added: 0, updated: 0, removed: 0, conflicted: 0 },
          factions: { added: 0, updated: 0, removed: 0, conflicted: 0 },
          locations: { added: 0, updated: 0, removed: 0, conflicted: 0 },
          events: { added: 0, updated: 0, removed: 0, conflicted: 0 },
          quests: { added: 0, updated: 0, removed: 0, conflicted: 0 },
        },
      };
      (characterStorage.applyMergedDataset as jest.Mock).mockResolvedValue(
        false
      );

      const result = await applyGitHubSyncPlan(plan, {}, 'remote-commit-sha');

      expect(result.success).toBe(false);
      expect(FileSystem.writeAsStringAsync).not.toHaveBeenCalled();
    });
  });
});
