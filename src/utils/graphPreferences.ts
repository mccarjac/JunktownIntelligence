import { SafeAsyncStorageJSONParser } from './safeAsyncStorageJSONParser';
import { runExclusive } from './storageQueue';

const GRAPH_PREFS_KEY = 'gameCharacterManager_graph_prefs';

export interface GraphPreferences {
  /**
   * Overall spacing multiplier, 1–3. Scales link rest distances, node
   * repulsion, AND the virtual layout canvas the graph screen renders onto.
   */
  spacing: number;
  /**
   * How strongly relationship standing modulates edge distance, 0–2.
   * 0 means standings don't affect distance at all.
   */
  standingSpread: number;
  /** Show retired characters/factions in the graph. */
  showRetired: boolean;
  /** Hide entities with no connections. */
  hideIsolated: boolean;
}

export const DEFAULT_GRAPH_PREFERENCES: GraphPreferences = {
  spacing: 1.5,
  standingSpread: 1,
  showRetired: false,
  hideIsolated: false,
};

const clampPreferences = (prefs: GraphPreferences): GraphPreferences => ({
  spacing: Math.min(3, Math.max(1, prefs.spacing)),
  standingSpread: Math.min(2, Math.max(0, prefs.standingSpread)),
  showRetired: prefs.showRetired === true,
  hideIsolated: prefs.hideIsolated === true,
});

/**
 * NOTE: intentionally NOT wrapped in `runExclusive` — it is called from
 * inside `updateGraphPreferences`, which already holds the key's lock
 * (same-key nesting deadlocks; see AGENTS.md and the `getDiscordConfig`
 * precedent). Merging a Partial over the defaults keeps stored data from
 * older app versions forward-compatible when fields are added.
 */
export const getGraphPreferences = async (): Promise<GraphPreferences> => {
  const stored =
    await SafeAsyncStorageJSONParser.getItem<Partial<GraphPreferences>>(
      GRAPH_PREFS_KEY
    );
  return clampPreferences({ ...DEFAULT_GRAPH_PREFERENCES, ...stored });
};

export const updateGraphPreferences = (
  updates: Partial<GraphPreferences>
): Promise<GraphPreferences> =>
  runExclusive(GRAPH_PREFS_KEY, async () => {
    const current = await getGraphPreferences();
    const next = clampPreferences({ ...current, ...updates });
    await SafeAsyncStorageJSONParser.setItem(GRAPH_PREFS_KEY, next);
    return next;
  });

export const resetGraphPreferences = (): Promise<GraphPreferences> =>
  runExclusive(GRAPH_PREFS_KEY, async () => {
    await SafeAsyncStorageJSONParser.setItem(
      GRAPH_PREFS_KEY,
      DEFAULT_GRAPH_PREFERENCES
    );
    return DEFAULT_GRAPH_PREFERENCES;
  });
