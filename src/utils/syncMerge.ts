/**
 * Pure three-way merge engine for GitHub-backed sync.
 *
 * Given the dataset as it stood at the last successful pull (`base`), the
 * dataset as it stands locally now (`local`), and the dataset just fetched
 * from GitHub (`remote`), this computes which records changed on which side
 * and produces a merge plan: auto-resolved records plus a list of genuine
 * conflicts (both sides changed the same record differently) for the user to
 * resolve.
 *
 * This module does no I/O — no Octokit, no storage, no filesystem — so it is
 * fully unit-testable on its own. Callers are responsible for loading the
 * three datasets and for writing the resolved result back to storage (see
 * `applyMergedDataset` in `characterStorage.ts`).
 */

import type {
  GameCharacter,
  GameEvent,
  GameLocation,
  GameQuest,
} from '@models/types';
import type { StoredFaction } from './characterStorage';

export type SyncCollection =
  | 'characters'
  | 'factions'
  | 'locations'
  | 'events'
  | 'quests';

export interface SyncDataset {
  characters: GameCharacter[];
  factions: StoredFaction[];
  locations: GameLocation[];
  events: GameEvent[];
  quests: GameQuest[];
  // Passed through untouched — Discord data has its own merge path
  // (`importDiscordDataset`) and is not covered by this engine.
  discord?: unknown;
  version?: string;
  lastUpdated?: string;
}

export interface SyncConflict {
  collection: SyncCollection;
  /** Record id, or faction name for the `factions` collection. */
  key: string;
  /** Display name/title for the conflict UI. */
  label: string;
  /**
   * Differing field names, or a sentinel describing an edit-vs-delete
   * conflict ('(deleted locally)' / '(deleted remotely)').
   */
  fields: string[];
  /** `null` means the record was deleted on the local side. */
  local: unknown;
  /** `null` means the record was deleted on the remote side. */
  remote: unknown;
}

export type ConflictResolution = 'local' | 'remote';

export interface SyncCollectionStats {
  added: number;
  updated: number;
  removed: number;
  conflicted: number;
}

export interface SyncPlan {
  /** Fully auto-resolved dataset; conflicting records keep their local value
   * pending resolution via `applyResolutions`. */
  merged: SyncDataset;
  conflicts: SyncConflict[];
  stats: Record<SyncCollection, SyncCollectionStats>;
}

type KeyOf<T> = (record: T) => string;
type LabelOf<T> = (record: T) => string;

// Deletion propagation is disabled for factions: StoredFaction has no `id`
// (see characterStorage.ts) and is keyed by name, so a rename would look
// identical to "deleted the old one, added a new one" and we'd silently drop
// data. A missing faction on either side is therefore always kept.
const COLLECTION_KEYS: {
  [C in SyncCollection]: {
    key: KeyOf<SyncDataset[C][number]>;
    label: LabelOf<SyncDataset[C][number]>;
    allowDelete: boolean;
  };
} = {
  characters: {
    key: (c: GameCharacter) => c.id,
    label: (c: GameCharacter) => c.name,
    allowDelete: true,
  },
  factions: {
    key: (f: StoredFaction) => f.name,
    label: (f: StoredFaction) => f.name,
    allowDelete: false,
  },
  locations: {
    key: (l: GameLocation) => l.id,
    label: (l: GameLocation) => l.name,
    allowDelete: true,
  },
  events: {
    key: (e: GameEvent) => e.id,
    label: (e: GameEvent) => e.title,
    allowDelete: true,
  },
  quests: {
    key: (q: GameQuest) => q.id,
    label: (q: GameQuest) => q.name,
    allowDelete: true,
  },
};

const emptyStats = (): SyncCollectionStats => ({
  added: 0,
  updated: 0,
  removed: 0,
  conflicted: 0,
});

// Structural equality, ignoring key order (unlike a raw JSON.stringify
// comparison, which would flag semantically-identical records as changed
// whenever a rewrite happened to touch key insertion order — e.g. the image
// URI rewrite that runs during export/import).
const deepEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (typeof a !== 'object') return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every(k => deepEqual(aObj[k], bObj[k]));
};

// Images are excluded from change detection: local copies carry `file://`
// paths while the remote/base copies carry repo-relative paths, so the same
// image would otherwise always look "changed". Image sync is unaffected by
// this engine — it stays exactly as gitIntegration.ts handles it today.
const stripImages = (
  record: Record<string, unknown>
): Record<string, unknown> => {
  if (record.imageUri === undefined && record.imageUris === undefined) {
    return record;
  }
  const clone: Record<string, unknown> = { ...record };
  delete clone.imageUri;
  delete clone.imageUris;
  return clone;
};

const recordsEqual = (a: unknown, b: unknown): boolean =>
  deepEqual(
    stripImages(a as Record<string, unknown>),
    stripImages(b as Record<string, unknown>)
  );

