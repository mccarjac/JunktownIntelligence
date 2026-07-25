/**
 * Classifies failures from the GitHub-backed sync (Octokit / network) into a
 * small set of user-facing kinds. Existing code treats every failure —
 * including being offline — identically, which produces misleading copy such
 * as reporting "Invalid Token" when the real cause is no network connection.
 * This module is pure: no I/O, no Octokit import, so it is unit-testable in
 * isolation from the sync core.
 */

export type SyncErrorKind =
  | 'offline'
  | 'auth'
  | 'forbidden'
  | 'notFound'
  | 'rateLimit'
  | 'conflict'
  | 'unknown';

export interface SyncError {
  kind: SyncErrorKind;
  /** Short, user-facing summary suitable for an Alert title/body. */
  message: string;
  /** Raw underlying error message, for a secondary/detail line. */
  detail?: string;
}

// Matches common React Native / fetch network-failure messages. There is no
// connectivity API in this app (see AGENTS.md — new native deps are called
// out and minimized), so offline is inferred from the shape of the error
// rather than observed directly.
const OFFLINE_MESSAGE_PATTERN =
  /network request failed|failed to fetch|fetch failed|enotfound|econnrefused|econnreset|etimedout|timeout/i;

interface OctokitLikeError {
  status?: number;
  message?: string;
  response?: {
    headers?: Record<string, string | undefined>;
  };
}

const isOctokitLikeError = (error: unknown): error is OctokitLikeError =>
  typeof error === 'object' && error !== null;

const messageOf = (error: unknown): string | undefined => {
  if (error instanceof Error) return error.message;
  if (isOctokitLikeError(error) && typeof error.message === 'string') {
    return error.message;
  }
  return undefined;
};

const isRateLimited = (error: OctokitLikeError): boolean =>
  error.response?.headers?.['x-ratelimit-remaining'] === '0';

/**
 * Classify a thrown error from an Octokit call (or any network call in the
 * sync path) into a `SyncError` with user-facing copy. Never throws.
 */
export const classifySyncError = (error: unknown): SyncError => {
  const rawMessage = messageOf(error);

  if (isOctokitLikeError(error) && typeof error.status === 'number') {
    switch (error.status) {
      case 401:
        return {
          kind: 'auth',
          message:
            'Your GitHub token was rejected. It may be invalid, expired, or missing the required permissions.',
          detail: rawMessage,
        };
      case 403:
        if (isRateLimited(error)) {
          return {
            kind: 'rateLimit',
            message:
              "You've hit GitHub's rate limit. Please wait a few minutes and try again.",
            detail: rawMessage,
          };
        }
        return {
          kind: 'forbidden',
          message:
            'Access denied. Your GitHub token does not have permission to do this.',
          detail: rawMessage,
        };
      case 404:
        return {
          kind: 'notFound',
          message:
            'The GitHub repository or file could not be found. Please check the repository configuration.',
          detail: rawMessage,
        };
      case 409:
        return {
          kind: 'conflict',
          message:
            'The repository changed while this operation was running. Please sync again.',
          detail: rawMessage,
        };
      default:
        break;
    }
  }

  if (rawMessage && OFFLINE_MESSAGE_PATTERN.test(rawMessage)) {
    return {
      kind: 'offline',
      message:
        "Couldn't reach GitHub. Check your internet connection and try again — your local data hasn't been changed.",
      detail: rawMessage,
    };
  }

  return {
    kind: 'unknown',
    message: rawMessage || 'An unexpected error occurred.',
    detail: rawMessage,
  };
};
