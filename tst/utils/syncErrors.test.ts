import { classifySyncError } from '@/utils/syncErrors';

describe('classifySyncError', () => {
  it('classifies a 401 as auth, not "invalid token" phrased as offline', () => {
    const result = classifySyncError({
      status: 401,
      message: 'Bad credentials',
    });

    expect(result.kind).toBe('auth');
    expect(result.message).toMatch(/token/i);
    expect(result.detail).toBe('Bad credentials');
  });

  it('classifies a 403 with an exhausted rate limit header as rateLimit', () => {
    const result = classifySyncError({
      status: 403,
      message: 'API rate limit exceeded',
      response: { headers: { 'x-ratelimit-remaining': '0' } },
    });

    expect(result.kind).toBe('rateLimit');
  });

  it('classifies a plain 403 (no exhausted rate limit) as forbidden', () => {
    const result = classifySyncError({
      status: 403,
      message: 'Resource not accessible by personal access token',
    });

    expect(result.kind).toBe('forbidden');
  });

  it('classifies a plain 403 with a non-zero rate limit header as forbidden', () => {
    const result = classifySyncError({
      status: 403,
      message: 'Resource not accessible by personal access token',
      response: { headers: { 'x-ratelimit-remaining': '42' } },
    });

    expect(result.kind).toBe('forbidden');
  });

  it('classifies a 404 as notFound', () => {
    const result = classifySyncError({ status: 404, message: 'Not Found' });

    expect(result.kind).toBe('notFound');
  });

  it('classifies a 409 as conflict', () => {
    const result = classifySyncError({ status: 409, message: 'Conflict' });

    expect(result.kind).toBe('conflict');
  });

  it('classifies a network-failure message as offline', () => {
    const result = classifySyncError(new Error('Network request failed'));

    expect(result.kind).toBe('offline');
    expect(result.message).not.toMatch(/invalid token/i);
    expect(result.message).toMatch(/connection/i);
  });

  it('classifies common fetch/DNS/timeout failure strings as offline', () => {
    const messages = [
      'Failed to fetch',
      'fetch failed',
      'getaddrinfo ENOTFOUND api.github.com',
      'connect ECONNREFUSED 127.0.0.1:443',
      'socket hang up ECONNRESET',
      'ETIMEDOUT',
      'Request timeout',
    ];

    for (const message of messages) {
      expect(classifySyncError(new Error(message)).kind).toBe('offline');
    }
  });

  it('falls back to unknown for an unrecognized Error', () => {
    const result = classifySyncError(new Error('Something exploded'));

    expect(result.kind).toBe('unknown');
    expect(result.message).toBe('Something exploded');
  });

  it('falls back to unknown with generic copy for a non-Error throw', () => {
    const result = classifySyncError('a plain string');

    expect(result.kind).toBe('unknown');
    expect(result.message).toBe('An unexpected error occurred.');
    expect(result.detail).toBeUndefined();
  });

  it('does not throw on null/undefined', () => {
    expect(classifySyncError(null).kind).toBe('unknown');
    expect(classifySyncError(undefined).kind).toBe('unknown');
  });
});
