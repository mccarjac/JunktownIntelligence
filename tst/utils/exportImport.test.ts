import { importCharacterData, mergeCharacterData } from '@/utils/exportImport';
import { SafeAsyncStorageJSONParser } from '@/utils/safeAsyncStorageJSONParser';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert } from 'react-native';

// exportImport.ts calls the REAL characterStorage.importDataset /
// mergeDatasetWithConflictResolution — only the native boundary (file
// picking + reading) is mocked, so these are genuine round-trip tests
// against the already-mocked storage layer.
jest.mock('@/utils/safeAsyncStorageJSONParser');

// characterStorage.ts (imported transitively by exportImport.ts) imports the
// real `uuid` package, which ships ESM and isn't in transformIgnorePatterns.
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234'),
}));

describe('exportImport JSON round trip', () => {
  const mockDate = '2025-01-01T00:00:00.000Z';

  const mockPickedFile = (name: string, uri = 'file://picked/' + name) => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri, name }],
    });
  };

  const mockCancelledPicker = () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: true,
      assets: [],
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

    // Default storage state: nothing stored yet.
    (SafeAsyncStorageJSONParser.getItem as jest.Mock).mockResolvedValue(null);
    (SafeAsyncStorageJSONParser.setItem as jest.Mock).mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('importCharacterData', () => {
    it('imports a valid JSON dataset and replaces stored characters', async () => {
      mockPickedFile('backup.json');
      const dataset = {
        characters: [
          {
            id: 'char-1',
            name: 'Imported Hero',
            species: 'Human',
            perkIds: [],
            distinctionIds: [],
            factions: [],
            relationships: [],
            present: false,
            retired: false,
            createdAt: mockDate,
            updatedAt: mockDate,
          },
        ],
        version: '1.0',
        lastUpdated: mockDate,
      };
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
        JSON.stringify(dataset)
      );

      const result = await importCharacterData();

      expect(result).toBe(true);
      expect(SafeAsyncStorageJSONParser.setItem).toHaveBeenCalledWith(
        'gameCharacterManager',
        expect.objectContaining({
          characters: expect.arrayContaining([
            expect.objectContaining({ id: 'char-1', name: 'Imported Hero' }),
          ]),
        })
      );
      expect(Alert.alert).toHaveBeenCalledWith(
        'Import Successful',
        expect.any(String),
        expect.anything()
      );
    });

    it('strips a legacy imageUri from characters before importing (without images)', async () => {
      mockPickedFile('backup.json');
      const dataset = {
        characters: [
          {
            id: 'char-1',
            name: 'Hero',
            imageUri: 'data:image/png;base64,abc',
            species: 'Human',
            perkIds: [],
            distinctionIds: [],
            factions: [],
            relationships: [],
            createdAt: mockDate,
            updatedAt: mockDate,
          },
        ],
        version: '1.0',
        lastUpdated: mockDate,
      };
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
        JSON.stringify(dataset)
      );

      await importCharacterData();

      const saved = (
        SafeAsyncStorageJSONParser.setItem as jest.Mock
      ).mock.calls.find(c => c[0] === 'gameCharacterManager')?.[1];
      // Plain-JSON import explicitly skips images, so the deprecated
      // imageUri is dropped rather than backfilled into imageUris - there
      // is no accompanying image asset to carry forward.
      expect(saved.characters[0].imageUri).toBeUndefined();
      expect(saved.characters[0].imageUris).toBeUndefined();
    });

    it('returns false without touching storage when the user cancels the picker', async () => {
      mockCancelledPicker();

      const result = await importCharacterData();

      expect(result).toBe(false);
      expect(SafeAsyncStorageJSONParser.setItem).not.toHaveBeenCalled();
    });

    it('returns false and shows an alert when the picked file is malformed JSON', async () => {
      mockPickedFile('corrupt.json');
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
        'not valid json {'
      );

      const result = await importCharacterData();

      expect(result).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith(
        'Import Failed',
        expect.stringContaining('Failed to import game data'),
        expect.anything()
      );
    });
  });

  describe('mergeCharacterData', () => {
    it('merges a valid JSON dataset with no conflicts', async () => {
      mockPickedFile('backup.json');
      const dataset = {
        characters: [
          {
            id: 'char-new',
            name: 'New Character',
            species: 'Human',
            perkIds: [],
            distinctionIds: [],
            factions: [],
            relationships: [],
            present: false,
            retired: false,
            createdAt: mockDate,
            updatedAt: mockDate,
          },
        ],
        factions: [],
        locations: [],
        version: '1.0',
        lastUpdated: mockDate,
      };
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
        JSON.stringify(dataset)
      );
      // mergeDatasetWithConflictResolution loads existing characters/factions
      // first (both empty here).
      (SafeAsyncStorageJSONParser.getItem as jest.Mock).mockResolvedValue(null);

      const result = await mergeCharacterData();

      expect(result).toBe(true);
      expect(SafeAsyncStorageJSONParser.setItem).toHaveBeenCalledWith(
        'gameCharacterManager',
        expect.objectContaining({
          characters: expect.arrayContaining([
            expect.objectContaining({ id: 'char-new' }),
          ]),
        })
      );
      expect(Alert.alert).toHaveBeenCalledWith(
        'Merge Successful',
        expect.stringContaining('1 new item'),
        expect.anything()
      );
    });

    it('surfaces a conflict when the imported character differs from an existing one', async () => {
      mockPickedFile('backup.json');
      const existingCharacter = {
        id: 'char-1',
        name: 'Existing Name',
        species: 'Human',
        perkIds: [],
        distinctionIds: [],
        factions: [],
        relationships: [],
        present: false,
        retired: false,
        createdAt: mockDate,
        updatedAt: mockDate,
      };
      (SafeAsyncStorageJSONParser.getItem as jest.Mock).mockImplementation(
        async (key: string) => {
          if (key === 'gameCharacterManager') {
            return {
              characters: [existingCharacter],
              version: '1.0',
              lastUpdated: mockDate,
            };
          }
          return null;
        }
      );
      const dataset = {
        characters: [{ ...existingCharacter, name: 'Conflicting Name' }],
        version: '1.0',
        lastUpdated: mockDate,
      };
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
        JSON.stringify(dataset)
      );

      const result = await mergeCharacterData();

      expect(result).toBe(true);
      expect(Alert.alert).toHaveBeenCalledWith(
        'Conflicts Found',
        expect.stringContaining('1 item(s)'),
        expect.anything()
      );
    });

    it('returns false without touching storage when the user cancels the picker', async () => {
      mockCancelledPicker();

      const result = await mergeCharacterData();

      expect(result).toBe(false);
      expect(SafeAsyncStorageJSONParser.setItem).not.toHaveBeenCalled();
    });

    it('returns false and shows an alert when the picked file is malformed JSON', async () => {
      mockPickedFile('corrupt.json');
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
        '{not valid'
      );

      const result = await mergeCharacterData();

      expect(result).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith(
        'Merge Failed',
        expect.stringContaining('Failed to merge game data'),
        expect.anything()
      );
    });
  });
});
