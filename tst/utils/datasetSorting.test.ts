import { sortDatasetDeterministically } from '@utils/datasetSorting';
import {
  RelationshipStanding,
  type GameCharacter,
  type GameLocation,
  type GameEvent,
} from '@models/types';
import type { StoredFaction } from '@utils/characterStorage';

describe('sortDatasetDeterministically', () => {
  describe('Character sorting', () => {
    it('should sort characters by name (case-insensitive)', () => {
      const dataset = {
        characters: [
          { id: '3', name: 'Charlie' },
          { id: '1', name: 'alice' },
          { id: '2', name: 'Bob' },
        ] as GameCharacter[],
      };

      const sorted = sortDatasetDeterministically(dataset);

      expect(sorted.characters[0].name).toBe('alice');
      expect(sorted.characters[1].name).toBe('Bob');
      expect(sorted.characters[2].name).toBe('Charlie');
    });

    it('should use id as tiebreaker when names are equal', () => {
      const dataset = {
        characters: [
          { id: 'c', name: 'Alice' },
          { id: 'a', name: 'Alice' },
          { id: 'b', name: 'Alice' },
        ] as GameCharacter[],
      };

      const sorted = sortDatasetDeterministically(dataset);

      expect(sorted.characters[0].id).toBe('a');
      expect(sorted.characters[1].id).toBe('b');
      expect(sorted.characters[2].id).toBe('c');
    });

    it('should sort nested arrays within characters', () => {
      const dataset = {
        characters: [
          {
            id: '1',
            name: 'Test',
            factions: [
              {
                name: 'Zulu Faction',
                standing: RelationshipStanding.Neutral,
              },
              { name: 'Alpha Faction', standing: RelationshipStanding.Ally },
            ],
            relationships: [
              {
                characterName: 'Zoe',
                relationshipType: RelationshipStanding.Friend,
              },
              {
                characterName: 'Alice',
                relationshipType: RelationshipStanding.Ally,
              },
            ],
            perkIds: ['perk3', 'perk1', 'perk2'],
            distinctionIds: ['dist2', 'dist1'],
            imageUris: ['image3.jpg', 'image1.jpg', 'image2.jpg'],
          },
        ] as GameCharacter[],
      };

      const sorted = sortDatasetDeterministically(dataset);
      const char = sorted.characters[0];

      expect(char.factions[0].name).toBe('Alpha Faction');
      expect(char.factions[1].name).toBe('Zulu Faction');
      expect(char.relationships[0].characterName).toBe('Alice');
      expect(char.relationships[1].characterName).toBe('Zoe');
      expect(char.perkIds).toEqual(['perk1', 'perk2', 'perk3']);
      expect(char.distinctionIds).toEqual(['dist1', 'dist2']);
      expect(char.imageUris).toEqual([
        'image1.jpg',
        'image2.jpg',
        'image3.jpg',
      ]);
    });
  });

  describe('Faction sorting', () => {
    it('should sort factions by name (case-insensitive)', () => {
      const dataset = {
        factions: [
          { name: 'Zulu Faction' },
          { name: 'alpha Faction' },
          { name: 'Beta Faction' },
        ] as StoredFaction[],
      };

      const sorted = sortDatasetDeterministically(dataset);

      expect(sorted.factions[0].name).toBe('alpha Faction');
      expect(sorted.factions[1].name).toBe('Beta Faction');
      expect(sorted.factions[2].name).toBe('Zulu Faction');
    });

    it('should sort nested arrays within factions', () => {
      const dataset = {
        factions: [
          {
            name: 'Test Faction',
            relationships: [
              {
                factionName: 'Zulu',
                relationshipType: RelationshipStanding.Neutral,
              },
              {
                factionName: 'Alpha',
                relationshipType: RelationshipStanding.Ally,
              },
            ],
            imageUris: ['img3.jpg', 'img1.jpg'],
          },
        ] as StoredFaction[],
      };

      const sorted = sortDatasetDeterministically(dataset);
      const faction = sorted.factions[0];

      expect(faction.relationships[0].factionName).toBe('Alpha');
      expect(faction.relationships[1].factionName).toBe('Zulu');
      expect(faction.imageUris).toEqual(['img1.jpg', 'img3.jpg']);
    });
  });

  describe('Location sorting', () => {
    it('should sort locations by name (case-insensitive)', () => {
      const dataset = {
        locations: [
          { id: '3', name: 'Zoo' },
          { id: '1', name: 'airport' },
          { id: '2', name: 'Bank' },
        ] as GameLocation[],
      };

      const sorted = sortDatasetDeterministically(dataset);

      expect(sorted.locations[0].name).toBe('airport');
      expect(sorted.locations[1].name).toBe('Bank');
      expect(sorted.locations[2].name).toBe('Zoo');
    });

    it('should use id as tiebreaker when names are equal', () => {
      const dataset = {
        locations: [
          { id: 'c', name: 'Station' },
          { id: 'a', name: 'Station' },
          { id: 'b', name: 'Station' },
        ] as GameLocation[],
      };

      const sorted = sortDatasetDeterministically(dataset);

      expect(sorted.locations[0].id).toBe('a');
      expect(sorted.locations[1].id).toBe('b');
      expect(sorted.locations[2].id).toBe('c');
    });

    it('should sort nested imageUris within locations', () => {
      const dataset = {
        locations: [
          {
            id: '1',
            name: 'Test Location',
            imageUris: ['loc3.jpg', 'loc1.jpg', 'loc2.jpg'],
          },
        ] as GameLocation[],
      };

      const sorted = sortDatasetDeterministically(dataset);

      expect(sorted.locations[0].imageUris).toEqual([
        'loc1.jpg',
        'loc2.jpg',
        'loc3.jpg',
      ]);
    });
  });

  describe('Event sorting', () => {
    it('should sort events by date (descending - most recent first)', () => {
      const dataset = {
        events: [
          { id: '1', date: '2025-01-01', title: 'Old Event' },
          { id: '2', date: '2025-12-31', title: 'New Event' },
          { id: '3', date: '2025-06-15', title: 'Mid Event' },
        ] as GameEvent[],
      };

      const sorted = sortDatasetDeterministically(dataset);

      expect(sorted.events[0].title).toBe('New Event'); // Most recent
      expect(sorted.events[1].title).toBe('Mid Event');
      expect(sorted.events[2].title).toBe('Old Event'); // Oldest
    });

    it('should use id as tiebreaker when dates are equal', () => {
      const dataset = {
        events: [
          { id: 'c', date: '2025-01-01', title: 'Event C' },
          { id: 'a', date: '2025-01-01', title: 'Event A' },
          { id: 'b', date: '2025-01-01', title: 'Event B' },
        ] as GameEvent[],
      };

      const sorted = sortDatasetDeterministically(dataset);

      expect(sorted.events[0].id).toBe('a');
      expect(sorted.events[1].id).toBe('b');
      expect(sorted.events[2].id).toBe('c');
    });

    it('should sort nested arrays within events', () => {
      const dataset = {
        events: [
          {
            id: '1',
            date: '2025-01-01',
            title: 'Test Event',
            characterIds: ['char3', 'char1', 'char2'],
            factionNames: ['Zulu', 'Alpha', 'Beta'],
            imageUris: ['evt3.jpg', 'evt1.jpg'],
          },
        ] as GameEvent[],
      };

      const sorted = sortDatasetDeterministically(dataset);
      const event = sorted.events[0];

      expect(event.characterIds).toEqual(['char1', 'char2', 'char3']);
      expect(event.factionNames).toEqual(['Alpha', 'Beta', 'Zulu']);
      expect(event.imageUris).toEqual(['evt1.jpg', 'evt3.jpg']);
    });
  });

  describe('Full dataset sorting', () => {
    it('should sort all entity types in a complete dataset', () => {
      const dataset = {
        characters: [
          { id: '2', name: 'Bob' },
          { id: '1', name: 'Alice' },
        ] as GameCharacter[],
        factions: [{ name: 'Zulu' }, { name: 'Alpha' }] as StoredFaction[],
        locations: [
          { id: '2', name: 'Zoo' },
          { id: '1', name: 'Airport' },
        ] as GameLocation[],
        events: [
          { id: '1', date: '2025-01-01', title: 'Old' },
          { id: '2', date: '2025-12-31', title: 'New' },
        ] as GameEvent[],
        version: '1.0',
        lastUpdated: '2025-01-01T00:00:00.000Z',
      };

      const sorted = sortDatasetDeterministically(dataset);

      expect(sorted.characters[0].name).toBe('Alice');
      expect(sorted.factions[0].name).toBe('Alpha');
      expect(sorted.locations[0].name).toBe('Airport');
      expect(sorted.events[0].title).toBe('New'); // Most recent first
    });

    it('should not mutate the original dataset', () => {
      const dataset = {
        characters: [
          { id: '2', name: 'Bob' },
          { id: '1', name: 'Alice' },
        ] as GameCharacter[],
      };

      const originalFirstChar = dataset.characters[0].name;
      sortDatasetDeterministically(dataset);

      expect(dataset.characters[0].name).toBe(originalFirstChar);
    });

    it('should preserve metadata fields', () => {
      const dataset = {
        characters: [] as GameCharacter[],
        factions: [] as StoredFaction[],
        locations: [] as GameLocation[],
        events: [] as GameEvent[],
        version: '1.0',
        lastUpdated: '2025-01-01T00:00:00.000Z',
        discord: { messages: [] },
      };

      const sorted = sortDatasetDeterministically(dataset);

      expect(sorted.version).toBe('1.0');
      expect(sorted.lastUpdated).toBe('2025-01-01T00:00:00.000Z');
      expect(sorted.discord).toEqual({ messages: [] });
    });
  });

  describe('Edge cases', () => {
    it('should handle empty arrays', () => {
      const dataset = {
        characters: [],
        factions: [],
        locations: [],
        events: [],
      };

      const sorted = sortDatasetDeterministically(dataset);

      expect(sorted.characters).toEqual([]);
      expect(sorted.factions).toEqual([]);
      expect(sorted.locations).toEqual([]);
      expect(sorted.events).toEqual([]);
    });

    it('should handle missing arrays', () => {
      const dataset = {
        version: '1.0',
      };

      const sorted = sortDatasetDeterministically(dataset);

      expect(sorted.version).toBe('1.0');
      expect(sorted.characters).toBeUndefined();
    });

    it('should handle entities with missing nested arrays', () => {
      const dataset = {
        characters: [
          {
            id: '1',
            name: 'Test',
            // No nested arrays
          } as GameCharacter,
        ],
      };

      const sorted = sortDatasetDeterministically(dataset);

      expect(sorted.characters[0].name).toBe('Test');
    });

    it('should handle entities with empty nested arrays', () => {
      const dataset = {
        characters: [
          {
            id: '1',
            name: 'Test',
            factions: [],
            relationships: [],
            perkIds: [],
          } as unknown as GameCharacter,
        ],
      };

      const sorted = sortDatasetDeterministically(dataset);

      expect(sorted.characters[0].factions).toEqual([]);
      expect(sorted.characters[0].relationships).toEqual([]);
      expect(sorted.characters[0].perkIds).toEqual([]);
    });
  });
});
