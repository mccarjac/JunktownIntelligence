import {
  applyResolutions,
  computeSyncPlan,
  SyncDataset,
} from '@/utils/syncMerge';
import {
  makeCharacter,
  makeEvent,
  makeLocation,
  makeQuest,
  makeStoredFaction,
} from '../helpers/factories';

const emptyDataset = (): SyncDataset => ({
  characters: [],
  factions: [],
  locations: [],
  events: [],
  quests: [],
});

describe('computeSyncPlan', () => {
  describe('three-way (base present)', () => {
    it('keeps a record unchanged on both sides', () => {
      const record = makeCharacter({ name: 'Alice' });
      const base = { ...emptyDataset(), characters: [record] };
      const local = { ...emptyDataset(), characters: [record] };
      const remote = { ...emptyDataset(), characters: [record] };

      const plan = computeSyncPlan(base, local, remote);

      expect(plan.merged.characters).toEqual([record]);
      expect(plan.conflicts).toEqual([]);
      expect(plan.stats.characters).toEqual({
        added: 0,
        updated: 0,
        removed: 0,
        conflicted: 0,
      });
    });

    it('takes the remote value when only remote changed', () => {
      const base = makeCharacter({ name: 'Alice', notes: 'base note' });
      const local = { ...base };
      const remote = { ...base, notes: 'remote note' };

      const plan = computeSyncPlan(
        { ...emptyDataset(), characters: [base] },
        { ...emptyDataset(), characters: [local] },
        { ...emptyDataset(), characters: [remote] }
      );

      expect(plan.merged.characters).toEqual([remote]);
      expect(plan.conflicts).toEqual([]);
      expect(plan.stats.characters.updated).toBe(1);
    });

    it('keeps the local value when only local changed', () => {
      const base = makeCharacter({ name: 'Alice', notes: 'base note' });
      const local = { ...base, notes: 'local note' };
      const remote = { ...base };

      const plan = computeSyncPlan(
        { ...emptyDataset(), characters: [base] },
        { ...emptyDataset(), characters: [local] },
        { ...emptyDataset(), characters: [remote] }
      );

      expect(plan.merged.characters).toEqual([local]);
      expect(plan.conflicts).toEqual([]);
    });

    it('reports a conflict when both sides changed the same record differently', () => {
      const base = makeCharacter({ name: 'Alice', notes: 'base note' });
      const local = { ...base, notes: 'local note' };
      const remote = { ...base, notes: 'remote note' };

      const plan = computeSyncPlan(
        { ...emptyDataset(), characters: [base] },
        { ...emptyDataset(), characters: [local] },
        { ...emptyDataset(), characters: [remote] }
      );

      expect(plan.conflicts).toHaveLength(1);
      expect(plan.conflicts[0]).toMatchObject({
        collection: 'characters',
        key: base.id,
        label: 'Alice',
        fields: ['notes'],
        local,
        remote,
      });
      expect(plan.stats.characters.conflicted).toBe(1);
      // The conflicting record keeps the local value pending resolution.
      expect(plan.merged.characters).toEqual([local]);
    });

    it('does not conflict when both sides changed to the same value', () => {
      const base = makeCharacter({ name: 'Alice', notes: 'base note' });
      const local = { ...base, notes: 'same note' };
      const remote = { ...base, notes: 'same note' };

      const plan = computeSyncPlan(
        { ...emptyDataset(), characters: [base] },
        { ...emptyDataset(), characters: [local] },
        { ...emptyDataset(), characters: [remote] }
      );

      expect(plan.conflicts).toEqual([]);
      expect(plan.merged.characters).toEqual([local]);
    });

    it('ignores image field differences (file:// vs repo-relative paths)', () => {
      const base = makeCharacter({ name: 'Alice', imageUri: 'images/a_0.jpg' });
      const local = { ...base, imageUri: 'file:///local/a_0.jpg' };
      const remote = { ...base, imageUri: 'images/a_0.jpg' };

      const plan = computeSyncPlan(
        { ...emptyDataset(), characters: [base] },
        { ...emptyDataset(), characters: [local] },
        { ...emptyDataset(), characters: [remote] }
      );

      expect(plan.conflicts).toEqual([]);
    });

    it('adds a record present only remotely', () => {
      const base = { ...emptyDataset() };
      const local = { ...emptyDataset() };
      const added = makeCharacter({ id: 'c2', name: 'Bob' });
      const remote = { ...emptyDataset(), characters: [added] };

      const plan = computeSyncPlan(base, local, remote);

      expect(plan.merged.characters).toEqual([added]);
      expect(plan.stats.characters.added).toBe(1);
      expect(plan.conflicts).toEqual([]);
    });

    it('keeps a record added only locally (not yet pushed)', () => {
      const added = makeCharacter({ id: 'c3', name: 'Carol' });
      const plan = computeSyncPlan(
        emptyDataset(),
        { ...emptyDataset(), characters: [added] },
        emptyDataset()
      );

      expect(plan.merged.characters).toEqual([added]);
      expect(plan.conflicts).toEqual([]);
    });

    it('propagates a delete when remote removed an unchanged-locally record', () => {
      const record = makeCharacter({ name: 'Alice' });
      const plan = computeSyncPlan(
        { ...emptyDataset(), characters: [record] },
        { ...emptyDataset(), characters: [record] },
        emptyDataset()
      );

      expect(plan.merged.characters).toEqual([]);
      expect(plan.stats.characters.removed).toBe(1);
      expect(plan.conflicts).toEqual([]);
    });

    it('propagates a delete when local removed an unchanged-remotely record', () => {
      const record = makeCharacter({ name: 'Alice' });
      const plan = computeSyncPlan(
        { ...emptyDataset(), characters: [record] },
        emptyDataset(),
        { ...emptyDataset(), characters: [record] }
      );

      expect(plan.merged.characters).toEqual([]);
      expect(plan.stats.characters.removed).toBe(1);
      expect(plan.conflicts).toEqual([]);
    });

    it('reports an edit-vs-delete conflict when local edited what remote deleted', () => {
      const base = makeCharacter({ name: 'Alice', notes: 'base note' });
      const local = { ...base, notes: 'local edit' };

      const plan = computeSyncPlan(
        { ...emptyDataset(), characters: [base] },
        { ...emptyDataset(), characters: [local] },
        emptyDataset()
      );

      expect(plan.conflicts).toHaveLength(1);
      expect(plan.conflicts[0]).toMatchObject({
        fields: ['(deleted remotely)'],
        local,
        remote: null,
      });
      // Kept locally pending resolution.
      expect(plan.merged.characters).toEqual([local]);
    });

    it('reports an edit-vs-delete conflict when remote edited what local deleted', () => {
      const base = makeCharacter({ name: 'Alice', notes: 'base note' });
      const remote = { ...base, notes: 'remote edit' };

      const plan = computeSyncPlan(
        { ...emptyDataset(), characters: [base] },
        emptyDataset(),
        { ...emptyDataset(), characters: [remote] }
      );

      expect(plan.conflicts).toHaveLength(1);
      expect(plan.conflicts[0]).toMatchObject({
        fields: ['(deleted locally)'],
        local: null,
        remote,
      });
      // No local record to keep pending resolution.
      expect(plan.merged.characters).toEqual([]);
    });

    it('does nothing when both sides deleted the same record', () => {
      const record = makeCharacter({ name: 'Alice' });
      const plan = computeSyncPlan(
        { ...emptyDataset(), characters: [record] },
        emptyDataset(),
        emptyDataset()
      );

      expect(plan.merged.characters).toEqual([]);
      expect(plan.conflicts).toEqual([]);
    });

    it('never deletes a faction — a rename would look like delete+add', () => {
      const faction = makeStoredFaction({ name: 'The Fixers' });
      const plan = computeSyncPlan(
        { ...emptyDataset(), factions: [faction] },
        { ...emptyDataset(), factions: [faction] },
        emptyDataset()
      );

      expect(plan.merged.factions).toEqual([faction]);
      expect(plan.conflicts).toEqual([]);
      expect(plan.stats.factions.removed).toBe(0);
    });
  });

  describe('two-way fallback (no base snapshot)', () => {
    it('flags any differing record as a conflict without a base', () => {
      const local = makeLocation({ name: 'Docks', description: 'local' });
      const remote = { ...local, description: 'remote' };

      const plan = computeSyncPlan(
        null,
        { ...emptyDataset(), locations: [local] },
        { ...emptyDataset(), locations: [remote] }
      );

      expect(plan.conflicts).toHaveLength(1);
      expect(plan.stats.locations.conflicted).toBe(1);
    });

    it('never deletes anything without a base', () => {
      const onlyLocal = makeEvent({ id: 'e1', title: 'Local-only event' });

      const plan = computeSyncPlan(
        null,
        { ...emptyDataset(), events: [onlyLocal] },
        emptyDataset()
      );

      expect(plan.merged.events).toEqual([onlyLocal]);
      expect(plan.stats.events.removed).toBe(0);
    });

    it('adds a remote-only record without a base', () => {
      const onlyRemote = makeQuest({ id: 'q1', name: 'Remote-only quest' });

      const plan = computeSyncPlan(null, emptyDataset(), {
        ...emptyDataset(),
        quests: [onlyRemote],
      });

      expect(plan.merged.quests).toEqual([onlyRemote]);
      expect(plan.stats.quests.added).toBe(1);
    });
  });

  it('passes discord data through from remote untouched', () => {
    const plan = computeSyncPlan(
      { ...emptyDataset(), discord: { old: true } },
      { ...emptyDataset(), discord: { old: true } },
      { ...emptyDataset(), discord: { new: true } }
    );

    expect(plan.merged.discord).toEqual({ new: true });
  });
});

