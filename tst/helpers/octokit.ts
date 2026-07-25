/**
 * A hand-rolled fake Octokit REST client for testing `gitIntegration.ts`.
 * There is no dependency-injection seam in that module (it does
 * `new Octokit({ auth })` internally), so tests mock the `@octokit/rest`
 * module itself:
 *
 *   jest.mock('@octokit/rest');
 *   const { Octokit } = jest.requireMock('@octokit/rest');
 *   const client = createMockOctokitClient();
 *   (Octokit as jest.Mock).mockImplementation(() => client);
 *   primeMockOctokitDefaults(client);
 *
 * Only the namespaces/methods `gitIntegration.ts` actually calls are
 * represented; every method is a `jest.fn()` so any single call can be
 * overridden per test with `mockResolvedValueOnce` / `mockRejectedValueOnce`.
 */

export interface MockOctokitClient {
  rest: {
    users: {
      getAuthenticated: jest.Mock;
    };
    repos: {
      get: jest.Mock;
      getContent: jest.Mock;
      createOrUpdateFileContents: jest.Mock;
    };
    git: {
      getRef: jest.Mock;
      createRef: jest.Mock;
      updateRef: jest.Mock;
      deleteRef: jest.Mock;
      getCommit: jest.Mock;
      createCommit: jest.Mock;
      createBlob: jest.Mock;
      getBlob: jest.Mock;
      createTree: jest.Mock;
    };
    pulls: {
      create: jest.Mock;
    };
  };
}

export const createMockOctokitClient = (): MockOctokitClient => ({
  rest: {
    users: {
      getAuthenticated: jest.fn(),
    },
    repos: {
      get: jest.fn(),
      getContent: jest.fn(),
      createOrUpdateFileContents: jest.fn(),
    },
    git: {
      getRef: jest.fn(),
      createRef: jest.fn(),
      updateRef: jest.fn(),
      deleteRef: jest.fn(),
      getCommit: jest.fn(),
      createCommit: jest.fn(),
      createBlob: jest.fn(),
      getBlob: jest.fn(),
      createTree: jest.fn(),
    },
    pulls: {
      create: jest.fn(),
    },
  },
});

/**
 * Wires up resolved values for the calls that succeed on every "happy path"
 * flow through `exportToGitHub` / `importFromGitHub`. Deliberately leaves
 * `repos.getContent` unset — its expected result differs by call site
 * (data.json existence check, data.json fetch, per-image fetch), so each
 * test configures it explicitly.
 */
export const primeMockOctokitDefaults = (client: MockOctokitClient): void => {
  client.rest.users.getAuthenticated.mockResolvedValue({
    data: { login: 'test-user' },
  });
  client.rest.repos.get.mockResolvedValue({ data: {} });
  client.rest.git.getRef.mockResolvedValue({
    data: { object: { sha: 'base-sha' } },
  });
  client.rest.git.createRef.mockResolvedValue({ data: {} });
  client.rest.repos.createOrUpdateFileContents.mockResolvedValue({
    data: {},
  });
  client.rest.git.getCommit.mockResolvedValue({
    data: { tree: { sha: 'tree-sha' } },
  });
  client.rest.git.createBlob.mockResolvedValue({ data: { sha: 'blob-sha' } });
  client.rest.git.createTree.mockResolvedValue({
    data: { sha: 'new-tree-sha' },
  });
  client.rest.git.createCommit.mockResolvedValue({
    data: { sha: 'new-commit-sha' },
  });
  client.rest.git.updateRef.mockResolvedValue({ data: {} });
  client.rest.git.deleteRef.mockResolvedValue({ data: {} });
  client.rest.git.getBlob.mockResolvedValue({ data: { content: '' } });
  client.rest.pulls.create.mockResolvedValue({
    data: {
      html_url:
        'https://github.com/mccarjac/AWInvestigationsDataLibrary/pull/1',
    },
  });
};

/** Build an Octokit-shaped rejection carrying an HTTP `status`, matching
 * what `@octokit/rest` throws for non-2xx responses. */
export const octokitError = (
  status: number,
  message: string,
  headers?: Record<string, string>
): Error & {
  status: number;
  response?: { headers?: Record<string, string> };
} =>
  Object.assign(new Error(message), {
    status,
    response: headers ? { headers } : undefined,
  });
