/**
 * Utility functions for sorting dataset entities in a deterministic order
 * to minimize diff noise in version control systems.
 */

import type { GameCharacter, GameLocation, GameEvent } from '@models/types';
import type { StoredFaction } from './characterStorage';

/**
 * Sort characters by name (case-insensitive), then by id as tiebreaker
 */
const sortCharacters = (characters: GameCharacter[]): GameCharacter[] => {
  return [...characters].sort((a, b) => {
    const nameCompare = a.name
      .toLowerCase()
      .localeCompare(b.name.toLowerCase());
    if (nameCompare !== 0) return nameCompare;
    return a.id.localeCompare(b.id);
  });
};

/**
 * Sort factions by name (case-insensitive)
 */
const sortFactions = (factions: StoredFaction[]): StoredFaction[] => {
  return [...factions].sort((a, b) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  );
};

/**
 * Sort locations by name (case-insensitive), then by id as tiebreaker
 */
const sortLocations = (locations: GameLocation[]): GameLocation[] => {
  return [...locations].sort((a, b) => {
    const nameCompare = a.name
      .toLowerCase()
      .localeCompare(b.name.toLowerCase());
    if (nameCompare !== 0) return nameCompare;
    return a.id.localeCompare(b.id);
  });
};

/**
 * Sort events by date (descending - most recent first), then by id as tiebreaker
 */
const sortEvents = (events: GameEvent[]): GameEvent[] => {
  return [...events].sort((a, b) => {
    // Parse dates for comparison (descending order - newer dates first)
    const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateCompare !== 0) return dateCompare;
    return a.id.localeCompare(b.id);
  });
};

/**
 * Sort nested arrays within a character for consistency
 */
const sortCharacterNestedArrays = (character: GameCharacter): GameCharacter => {
  const sorted = { ...character };

  // Sort factions by name
  if (sorted.factions && sorted.factions.length > 0) {
    sorted.factions = [...sorted.factions].sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
  }

  // Sort relationships by character name
  if (sorted.relationships && sorted.relationships.length > 0) {
    sorted.relationships = [...sorted.relationships].sort((a, b) =>
      a.characterName.toLowerCase().localeCompare(b.characterName.toLowerCase())
    );
  }

  // Sort perkIds alphabetically
  if (sorted.perkIds && sorted.perkIds.length > 0) {
    sorted.perkIds = [...sorted.perkIds].sort((a, b) => a.localeCompare(b));
  }

  // Sort distinctionIds alphabetically
  if (sorted.distinctionIds && sorted.distinctionIds.length > 0) {
    sorted.distinctionIds = [...sorted.distinctionIds].sort((a, b) =>
      a.localeCompare(b)
    );
  }

  // Sort cyberware by name
  if (sorted.cyberware && sorted.cyberware.length > 0) {
    sorted.cyberware = [...sorted.cyberware].sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
  }

  // Sort imageUris alphabetically
  if (sorted.imageUris && sorted.imageUris.length > 0) {
    sorted.imageUris = [...sorted.imageUris].sort((a, b) => a.localeCompare(b));
  }

  return sorted;
};

/**
 * Sort nested arrays within a faction for consistency
 */
const sortFactionNestedArrays = (faction: StoredFaction): StoredFaction => {
  const sorted = { ...faction };

  // Sort relationships by faction name
  if (sorted.relationships && sorted.relationships.length > 0) {
    sorted.relationships = [...sorted.relationships].sort((a, b) =>
      a.factionName.toLowerCase().localeCompare(b.factionName.toLowerCase())
    );
  }

  // Sort imageUris alphabetically
  if (sorted.imageUris && sorted.imageUris.length > 0) {
    sorted.imageUris = [...sorted.imageUris].sort((a, b) => a.localeCompare(b));
  }

  return sorted;
};

/**
 * Sort nested arrays within a location for consistency
 */
const sortLocationNestedArrays = (location: GameLocation): GameLocation => {
  const sorted = { ...location };

  // Sort imageUris alphabetically
  if (sorted.imageUris && sorted.imageUris.length > 0) {
    sorted.imageUris = [...sorted.imageUris].sort((a, b) => a.localeCompare(b));
  }

  return sorted;
};

/**
 * Sort nested arrays within an event for consistency
 */
const sortEventNestedArrays = (event: GameEvent): GameEvent => {
  const sorted = { ...event };

  // Sort characterIds alphabetically
  if (sorted.characterIds && sorted.characterIds.length > 0) {
    sorted.characterIds = [...sorted.characterIds].sort((a, b) =>
      a.localeCompare(b)
    );
  }

  // Sort factionNames alphabetically
  if (sorted.factionNames && sorted.factionNames.length > 0) {
    sorted.factionNames = [...sorted.factionNames].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }

  // Sort imageUris alphabetically
  if (sorted.imageUris && sorted.imageUris.length > 0) {
    sorted.imageUris = [...sorted.imageUris].sort((a, b) => a.localeCompare(b));
  }

  return sorted;
};

/**
 * Sort an entire dataset in a deterministic order
 * @param dataset The dataset to sort
 * @returns A new dataset with all arrays sorted deterministically
 */
export const sortDatasetDeterministically = (dataset: any): any => {
  const sorted = { ...dataset };

  // Sort characters
  if (sorted.characters && Array.isArray(sorted.characters)) {
    sorted.characters = sortCharacters(sorted.characters).map(
      sortCharacterNestedArrays
    );
  }

  // Sort factions
  if (sorted.factions && Array.isArray(sorted.factions)) {
    sorted.factions = sortFactions(sorted.factions).map(
      sortFactionNestedArrays
    );
  }

  // Sort locations
  if (sorted.locations && Array.isArray(sorted.locations)) {
    sorted.locations = sortLocations(sorted.locations).map(
      sortLocationNestedArrays
    );
  }

  // Sort events
  if (sorted.events && Array.isArray(sorted.events)) {
    sorted.events = sortEvents(sorted.events).map(sortEventNestedArrays);
  }

  return sorted;
};
