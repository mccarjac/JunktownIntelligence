import {
  DEFAULT_GRAPH_PREFERENCES,
  getGraphPreferences,
  resetGraphPreferences,
  updateGraphPreferences,
} from '@/utils/graphPreferences';
import { SafeAsyncStorageJSONParser } from '@/utils/safeAsyncStorageJSONParser';

jest.mock('@/utils/safeAsyncStorageJSONParser');

describe('graphPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getGraphPreferences', () => {
    it('returns the defaults when nothing is stored', async () => {
      (SafeAsyncStorageJSONParser.getItem as jest.Mock).mockResolvedValue(null);

      expect(await getGraphPreferences()).toEqual(DEFAULT_GRAPH_PREFERENCES);
    });

    it('merges a partial stored value over the defaults', async () => {
      (SafeAsyncStorageJSONParser.getItem as jest.Mock).mockResolvedValue({
        spacing: 2,
      });

      expect(await getGraphPreferences()).toEqual({
        ...DEFAULT_GRAPH_PREFERENCES,
        spacing: 2,
      });
    });

    it('clamps out-of-range stored values on read', async () => {
      (SafeAsyncStorageJSONParser.getItem as jest.Mock).mockResolvedValue({
        spacing: 99,
        standingSpread: -5,
        showRetired: 'yes',
      });

      expect(await getGraphPreferences()).toEqual({
        spacing: 3,
        standingSpread: 0,
        showRetired: false,
        hideIsolated: false,
      });
    });
  });

  describe('updateGraphPreferences', () => {
    it('writes the merged and clamped preferences and returns them', async () => {
      (SafeAsyncStorageJSONParser.getItem as jest.Mock).mockResolvedValue({
        spacing: 2,
        standingSpread: 1,
      });
      (SafeAsyncStorageJSONParser.setItem as jest.Mock).mockResolvedValue(true);

      const result = await updateGraphPreferences({ standingSpread: 7 });

      const expected = {
        ...DEFAULT_GRAPH_PREFERENCES,
        spacing: 2,
        standingSpread: 2,
      };
      expect(result).toEqual(expected);
      expect(SafeAsyncStorageJSONParser.setItem).toHaveBeenCalledWith(
        'gameCharacterManager_graph_prefs',
        expected
      );
    });

    it('persists the filter toggles', async () => {
      (SafeAsyncStorageJSONParser.getItem as jest.Mock).mockResolvedValue(null);
      (SafeAsyncStorageJSONParser.setItem as jest.Mock).mockResolvedValue(true);

      const result = await updateGraphPreferences({
        showRetired: true,
        hideIsolated: true,
      });

      expect(result).toEqual({
        ...DEFAULT_GRAPH_PREFERENCES,
        showRetired: true,
        hideIsolated: true,
      });
    });
  });

  describe('resetGraphPreferences', () => {
    it('writes and returns the defaults', async () => {
      (SafeAsyncStorageJSONParser.setItem as jest.Mock).mockResolvedValue(true);

      const result = await resetGraphPreferences();

      expect(result).toEqual(DEFAULT_GRAPH_PREFERENCES);
      expect(SafeAsyncStorageJSONParser.setItem).toHaveBeenCalledWith(
        'gameCharacterManager_graph_prefs',
        DEFAULT_GRAPH_PREFERENCES
      );
    });
  });
});