const diffFields = (localValue: unknown, remoteValue: unknown): string[] => {
  const local = stripImages(localValue as Record<string, unknown>);
  const remote = stripImages(remoteValue as Record<string, unknown>);
  const fields = new Set<string>([
    ...Object.keys(local),
    ...Object.keys(remote),
  ]);
  const differing: string[] = [];
  for (const field of fields) {
    if (!deepEqual(local[field], remote[field])) {
      differing.push(field);
    }
  }
  return differing;
};

/**
 * Merge a single collection. `base` is `null` when there is no prior sync
 * snapshot (first sync, or a missing/corrupt snapshot file) — in that case we
 * fall back to a two-way comparison: any record differing between local and
 * remote becomes a conflict, additions from either side are kept, and
 * nothing is ever deleted (we have no way to tell "never existed" from
 * "deleted").
 */
const mergeCollection = <C extends SyncCollection>(
  collection: C,
  base: SyncDataset[C] | null,
  local: SyncDataset[C],
  remote: SyncDataset[C]
): {
  merged: SyncDataset[C];
  conflicts: SyncConflict[];
  stats: SyncCollectionStats;
} => {
  const { key, label, allowDelete } = COLLECTION_KEYS[collection];
  type Rec = SyncDataset[C][number];

  const toMap = (records: Rec[]): Map<string, Rec> =>
    new Map(records.map(r => [key(r as never), r]));

  const baseMap = base ? toMap(base) : null;
  const localMap = toMap(local);
  const remoteMap = toMap(remote);

  const allKeys = new Set<string>([
    ...(baseMap ? baseMap.keys() : []),
    ...localMap.keys(),
    ...remoteMap.keys(),
  ]);

  const merged: Rec[] = [];
  const conflicts: SyncConflict[] = [];
  const stats = emptyStats();

  for (const k of allKeys) {
    const inLocal = localMap.has(k);
    const inRemote = remoteMap.has(k);
    const localRec = localMap.get(k);
    const remoteRec = remoteMap.get(k);

    const addConflict = (
      fields: string[],
      localValue: unknown,
      remoteValue: unknown
    ) => {
      conflicts.push({
        collection,
        key: k,
        label: label((localValue ?? remoteValue) as never),
        fields,
        local: localValue ?? null,
        remote: remoteValue ?? null,
      });
      stats.conflicted += 1;
      // Keep the local value pending resolution — never silently prefer
      // remote for a genuine conflict.
      if (localRec) merged.push(localRec);
    };

    if (!baseMap) {
      // Two-way fallback (no merge base available).
      if (inLocal && inRemote) {
        if (recordsEqual(localRec, remoteRec)) {
          merged.push(localRec as Rec);
        } else {
          addConflict(diffFields(localRec, remoteRec), localRec, remoteRec);
        }
      } else if (inLocal) {
        merged.push(localRec as Rec);
      } else if (inRemote) {
        merged.push(remoteRec as Rec);
        stats.added += 1;
      }
      continue;
    }

    const inBase = baseMap.has(k);
    const baseRec = baseMap.get(k);

    if (!inBase) {
      if (inLocal && inRemote) {
        if (recordsEqual(localRec, remoteRec)) {
          merged.push(localRec as Rec);
        } else {
          addConflict(diffFields(localRec, remoteRec), localRec, remoteRec);
        }
      } else if (inLocal) {
        merged.push(localRec as Rec);
      } else if (inRemote) {
        merged.push(remoteRec as Rec);
        stats.added += 1;
      }
      continue;
    }

    // Record existed at the base — determine what changed on each side.
    const localChanged = inLocal ? !recordsEqual(localRec, baseRec) : true;
    const remoteChanged = inRemote ? !recordsEqual(remoteRec, baseRec) : true;

    if (inLocal && inRemote) {
      if (!localChanged && !remoteChanged) {
        merged.push(localRec as Rec);
      } else if (!localChanged && remoteChanged) {
        merged.push(remoteRec as Rec);
        stats.updated += 1;
      } else if (localChanged && !remoteChanged) {
        merged.push(localRec as Rec);
      } else if (recordsEqual(localRec, remoteRec)) {
        merged.push(localRec as Rec);
      } else {
        addConflict(diffFields(localRec, remoteRec), localRec, remoteRec);
      }
      continue;
    }

    if (inLocal && !inRemote) {
      // Deleted on the remote side.
      if (!allowDelete) {
        merged.push(localRec as Rec);
        continue;
      }
      if (!localChanged) {
        stats.removed += 1;
      } else {
        addConflict(['(deleted remotely)'], localRec, null);
      }
      continue;
    }

    if (!inLocal && inRemote) {
      // Deleted on the local side.
      if (!allowDelete) {
        merged.push(remoteRec as Rec);
        continue;
      }
      if (!remoteChanged) {
        stats.removed += 1;
      } else {
        addConflict(['(deleted locally)'], null, remoteRec);
      }
      continue;
    }

    // Deleted on both sides — nothing to do, already absent from `merged`.
  }

  return { merged: merged as SyncDataset[C], conflicts, stats };
};