describe('applyResolutions', () => {
  it('defaults an unresolved conflict to local (already reflected in plan.merged)', () => {
    const base = makeCharacter({ name: 'Alice', notes: 'base' });
    const local = { ...base, notes: 'local' };
    const remote = { ...base, notes: 'remote' };

    const plan = computeSyncPlan(
      { ...emptyDataset(), characters: [base] },
      { ...emptyDataset(), characters: [local] },
      { ...emptyDataset(), characters: [remote] }
    );

    const result = applyResolutions(plan, {});

    expect(result.characters).toEqual([local]);
  });

  it("applies a 'remote' resolution for an edit/edit conflict", () => {
    const base = makeCharacter({ name: 'Alice', notes: 'base' });
    const local = { ...base, notes: 'local' };
    const remote = { ...base, notes: 'remote' };

    const plan = computeSyncPlan(
      { ...emptyDataset(), characters: [base] },
      { ...emptyDataset(), characters: [local] },
      { ...emptyDataset(), characters: [remote] }
    );

    const result = applyResolutions(plan, {
      [`characters:${base.id}`]: 'remote',
    });

    expect(result.characters).toEqual([remote]);
  });

  it("removes the record when 'remote' is chosen for an edit-vs-delete conflict where remote deleted it", () => {
    const base = makeCharacter({ name: 'Alice', notes: 'base' });
    const local = { ...base, notes: 'local edit' };

    const plan = computeSyncPlan(
      { ...emptyDataset(), characters: [base] },
      { ...emptyDataset(), characters: [local] },
      emptyDataset()
    );

    const result = applyResolutions(plan, {
      [`characters:${base.id}`]: 'remote',
    });

    expect(result.characters).toEqual([]);
  });

  it("adds the record when 'remote' is chosen for an edit-vs-delete conflict where local deleted it", () => {
    const base = makeCharacter({ name: 'Alice', notes: 'base' });
    const remote = { ...base, notes: 'remote edit' };

    const plan = computeSyncPlan(
      { ...emptyDataset(), characters: [base] },
      emptyDataset(),
      { ...emptyDataset(), characters: [remote] }
    );

    const result = applyResolutions(plan, {
      [`characters:${base.id}`]: 'remote',
    });

    expect(result.characters).toEqual([remote]);
  });

  it('does not mutate the plan passed in', () => {
    const base = makeCharacter({ name: 'Alice', notes: 'base' });
    const local = { ...base, notes: 'local' };
    const remote = { ...base, notes: 'remote' };

    const plan = computeSyncPlan(
      { ...emptyDataset(), characters: [base] },
      { ...emptyDataset(), characters: [local] },
      { ...emptyDataset(), characters: [remote] }
    );

    applyResolutions(plan, { [`characters:${base.id}`]: 'remote' });

    expect(plan.merged.characters).toEqual([local]);
  });
});
