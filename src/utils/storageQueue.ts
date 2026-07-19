/**
 * Per-key serialized execution queue.
 *
 * AsyncStorage-backed helpers in this app use a read-modify-write pattern
 * (load the full dataset, mutate it in memory, then write it back). When two
 * such operations for the same storage key run concurrently — e.g. rapidly
 * toggling "present" on several characters, or a faction op that rewrites
 * characters while another character write is in flight — they read the same
 * starting state and the later write silently clobbers the earlier one
 * (a lost update).
 *
 * `runExclusive` serializes work per key: calls sharing a key run one at a
 * time, in the order they were requested, so each read-modify-write sees the
 * result of the previous one. Different keys still run concurrently.
 */

// Tail of the promise chain for each key. Resolves when the last-queued task
// for that key settles.
const queues = new Map<string, Promise<unknown>>();

/**
 * Run `task` exclusively with respect to other tasks sharing the same `key`.
 * The returned promise resolves/rejects with the task's own result; a rejected
 * task does not break the chain for subsequent callers.
 */
export const runExclusive = <T>(
  key: string,
  task: () => Promise<T>
): Promise<T> => {
  const previous = queues.get(key) ?? Promise.resolve();

  // Chain the new task after the previous one, ignoring whether the previous
  // task succeeded or failed so one failure can't stall the queue.
  const run = previous.then(task, task);

  // Keep the queue tail pointing at this task, swallowing its result so the
  // stored chain never rejects (callers still see the real result via `run`).
  queues.set(
    key,
    run.then(
      () => undefined,
      () => undefined
    )
  );

  return run;
};