// A dataset entering this module may not actually satisfy `SyncDataset`'s
// required-array fields: `local` is always well-formed (exportDataset
// defaults every collection), but `remote` is whatever JSON the shared
// repo's data.json happens to contain, and `base` is a snapshot written by
// a possibly-older version of this app. A collection added after that JSON
// was written (or dropped by a manual edit) is simply absent, which used to
// crash `mergeCollection`'s `records.map(...)` with "Cannot read property
// 'map' of undefined" — normalize every collection to `[]` before merging.
const normalizeCollections = (dataset: SyncDataset): SyncDataset => ({
  ...dataset,
  characters: Array.isArray(dataset.characters) ? dataset.characters : [],
  factions: Array.isArray(dataset.factions) ? dataset.factions : [],
  locations: Array.isArray(dataset.locations) ? dataset.locations : [],
  events: Array.isArray(dataset.events) ? dataset.events : [],
  quests: Array.isArray(dataset.quests) ? dataset.quests : [],
});

/**
 * Compute the merge plan for an entire dataset. `discord` is passed through
 * from `remote` untouched — it has its own merge path (see
 * `applyMergedDataset` / `importDiscordDataset`).
 */
export const computeSyncPlan = (
  rawBase: SyncDataset | null,
  rawLocal: SyncDataset,
  rawRemote: SyncDataset
): SyncPlan => {
  const base = rawBase ? normalizeCollections(rawBase) : null;
  const local = normalizeCollections(rawLocal);
  const remote = normalizeCollections(rawRemote);

  const conflicts: SyncConflict[] = [];
  const stats = {} as Record<SyncCollection, SyncCollectionStats>;

  const characters = mergeCollection(
    'characters',
    base?.characters ?? null,
    local.characters,
    remote.characters
  );
  const factions = mergeCollection(
    'factions',
    base?.factions ?? null,
    local.factions,
    remote.factions
  );
  const locations = mergeCollection(
    'locations',
    base?.locations ?? null,
    local.locations,
    remote.locations
  );
  const events = mergeCollection(
    'events',
    base?.events ?? null,
    local.events,
    remote.events
  );
  const quests = mergeCollection(
    'quests',
    base?.quests ?? null,
    local.quests,
    remote.quests
  );

  conflicts.push(
    ...characters.conflicts,
    ...factions.conflicts,
    ...locations.conflicts,
    ...events.conflicts,
    ...quests.conflicts
  );
  stats.characters = characters.stats;
  stats.factions = factions.stats;
  stats.locations = locations.stats;
  stats.events = events.stats;
  stats.quests = quests.stats;

  return {
    merged: {
      characters: characters.merged,
      factions: factions.merged,
      locations: locations.merged,
      events: events.merged,
      quests: quests.merged,
      discord: remote.discord,
      version: remote.version,
      lastUpdated: remote.lastUpdated,
    },
    conflicts,
    stats,
  };
};

const conflictResolutionKey = (conflict: SyncConflict): string =>
  `${conflict.collection}:${conflict.key}`;

/**
 * Apply the user's per-conflict choices on top of a `SyncPlan`, producing the
 * final dataset to write to storage. `plan.merged` already contains every
 * conflicting record's local value (see `mergeCollection`'s `addConflict`),
 * so only records resolved to `'remote'` — or deletions — need to be
 * corrected here. Any conflict missing from `resolutions` defaults to
 * `'local'`, matching what `plan.merged` already contains.
 */
export const applyResolutions = (
  plan: SyncPlan,
  resolutions: Record<string, ConflictResolution>
): SyncDataset => {
  const result: SyncDataset = {
    ...plan.merged,
    characters: [...plan.merged.characters],
    factions: [...plan.merged.factions],
    locations: [...plan.merged.locations],
    events: [...plan.merged.events],
    quests: [...plan.merged.quests],
  };

  for (const conflict of plan.conflicts) {
    const resolution = resolutions[conflictResolutionKey(conflict)] ?? 'local';
    if (resolution === 'local') continue; // already reflected in plan.merged

    const { key: keyOf } = COLLECTION_KEYS[conflict.collection];
    const records = result[conflict.collection] as unknown[];
    const index = records.findIndex(r => keyOf(r as never) === conflict.key);

    if (conflict.remote === null) {
      // Resolving to 'remote' when the remote side deleted the record.
      if (index !== -1) records.splice(index, 1);
      continue;
    }

    if (index === -1) {
      records.push(conflict.remote);
    } else {
      records[index] = conflict.remote;
    }
  }

  return result;
};
