import {
  CharacterDataset,
  GameCharacter,
  GameLocation,
  LocationDataset,
  GameEvent,
  EventDataset,
  GameQuest,
  QuestDataset,
  RelationshipStanding,
} from '@models/types';
import { v4 as uuidv4 } from 'uuid';
import { SafeAsyncStorageJSONParser } from './safeAsyncStorageJSONParser';
import { exportDiscordDataset, importDiscordDataset } from './discordStorage';
import { sortDatasetDeterministically } from './datasetSorting';
import { runExclusive } from './storageQueue';

export interface FactionRelationship {
  factionName: string;
  relationshipType: RelationshipStanding;
  description?: string;
}

export interface StoredFaction {
  name: string;
  description: string;
  imageUris?: string[];
  relationships?: FactionRelationship[];
  retired?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FactionDataset {
  factions: StoredFaction[];
  version: string;
  lastUpdated: string;
}

// Runtime-only shape for entities that may still carry the deprecated single
// `imageUri` field. The domain types (GameCharacter, GameLocation, GameEvent,
// GameQuest, StoredFaction) no longer declare it, but data persisted before
// this migration still has it on disk.
interface LegacyImageEntity {
  imageUri?: string;
  imageUris?: string[];
}

// Backfill a legacy single `imageUri` into `imageUris` (when `imageUris` is
// empty) and strip the deprecated field. Used both for in-memory
// normalization on every load and for the one-time persisted migration
// below (`migrateImageUris`).
const normalizeImageUris = <T extends { imageUris?: string[] }>(
  entity: T
): T => {
  const raw = entity as unknown as T & LegacyImageEntity;
  if (raw.imageUri === undefined) return entity;

  const { imageUri, ...rest } = raw;
  const imageUris =
    rest.imageUris && rest.imageUris.length > 0 ? rest.imageUris : [imageUri];

  return { ...rest, imageUris } as T;
};

const hasLegacyImageUri = (entity: { imageUris?: string[] }): boolean =>
  (entity as unknown as LegacyImageEntity).imageUri !== undefined;

const STORAGE_KEY = 'gameCharacterManager';
const FACTION_STORAGE_KEY = 'gameCharacterManager_factions';
const LOCATION_STORAGE_KEY = 'gameCharacterManager_locations';
const EVENT_STORAGE_KEY = 'gameCharacterManager_events';
const QUEST_STORAGE_KEY = 'gameCharacterManager_quests';

export const saveCharacters = async (
  characters: GameCharacter[]
): Promise<void> => {
  const dataset: CharacterDataset = {
    characters,
    version: '1.0',
    lastUpdated: new Date().toISOString(),
  };
  await SafeAsyncStorageJSONParser.setItem(STORAGE_KEY, dataset);
};

export const loadCharacters = async (): Promise<GameCharacter[]> => {
  const dataset =
    await SafeAsyncStorageJSONParser.getItem<CharacterDataset>(STORAGE_KEY);
  if (!dataset || !dataset.characters) return [];

  // Handle backward compatibility - set defaults for missing properties
  return dataset.characters.map(character =>
    normalizeImageUris({
      ...character,
      present: character.present ?? false,
      retired: character.retired ?? false,
      relationships: character.relationships ?? [],
    })
  );
};

export const addCharacter = async (
  character: Omit<GameCharacter, 'id' | 'createdAt' | 'updatedAt'>
): Promise<GameCharacter> =>
  runExclusive(STORAGE_KEY, async () => {
    const characters = await loadCharacters();
    const newCharacter: GameCharacter = {
      ...character,
      id: uuidv4(),
      present: false, // Default to not present
      retired: false, // Default to not retired
      relationships: character.relationships ?? [], // Ensure relationships array exists
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveCharacters([...characters, newCharacter]);
    return newCharacter;
  });

export const updateCharacter = async (
  id: string,
  updates: Partial<GameCharacter>
): Promise<GameCharacter | null> =>
  runExclusive(STORAGE_KEY, async () => {
    const characters = await loadCharacters();
    const index = characters.findIndex(c => c.id === id);

    if (index === -1) return null;

    const updatedCharacter: GameCharacter = {
      ...characters[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    characters[index] = updatedCharacter;
    await saveCharacters(characters);
    return updatedCharacter;
  });

export const deleteCharacter = async (id: string): Promise<boolean> =>
  runExclusive(STORAGE_KEY, async () => {
    const characters = await loadCharacters();
    const filtered = characters.filter(c => c.id !== id);

    if (filtered.length === characters.length) return false;

    await saveCharacters(filtered);
    return true;
  });

export const exportDataset = async (): Promise<string> => {
  const characterData =
    await SafeAsyncStorageJSONParser.getItem<CharacterDataset>(STORAGE_KEY);
  const factionData =
    await SafeAsyncStorageJSONParser.getItem<FactionDataset>(
      FACTION_STORAGE_KEY
    );
  const locationData =
    await SafeAsyncStorageJSONParser.getItem<LocationDataset>(
      LOCATION_STORAGE_KEY
    );
  const eventData =
    await SafeAsyncStorageJSONParser.getItem<EventDataset>(EVENT_STORAGE_KEY);
  const questData =
    await SafeAsyncStorageJSONParser.getItem<QuestDataset>(QUEST_STORAGE_KEY);

  const characters = characterData || {
    characters: [],
    version: '1.0',
    lastUpdated: '',
  };
  const factions = factionData || {
    factions: [],
    version: '1.0',
    lastUpdated: '',
  };
  const locations = locationData || {
    locations: [],
    version: '1.0',
    lastUpdated: '',
  };
  const events = eventData || { events: [], version: '1.0', lastUpdated: '' };
  const quests = questData || { quests: [], version: '1.0', lastUpdated: '' };

  // Export Discord data
  const discordData = await exportDiscordDataset();

  const combinedDataset = {
    characters: characters.characters || [],
    factions: factions.factions || [],
    locations: locations.locations || [],
    events: events.events || [],
    quests: quests.quests || [],
    discord: discordData,
    version: '1.0',
    lastUpdated: new Date().toISOString(),
  };

  // Sort the dataset deterministically to minimize diff noise
  const sortedDataset = sortDatasetDeterministically(combinedDataset);

  return JSON.stringify(sortedDataset);
};

// Migration helper to convert old location enum to location ID
const migrateOldLocationData = async (
  characters: GameCharacter[]
): Promise<void> => {
  const existingLocations = await loadLocations();
  const locationNameToId = new Map<string, string>();

  // Build a map of location names to IDs
  existingLocations.forEach(loc => {
    locationNameToId.set(loc.name.toLowerCase(), loc.id);
  });

  const locationsToCreate = new Map<string, GameLocation>();

  // Process each character
  for (const char of characters) {
    const oldLocation = (char as any).location;

    // If character has old location field but no locationId
    if (oldLocation && !char.locationId) {
      // Check if we already have a location with this name
      let locationId = locationNameToId.get(oldLocation.toLowerCase());

      if (!locationId) {
        // Check if we're already creating this location
        if (locationsToCreate.has(oldLocation)) {
          locationId = locationsToCreate.get(oldLocation)!.id;
        } else {
          // Create a new location
          const now = new Date().toISOString();
          locationId = uuidv4();
          const newLocation: GameLocation = {
            id: locationId,
            name: oldLocation,
            description: `Migrated from old location data: ${oldLocation}`,
            createdAt: now,
            updatedAt: now,
          };
          locationsToCreate.set(oldLocation, newLocation);
          locationNameToId.set(oldLocation.toLowerCase(), locationId);
        }
      }

      // Set the locationId on the character
      char.locationId = locationId;
      // Remove the old location field
      delete (char as any).location;
    }
  }

  // Save any new locations we created
  if (locationsToCreate.size > 0) {
    const newLocationArray = Array.from(locationsToCreate.values());
    const allLocations = [...existingLocations, ...newLocationArray];
    await saveLocations(allLocations);
  }
};

// Helper function to ensure all locations referenced by characters exist
const ensureLocationsExist = async (
  characters: GameCharacter[]
): Promise<void> => {
  const existingLocations = await loadLocations();
  const existingLocationIds = new Set(existingLocations.map(l => l.id));
  const newLocations: GameLocation[] = [];

  // Collect all unique location IDs from characters
  const referencedLocationIds = new Set<string>();
  characters.forEach(char => {
    if (char.locationId) {
      referencedLocationIds.add(char.locationId);
    }
  });

  // Create placeholder locations for any missing location IDs
  for (const locationId of referencedLocationIds) {
    if (!existingLocationIds.has(locationId)) {
      const now = new Date().toISOString();
      const newLocation: GameLocation = {
        id: locationId,
        name: `Imported Location (${locationId.substring(0, 8)})`,
        description:
          'This location was automatically created during import. Please update the name and description.',
        createdAt: now,
        updatedAt: now,
      };
      newLocations.push(newLocation);
    }
  }

  // Save new locations if any were created
  if (newLocations.length > 0) {
    const allLocations = [...existingLocations, ...newLocations];
    await saveLocations(allLocations);
  }
};

export const importDataset = async (jsonData: string): Promise<boolean> => {
  try {
    const dataset = JSON.parse(jsonData);

    // Handle location data first (merge with existing, don't replace)
    if (dataset.locations && Array.isArray(dataset.locations)) {
      const existingLocations = await loadLocations();
      const mergedLocations = [...existingLocations];

      // Add or update locations from import. Normalize any legacy single
      // `imageUri` from an older export/repo into `imageUris` so storage
      // never picks the deprecated field back up.
      for (const rawImportedLocation of dataset.locations) {
        const importedLocation = normalizeImageUris(rawImportedLocation);
        const existingIndex = mergedLocations.findIndex(
          l => l.id === importedLocation.id
        );
        if (existingIndex >= 0) {
          // Update existing location if imported one is newer
          if (
            importedLocation.updatedAt >
            mergedLocations[existingIndex].updatedAt
          ) {
            mergedLocations[existingIndex] = importedLocation;
          }
        } else {
          // Add new location
          mergedLocations.push(importedLocation);
        }
      }

      await saveLocations(mergedLocations);
    }

    // Auto-create any missing locations referenced by characters
    if (dataset.characters) {
      await migrateOldLocationData(dataset.characters);
      await ensureLocationsExist(dataset.characters);
    }

    // Handle character data. Normalize any legacy single `imageUri` from an
    // older export/repo into `imageUris` before persisting.
    const characterDataset: CharacterDataset = {
      characters: (dataset.characters || []).map(normalizeImageUris),
      version: dataset.version || '1.0',
      lastUpdated: dataset.lastUpdated || new Date().toISOString(),
    };
    await SafeAsyncStorageJSONParser.setItem(STORAGE_KEY, characterDataset);

    // Handle faction data if present
    if (dataset.factions) {
      const factionDataset: FactionDataset = {
        factions: dataset.factions.map(normalizeImageUris),
        version: dataset.version || '1.0',
        lastUpdated: dataset.lastUpdated || new Date().toISOString(),
      };
      await SafeAsyncStorageJSONParser.setItem(
        FACTION_STORAGE_KEY,
        factionDataset
      );
    }

    // Handle event data if present
    if (dataset.events) {
      const eventDataset: EventDataset = {
        events: dataset.events.map(normalizeImageUris),
        version: dataset.version || '1.0',
        lastUpdated: dataset.lastUpdated || new Date().toISOString(),
      };
      await SafeAsyncStorageJSONParser.setItem(EVENT_STORAGE_KEY, eventDataset);
    }

    // Handle quest data if present
    if (dataset.quests) {
      const questDataset: QuestDataset = {
        quests: dataset.quests.map(normalizeImageUris),
        version: dataset.version || '1.0',
        lastUpdated: dataset.lastUpdated || new Date().toISOString(),
      };
      await SafeAsyncStorageJSONParser.setItem(QUEST_STORAGE_KEY, questDataset);
    }

    // Import Discord data if present
    if (dataset.discord) {
      await importDiscordDataset(dataset.discord, true); // Merge mode
    }

    return true;
  } catch (error) {
    console.error('[importDataset] Import failed:', error);
    return false;
  }
};

// Enhanced merge interface for conflict resolution
export interface MergeConflict {
  id: string;
  existing: GameCharacter;
  imported: GameCharacter;
  conflicts: string[];
}

export interface MergeResult {
  success: boolean;
  conflicts: MergeConflict[];
  merged: GameCharacter[];
  added: GameCharacter[];
}

// Smart property merger that combines properties intelligently
const mergeCharacterProperties = (
  existing: GameCharacter,
  imported: GameCharacter
): { merged: GameCharacter; conflicts: string[] } => {
  const conflicts: string[] = [];
  const merged: GameCharacter = { ...existing };

  // Always use the most recent updatedAt timestamp
  if (imported.updatedAt > existing.updatedAt) {
    merged.updatedAt = imported.updatedAt;
  }

  // Merge arrays (like perkIds, distinctionIds, factions)
  if (imported.perkIds && imported.perkIds.length > 0) {
    const existingPerkIds = new Set(existing.perkIds || []);
    const newPerks = imported.perkIds.filter(id => !existingPerkIds.has(id));
    if (newPerks.length > 0) {
      merged.perkIds = [...(existing.perkIds || []), ...newPerks];
    }
  }

  if (imported.distinctionIds && imported.distinctionIds.length > 0) {
    const existingDistinctionIds = new Set(existing.distinctionIds || []);
    const newDistinctions = imported.distinctionIds.filter(
      id => !existingDistinctionIds.has(id)
    );
    if (newDistinctions.length > 0) {
      merged.distinctionIds = [
        ...(existing.distinctionIds || []),
        ...newDistinctions,
      ];
    }
  }

  // Merge factions (keep all unique factions)
  if (imported.factions && imported.factions.length > 0) {
    const existingFactionNames = new Set(
      (existing.factions || []).map(f => f.name)
    );
    const newFactions = imported.factions.filter(
      f => !existingFactionNames.has(f.name)
    );
    if (newFactions.length > 0) {
      merged.factions = [...(existing.factions || []), ...newFactions];
    }
  }

  // Merge relationships (keep all unique relationships by character name)
  if (imported.relationships && imported.relationships.length > 0) {
    const existingRelationshipNames = new Set(
      (existing.relationships || []).map(r => r.characterName)
    );
    const newRelationships = imported.relationships.filter(
      r => !existingRelationshipNames.has(r.characterName)
    );

    // Update existing relationships if they exist with different types or descriptions
    const updatedRelationships = (existing.relationships || []).map(
      existingRel => {
        const importedRel = imported.relationships.find(
          r => r.characterName === existingRel.characterName
        );
        if (importedRel) {
          // If relationship exists in both, prefer the one with more recent timestamp or better description
          return {
            ...existingRel,
            relationshipType:
              importedRel.relationshipType || existingRel.relationshipType,
            description: importedRel.description || existingRel.description,
          };
        }
        return existingRel;
      }
    );

    merged.relationships = [...updatedRelationships, ...newRelationships];
  } else if (!existing.relationships) {
    // Ensure relationships array exists even if empty
    merged.relationships = [];
  }

  // Handle conflicting simple properties
  const simpleProperties: (keyof GameCharacter)[] = [
    'name',
    'species',
    'locationId',
    'notes',
  ];

  for (const prop of simpleProperties) {
    if (imported[prop] !== undefined && existing[prop] !== imported[prop]) {
      if (
        existing[prop] === undefined ||
        existing[prop] === '' ||
        existing[prop] === null
      ) {
        // If existing is empty, use imported
        (merged as any)[prop] = imported[prop];
      } else if (imported[prop] !== '' && imported[prop] !== null) {
        // Both have values and they're different - this is a conflict
        conflicts.push(prop);
      }
    }
  }

  return { merged, conflicts };
};

// Merge imported characters into the current list, collecting conflicts and
// newly added characters. Pure: does not touch storage.
const mergeImportedCharacters = (
  currentData: GameCharacter[],
  importedCharacters: GameCharacter[]
): {
  mergedCharacters: GameCharacter[];
  addedCharacters: GameCharacter[];
  conflicts: MergeConflict[];
} => {
  const mergedCharacters = [...currentData];
  const addedCharacters: GameCharacter[] = [];
  const conflicts: MergeConflict[] = [];

  // Normalize any legacy single `imageUri` from an older export/repo into
  // `imageUris` before it can be merged/pushed into storage.
  for (const importedChar of importedCharacters.map(normalizeImageUris)) {
    const existingIndex = currentData.findIndex(
      current => current.id === importedChar.id
    );

    if (existingIndex === -1) {
      // No conflict - add new character
      addedCharacters.push(importedChar);
      mergedCharacters.push(importedChar);
    } else {
      // Potential conflict - merge properties
      const existing = currentData[existingIndex];
      const { merged, conflicts: propConflicts } = mergeCharacterProperties(
        existing,
        importedChar
      );

      if (propConflicts.length > 0) {
        conflicts.push({
          id: importedChar.id,
          existing,
          imported: importedChar,
          conflicts: propConflicts,
        });
      }

      // Use merged version even when there are conflicts - non-conflicting
      // properties are still merged.
      mergedCharacters[existingIndex] = merged;
    }
  }

  return { mergedCharacters, addedCharacters, conflicts };
};

// Merge imported factions into the already-loaded current factions and persist.
// Existing factions are only overwritten when the imported copy is newer.
const applyFactionMerge = async (
  currentFactions: StoredFaction[],
  importedFactions: StoredFaction[]
): Promise<void> => {
  const mergedFactions = [...currentFactions];
  const existingFactionNames = new Set(currentFactions.map(f => f.name));

  // Normalize any legacy single `imageUri` from an older export/repo into
  // `imageUris` before it can be merged/pushed into storage.
  for (const importedFaction of importedFactions.map(normalizeImageUris)) {
    if (!existingFactionNames.has(importedFaction.name)) {
      mergedFactions.push(importedFaction);
    } else {
      const existingIndex = mergedFactions.findIndex(
        f => f.name === importedFaction.name
      );
      if (
        existingIndex >= 0 &&
        importedFaction.updatedAt > mergedFactions[existingIndex].updatedAt
      ) {
        mergedFactions[existingIndex] = importedFaction;
      }
    }
  }

  await saveFactions(mergedFactions);
};

// Merge imported locations with the stored locations and persist. Existing
// locations are only overwritten when the imported copy is newer.
const applyLocationMerge = async (
  importedLocations: GameLocation[]
): Promise<void> => {
  const currentLocations = await loadLocations();
  const mergedLocations = [...currentLocations];
  const existingLocationIds = new Set(currentLocations.map(l => l.id));

  // Normalize any legacy single `imageUri` from an older export/repo into
  // `imageUris` before it can be merged/pushed into storage.
  for (const importedLocation of importedLocations.map(normalizeImageUris)) {
    if (!existingLocationIds.has(importedLocation.id)) {
      mergedLocations.push(importedLocation);
    } else {
      const existingIndex = mergedLocations.findIndex(
        l => l.id === importedLocation.id
      );
      if (
        existingIndex >= 0 &&
        importedLocation.updatedAt > mergedLocations[existingIndex].updatedAt
      ) {
        mergedLocations[existingIndex] = importedLocation;
      }
    }
  }

  await saveLocations(mergedLocations);
};

export const mergeDatasets = async (jsonData: string): Promise<boolean> => {
  try {
    const currentData = await loadCharacters();
    const currentFactions = await loadFactions();
    const importedData = JSON.parse(jsonData);

    // Auto-create any missing locations referenced by imported characters
    if (importedData.characters) {
      await migrateOldLocationData(importedData.characters);
      await ensureLocationsExist(importedData.characters);
    }

    const { mergedCharacters } = mergeImportedCharacters(
      currentData,
      importedData.characters || []
    );
    await saveCharacters(mergedCharacters);

    if (importedData.factions) {
      await applyFactionMerge(currentFactions, importedData.factions);
    }

    if (importedData.locations) {
      await applyLocationMerge(importedData.locations);
    }

    return true;
  } catch (error) {
    console.error('Error merging datasets:', error);
    return false;
  }
};

// Enhanced merge function that can handle user interaction
export const mergeDatasetWithConflictResolution = async (
  jsonData: string
): Promise<MergeResult> => {
  try {
    const currentData = await loadCharacters();
    const currentFactions = await loadFactions();
    const importedData = JSON.parse(jsonData);

    // Auto-create any missing locations referenced by imported characters
    if (importedData.characters) {
      await migrateOldLocationData(importedData.characters);
      await ensureLocationsExist(importedData.characters);
    }

    const { mergedCharacters, addedCharacters, conflicts } =
      mergeImportedCharacters(currentData, importedData.characters || []);
    await saveCharacters(mergedCharacters);

    if (importedData.factions) {
      await applyFactionMerge(currentFactions, importedData.factions);
    }

    if (importedData.locations) {
      await applyLocationMerge(importedData.locations);
    }

    return {
      success: true,
      conflicts,
      merged: mergedCharacters,
      added: addedCharacters,
    };
  } catch (error) {
    console.error('Error merging datasets:', error);
    return {
      success: false,
      conflicts: [],
      merged: [],
      added: [],
    };
  }
};

export const toggleCharacterPresent = async (
  id: string
): Promise<GameCharacter | null> =>
  runExclusive(STORAGE_KEY, async () => {
    const characters = await loadCharacters();
    const index = characters.findIndex(c => c.id === id);

    if (index === -1) return null;

    const updatedCharacter: GameCharacter = {
      ...characters[index],
      present: !characters[index].present,
      updatedAt: new Date().toISOString(),
    };

    characters[index] = updatedCharacter;
    await saveCharacters(characters);
    return updatedCharacter;
  });

export const resetAllPresentStatus = async (): Promise<void> =>
  runExclusive(STORAGE_KEY, async () => {
    const characters = await loadCharacters();
    const updatedCharacters = characters.map(character => ({
      ...character,
      present: false,
      updatedAt: new Date().toISOString(),
    }));

    await saveCharacters(updatedCharacters);
  });

export const clearStorage = async (): Promise<void> => {
  await SafeAsyncStorageJSONParser.removeItem(STORAGE_KEY);
  await SafeAsyncStorageJSONParser.removeItem(FACTION_STORAGE_KEY);
  await SafeAsyncStorageJSONParser.removeItem(LOCATION_STORAGE_KEY);
  await SafeAsyncStorageJSONParser.removeItem(EVENT_STORAGE_KEY);
  await SafeAsyncStorageJSONParser.removeItem(QUEST_STORAGE_KEY);
};

// Faction management functions
export const saveFactions = async (
  factions: StoredFaction[]
): Promise<void> => {
  const dataset: FactionDataset = {
    factions,
    version: '1.0',
    lastUpdated: new Date().toISOString(),
  };
  await SafeAsyncStorageJSONParser.setItem(FACTION_STORAGE_KEY, dataset);
};

export const loadFactions = async (): Promise<StoredFaction[]> => {
  const dataset =
    await SafeAsyncStorageJSONParser.getItem<FactionDataset>(
      FACTION_STORAGE_KEY
    );
  if (!dataset) return [];

  // Handle backward compatibility - set defaults for missing properties
  return (dataset.factions || []).map(faction =>
    normalizeImageUris({
      ...faction,
      retired: faction.retired ?? false,
      relationships: faction.relationships ?? [],
    })
  );
};

export const getFactionDescription = async (
  factionName: string
): Promise<string> => {
  const factions = await loadFactions();
  const faction = factions.find(f => f.name === factionName);
  return faction?.description || '';
};

export const saveFactionDescription = async (
  factionName: string,
  description: string
): Promise<void> =>
  runExclusive(FACTION_STORAGE_KEY, async () => {
    const factions = await loadFactions();
    const existingIndex = factions.findIndex(f => f.name === factionName);

    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      // Update existing faction
      factions[existingIndex] = {
        ...factions[existingIndex],
        description,
        updatedAt: now,
      };
    } else {
      // Create new faction
      factions.push({
        name: factionName,
        description,
        createdAt: now,
        updatedAt: now,
      });
    }

    await saveFactions(factions);
  });

export const getAllStoredFactions = async (): Promise<StoredFaction[]> => {
  return await loadFactions();
};

export const deleteFaction = async (factionName: string): Promise<boolean> =>
  runExclusive(FACTION_STORAGE_KEY, async () => {
    const factions = await loadFactions();
    const filtered = factions.filter(f => f.name !== factionName);

    if (filtered.length === factions.length) return false;

    await saveFactions(filtered);
    return true;
  });

export const deleteFactionCompletely = async (
  factionName: string
): Promise<{ success: boolean; charactersUpdated: number }> => {
  try {
    // First, remove the faction from all characters (serialized against other
    // character writes so the read-modify-write can't be clobbered).
    const charactersUpdated = await runExclusive(STORAGE_KEY, async () => {
      const characters = await loadCharacters();
      let updatedCount = 0;

      const updatedCharacters = characters.map(character => {
        const originalFactionCount = character.factions.length;
        const updatedFactions = character.factions.filter(
          faction => faction.name !== factionName
        );

        if (updatedFactions.length !== originalFactionCount) {
          updatedCount++;
          return {
            ...character,
            factions: updatedFactions,
            updatedAt: new Date().toISOString(),
          };
        }

        return character;
      });

      // Save updated characters if any were modified
      if (updatedCount > 0) {
        await saveCharacters(updatedCharacters);
      }

      return updatedCount;
    });

    // Then remove the faction from centralized storage
    await deleteFaction(factionName);

    return {
      success: true,
      charactersUpdated,
    };
  } catch (error) {
    console.error('Error deleting faction completely:', error);
    return {
      success: false,
      charactersUpdated: 0,
    };
  }
};

export const createFaction = async (factionData: {
  name: string;
  description: string;
  imageUris?: string[];
  relationships?: FactionRelationship[];
  retired?: boolean;
}): Promise<boolean> =>
  runExclusive(FACTION_STORAGE_KEY, async () => {
    const existingFactions = await loadFactions();

    // Check if faction with this name already exists
    const existingFaction = existingFactions.find(
      f => f.name.toLowerCase() === factionData.name.toLowerCase()
    );
    if (existingFaction) {
      return false; // Faction already exists
    }

    const now = new Date().toISOString();
    const newFaction: StoredFaction = {
      name: factionData.name,
      description: factionData.description,
      imageUris: factionData.imageUris,
      relationships: factionData.relationships || [],
      retired: factionData.retired ?? false,
      createdAt: now,
      updatedAt: now,
    };

    // Add bidirectional relationships
    const updatedFactions = [...existingFactions, newFaction];
    if (factionData.relationships && factionData.relationships.length > 0) {
      factionData.relationships.forEach(relationship => {
        const targetFaction = updatedFactions.find(
          f => f.name === relationship.factionName
        );
        if (targetFaction) {
          // Add reciprocal relationship if it doesn't exist
          const reciprocalExists = (targetFaction.relationships || []).some(
            r => r.factionName === factionData.name
          );
          if (!reciprocalExists) {
            targetFaction.relationships = [
              ...(targetFaction.relationships || []),
              {
                factionName: factionData.name,
                relationshipType: relationship.relationshipType,
              },
            ];
            targetFaction.updatedAt = now;
          }
        }
      });
    }

    await saveFactions(updatedFactions);
    return true;
  });

export const updateFaction = async (
  factionName: string,
  updates: {
    name?: string;
    description?: string;
    imageUris?: string[];
    relationships?: FactionRelationship[];
    retired?: boolean;
  }
): Promise<StoredFaction | null> =>
  runExclusive(FACTION_STORAGE_KEY, async () => {
    const factions = await loadFactions();
    const index = factions.findIndex(f => f.name === factionName);

    if (index === -1) return null;

    // If name is being changed, check if new name already exists
    if (updates.name && updates.name !== factionName) {
      const nameExists = factions.some(
        f => f.name.toLowerCase() === updates.name!.toLowerCase()
      );
      if (nameExists) {
        return null; // New name already exists
      }
    }

    const now = new Date().toISOString();
    const oldRelationships = factions[index].relationships || [];

    const updatedFaction: StoredFaction = {
      ...factions[index],
      ...updates,
      updatedAt: now,
    };

    factions[index] = updatedFaction;

    // Handle bidirectional relationships
    if (updates.relationships !== undefined) {
      const newRelationships = updates.relationships || [];

      // Find relationships that were removed
      const removedRelationships = oldRelationships.filter(
        oldRel =>
          !newRelationships.some(
            newRel => newRel.factionName === oldRel.factionName
          )
      );

      // Find relationships that were added
      const addedRelationships = newRelationships.filter(
        newRel =>
          !oldRelationships.some(
            oldRel => oldRel.factionName === newRel.factionName
          )
      );

      // Find relationships that changed type
      const changedRelationships = newRelationships.filter(newRel => {
        const oldRel = oldRelationships.find(
          oldR => oldR.factionName === newRel.factionName
        );
        return oldRel && oldRel.relationshipType !== newRel.relationshipType;
      });

      // Remove reciprocal relationships for removed relationships
      removedRelationships.forEach(relationship => {
        const targetFaction = factions.find(
          f => f.name === relationship.factionName
        );
        if (targetFaction) {
          targetFaction.relationships = (
            targetFaction.relationships || []
          ).filter(r => r.factionName !== factionName);
          targetFaction.updatedAt = now;
        }
      });

      // Add reciprocal relationships for added relationships
      addedRelationships.forEach(relationship => {
        const targetFaction = factions.find(
          f => f.name === relationship.factionName
        );
        if (targetFaction) {
          const reciprocalExists = (targetFaction.relationships || []).some(
            r => r.factionName === factionName
          );
          if (!reciprocalExists) {
            targetFaction.relationships = [
              ...(targetFaction.relationships || []),
              {
                factionName: factionName,
                relationshipType: relationship.relationshipType,
              },
            ];
            targetFaction.updatedAt = now;
          }
        }
      });

      // Update reciprocal relationships for changed relationships
      changedRelationships.forEach(relationship => {
        const targetFaction = factions.find(
          f => f.name === relationship.factionName
        );
        if (targetFaction) {
          targetFaction.relationships = (targetFaction.relationships || []).map(
            r =>
              r.factionName === factionName
                ? { ...r, relationshipType: relationship.relationshipType }
                : r
          );
          targetFaction.updatedAt = now;
        }
      });
    }

    await saveFactions(factions);

    // If name changed, update all character faction references and faction relationships
    if (updates.name && updates.name !== factionName) {
      // Update character faction references (serialized against other character
      // writes).
      await runExclusive(STORAGE_KEY, async () => {
        const characters = await loadCharacters();
        const updatedCharacters = characters.map(character => {
          const updatedFactions = character.factions.map(faction =>
            faction.name === factionName
              ? { ...faction, name: updates.name! }
              : faction
          );
          return {
            ...character,
            factions: updatedFactions,
            updatedAt: new Date().toISOString(),
          };
        });
        await saveCharacters(updatedCharacters);
      });

      // Update all faction relationships that reference the old name
      const updatedFactions = factions.map(faction => {
        if (faction.name === factionName) {
          // Skip the faction being renamed (already handled above)
          return faction;
        }
        const hasRelationship = (faction.relationships || []).some(
          r => r.factionName === factionName
        );
        if (hasRelationship) {
          return {
            ...faction,
            relationships: (faction.relationships || []).map(r =>
              r.factionName === factionName
                ? { ...r, factionName: updates.name! }
                : r
            ),
            updatedAt: now,
          };
        }
        return faction;
      });
      await saveFactions(updatedFactions);
    }

    return updatedFaction;
  });

export const toggleFactionRetired = async (
  factionName: string
): Promise<boolean> =>
  runExclusive(FACTION_STORAGE_KEY, async () => {
    const factions = await loadFactions();
    const index = factions.findIndex(f => f.name === factionName);

    if (index === -1) return false;

    factions[index] = {
      ...factions[index],
      retired: !factions[index].retired,
      updatedAt: new Date().toISOString(),
    };

    await saveFactions(factions);
    return true;
  });

// Migration function to move faction descriptions from character data to centralized storage
export const migrateFactionDescriptions = async (): Promise<void> => {
  try {
    await runExclusive(FACTION_STORAGE_KEY, async () => {
      const characters = await loadCharacters();
      const existingFactions = await loadFactions();
      const factionDescriptions = new Map<string, string>();

      // Collect all faction descriptions from characters
      characters.forEach(character => {
        character.factions.forEach(faction => {
          if (faction.description && faction.description.trim() !== '') {
            // Use the first non-empty description found for each faction
            if (!factionDescriptions.has(faction.name)) {
              factionDescriptions.set(faction.name, faction.description);
            }
          }
        });
      });

      // Create or update centralized faction storage
      const updatedFactions = [...existingFactions];

      factionDescriptions.forEach((description, factionName) => {
        const existingIndex = updatedFactions.findIndex(
          f => f.name === factionName
        );
        const now = new Date().toISOString();

        if (existingIndex >= 0) {
          // Update existing faction if it has no description
          if (!updatedFactions[existingIndex].description) {
            updatedFactions[existingIndex] = {
              ...updatedFactions[existingIndex],
              description,
              updatedAt: now,
            };
          }
        } else {
          // Create new faction entry
          updatedFactions.push({
            name: factionName,
            description,
            createdAt: now,
            updatedAt: now,
          });
        }
      });

      await saveFactions(updatedFactions);
    });
  } catch (error) {
    console.error('Error migrating faction descriptions:', error);
  }
};

// Migration function to backfill the deprecated single `imageUri` field into
// `imageUris` and strip it from persisted records. Idempotent - safe to call
// on every app start (see CharacterListScreen.loadData).
export const migrateImageUris = async (): Promise<void> => {
  try {
    await runExclusive(STORAGE_KEY, async () => {
      const dataset =
        await SafeAsyncStorageJSONParser.getItem<CharacterDataset>(STORAGE_KEY);
      const characters = dataset?.characters;
      if (!characters?.some(hasLegacyImageUri)) return;

      await saveCharacters(characters.map(normalizeImageUris));
    });
  } catch (error) {
    console.error('Error migrating character image URIs:', error);
  }

  try {
    await runExclusive(FACTION_STORAGE_KEY, async () => {
      const dataset =
        await SafeAsyncStorageJSONParser.getItem<FactionDataset>(
          FACTION_STORAGE_KEY
        );
      const factions = dataset?.factions;
      if (!factions?.some(hasLegacyImageUri)) return;

      await saveFactions(factions.map(normalizeImageUris));
    });
  } catch (error) {
    console.error('Error migrating faction image URIs:', error);
  }

  try {
    await runExclusive(LOCATION_STORAGE_KEY, async () => {
      const dataset =
        await SafeAsyncStorageJSONParser.getItem<LocationDataset>(
          LOCATION_STORAGE_KEY
        );
      const locations = dataset?.locations;
      if (!locations?.some(hasLegacyImageUri)) return;

      await saveLocations(locations.map(normalizeImageUris));
    });
  } catch (error) {
    console.error('Error migrating location image URIs:', error);
  }

  try {
    await runExclusive(EVENT_STORAGE_KEY, async () => {
      const dataset =
        await SafeAsyncStorageJSONParser.getItem<EventDataset>(
          EVENT_STORAGE_KEY
        );
      const events = dataset?.events;
      if (!events?.some(hasLegacyImageUri)) return;

      await saveEvents(events.map(normalizeImageUris));
    });
  } catch (error) {
    console.error('Error migrating event image URIs:', error);
  }

  try {
    await runExclusive(QUEST_STORAGE_KEY, async () => {
      const dataset =
        await SafeAsyncStorageJSONParser.getItem<QuestDataset>(
          QUEST_STORAGE_KEY
        );
      const quests = dataset?.quests;
      if (!quests?.some(hasLegacyImageUri)) return;

      await saveQuests(quests.map(normalizeImageUris));
    });
  } catch (error) {
    console.error('Error migrating quest image URIs:', error);
  }
};

// Location management functions
export const saveLocations = async (
  locations: GameLocation[]
): Promise<void> => {
  const dataset: LocationDataset = {
    locations,
    version: '1.0',
    lastUpdated: new Date().toISOString(),
  };
  await SafeAsyncStorageJSONParser.setItem(LOCATION_STORAGE_KEY, dataset);
};

export const loadLocations = async (): Promise<GameLocation[]> => {
  const dataset =
    await SafeAsyncStorageJSONParser.getItem<LocationDataset>(
      LOCATION_STORAGE_KEY
    );
  if (!dataset) return [];

  return (dataset.locations || []).map(normalizeImageUris);
};

export const getLocation = async (
  locationId: string
): Promise<GameLocation | null> => {
  const locations = await loadLocations();
  return locations.find(l => l.id === locationId) || null;
};

export const createLocation = async (locationData: {
  name: string;
  description: string;
  imageUris?: string[];
}): Promise<GameLocation | null> =>
  runExclusive(LOCATION_STORAGE_KEY, async () => {
    const existingLocations = await loadLocations();

    // Check if location with this name already exists
    const existingLocation = existingLocations.find(
      l => l.name.toLowerCase() === locationData.name.toLowerCase()
    );
    if (existingLocation) {
      return null; // Location already exists
    }

    const now = new Date().toISOString();
    const newLocation: GameLocation = {
      id: uuidv4(),
      name: locationData.name,
      description: locationData.description,
      imageUris: locationData.imageUris,
      createdAt: now,
      updatedAt: now,
    };

    await saveLocations([...existingLocations, newLocation]);
    return newLocation;
  });

export const updateLocation = async (
  locationId: string,
  updates: Partial<Omit<GameLocation, 'id' | 'createdAt'>>
): Promise<GameLocation | null> =>
  runExclusive(LOCATION_STORAGE_KEY, async () => {
    const locations = await loadLocations();
    const index = locations.findIndex(l => l.id === locationId);

    if (index === -1) return null;

    const updatedLocation: GameLocation = {
      ...locations[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    locations[index] = updatedLocation;
    await saveLocations(locations);
    return updatedLocation;
  });

export const deleteLocation = async (locationId: string): Promise<boolean> =>
  runExclusive(LOCATION_STORAGE_KEY, async () => {
    const locations = await loadLocations();
    const filtered = locations.filter(l => l.id !== locationId);

    if (filtered.length === locations.length) return false;

    await saveLocations(filtered);
    return true;
  });

export const deleteLocationCompletely = async (
  locationId: string
): Promise<{ success: boolean; charactersUpdated: number }> => {
  try {
    // First, remove the location reference from all characters (serialized
    // against other character writes).
    const charactersUpdated = await runExclusive(STORAGE_KEY, async () => {
      const characters = await loadCharacters();
      let updatedCount = 0;

      const updatedCharacters = characters.map(character => {
        if (character.locationId === locationId) {
          updatedCount++;
          return {
            ...character,
            locationId: undefined,
            updatedAt: new Date().toISOString(),
          };
        }
        return character;
      });

      // Save updated characters if any were modified
      if (updatedCount > 0) {
        await saveCharacters(updatedCharacters);
      }

      return updatedCount;
    });

    // Then remove the location from centralized storage
    await deleteLocation(locationId);

    return {
      success: true,
      charactersUpdated,
    };
  } catch (error) {
    console.error('Error deleting location completely:', error);
    return {
      success: false,
      charactersUpdated: 0,
    };
  }
};

// ============================================
// Event Storage Functions
// ============================================

export const saveEvents = async (events: GameEvent[]): Promise<void> => {
  const dataset: EventDataset = {
    events,
    version: '1.0',
    lastUpdated: new Date().toISOString(),
  };
  await SafeAsyncStorageJSONParser.setItem(EVENT_STORAGE_KEY, dataset);
};

export const loadEvents = async (): Promise<GameEvent[]> => {
  const dataset =
    await SafeAsyncStorageJSONParser.getItem<EventDataset>(EVENT_STORAGE_KEY);
  if (!dataset) return [];

  return (dataset.events || []).map(normalizeImageUris);
};

export const createEvent = async (
  event: Omit<GameEvent, 'id' | 'createdAt' | 'updatedAt'>
): Promise<GameEvent> => {
  return await addEvent(event);
};

export const addEvent = async (
  event: Omit<GameEvent, 'id' | 'createdAt' | 'updatedAt'>
): Promise<GameEvent> =>
  runExclusive(EVENT_STORAGE_KEY, async () => {
    const events = await loadEvents();
    const newEvent: GameEvent = {
      ...event,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveEvents([...events, newEvent]);
    return newEvent;
  });

export const updateEvent = async (
  id: string,
  updates: Partial<GameEvent>
): Promise<GameEvent | null> =>
  runExclusive(EVENT_STORAGE_KEY, async () => {
    const events = await loadEvents();
    const index = events.findIndex(e => e.id === id);

    if (index === -1) return null;

    const updatedEvent: GameEvent = {
      ...events[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    events[index] = updatedEvent;
    await saveEvents(events);
    return updatedEvent;
  });

export const deleteEvent = async (id: string): Promise<boolean> =>
  runExclusive(EVENT_STORAGE_KEY, async () => {
    const events = await loadEvents();
    const filtered = events.filter(e => e.id !== id);

    if (filtered.length === events.length) return false;

    await saveEvents(filtered);
    return true;
  });

// ============================================
// Quest Storage Functions
// ============================================

export const saveQuests = async (quests: GameQuest[]): Promise<void> => {
  const dataset: QuestDataset = {
    quests,
    version: '1.0',
    lastUpdated: new Date().toISOString(),
  };
  await SafeAsyncStorageJSONParser.setItem(QUEST_STORAGE_KEY, dataset);
};

export const loadQuests = async (): Promise<GameQuest[]> => {
  const dataset =
    await SafeAsyncStorageJSONParser.getItem<QuestDataset>(QUEST_STORAGE_KEY);
  if (!dataset) return [];

  return (dataset.quests || []).map(normalizeImageUris);
};

export const createQuest = async (
  quest: Omit<GameQuest, 'id' | 'createdAt' | 'updatedAt'>
): Promise<GameQuest> => {
  return await addQuest(quest);
};

export const addQuest = async (
  quest: Omit<GameQuest, 'id' | 'createdAt' | 'updatedAt'>
): Promise<GameQuest> =>
  runExclusive(QUEST_STORAGE_KEY, async () => {
    const quests = await loadQuests();
    const newQuest: GameQuest = {
      ...quest,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveQuests([...quests, newQuest]);
    return newQuest;
  });

export const updateQuest = async (
  id: string,
  updates: Partial<GameQuest>
): Promise<GameQuest | null> =>
  runExclusive(QUEST_STORAGE_KEY, async () => {
    const quests = await loadQuests();
    const index = quests.findIndex(q => q.id === id);

    if (index === -1) return null;

    const updatedQuest: GameQuest = {
      ...quests[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    quests[index] = updatedQuest;
    await saveQuests(quests);
    return updatedQuest;
  });

export const deleteQuest = async (id: string): Promise<boolean> =>
  runExclusive(QUEST_STORAGE_KEY, async () => {
    const quests = await loadQuests();
    const filtered = quests.filter(q => q.id !== id);

    if (filtered.length === quests.length) return false;

    await saveQuests(filtered);
    return true;
  });
