import * as characterStorage from '@utils/characterStorage';

/**
 * Typed access to the automocked `@utils/characterStorage` module. Test files
 * must call `jest.mock('@utils/characterStorage')` themselves — the helper
 * only assumes the mock is already registered.
 */
export const getStorageMock = () => jest.mocked(characterStorage);

/**
 * Primes every loader the templated screens touch with benign values so an
 * automocked module (whose functions resolve `undefined` by default) doesn't
 * crash screens on `.find(...)`/`.forEach(...)`. Call in `beforeEach` before
 * any per-test priming.
 */
export function primeStorageDefaults(): void {
  const storage = getStorageMock();
  storage.loadCharacters.mockResolvedValue([]);
  storage.loadFactions.mockResolvedValue([]);
  storage.loadLocations.mockResolvedValue([]);
  storage.loadEvents.mockResolvedValue([]);
  storage.loadQuests.mockResolvedValue([]);
  storage.getFactionDescription.mockResolvedValue('');
  storage.migrateFactionDescriptions.mockResolvedValue(undefined);
  storage.migrateImageUris.mockResolvedValue(undefined);
  storage.getLocation.mockResolvedValue(null);
  storage.getAllStoredFactions.mockResolvedValue([]);
}
