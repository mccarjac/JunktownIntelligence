import { runExclusive } from '@/utils/storageQueue';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('runExclusive', () => {
  it('serializes tasks sharing the same key (no overlap)', async () => {
    const events: string[] = [];

    const makeTask = (label: string, ms: number) => async () => {
      events.push(`${label}:start`);
      await delay(ms);
      events.push(`${label}:end`);
      return label;
    };

    // Start a slow task first, then a fast one on the same key. The fast task
    // must not begin until the slow task has finished.
    const p1 = runExclusive('k', makeTask('a', 20));
    const p2 = runExclusive('k', makeTask('b', 1));

    const results = await Promise.all([p1, p2]);

    expect(results).toEqual(['a', 'b']);
    expect(events).toEqual(['a:start', 'a:end', 'b:start', 'b:end']);
  });

  it('runs tasks on different keys concurrently', async () => {
    const events: string[] = [];

    const p1 = runExclusive('key-1', async () => {
      events.push('1:start');
      await delay(20);
      events.push('1:end');
    });
    const p2 = runExclusive('key-2', async () => {
      events.push('2:start');
      await delay(1);
      events.push('2:end');
    });

    await Promise.all([p1, p2]);

    // The fast task on key-2 finishes before the slow task on key-1, proving
    // they overlapped instead of serializing.
    expect(events).toEqual(['1:start', '2:start', '2:end', '1:end']);
  });

  it('propagates the task result and rejection to the caller', async () => {
    await expect(runExclusive('r', async () => 42)).resolves.toBe(42);
    await expect(
      runExclusive('r', async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');
  });

  it('does not stall the queue when a prior task rejects', async () => {
    const order: string[] = [];

    const failing = runExclusive('q', async () => {
      order.push('failing');
      throw new Error('nope');
    });
    const following = runExclusive('q', async () => {
      order.push('following');
      return 'ok';
    });

    await expect(failing).rejects.toThrow('nope');
    await expect(following).resolves.toBe('ok');
    expect(order).toEqual(['failing', 'following']);
  });
});
