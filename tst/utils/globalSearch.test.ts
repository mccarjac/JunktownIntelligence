import { RelationshipStanding } from '@models/types';
import {
  GlobalSearchData,
  MAX_RESULTS_PER_DOMAIN,
  searchAllDomains,
} from '@utils/globalSearch';
import {
  makeCharacter,
  makeStoredFaction,
  makeLocation,
  makeEvent,
  makeQuest,
} from '../helpers/factories';

const makeData = (
  overrides: Partial<GlobalSearchData> = {}
): GlobalSearchData => ({
  characters: [],
  factions: [],
  locations: [],
  events: [],
  quests: [],
  ...overrides,
});

describe('globalSearch', () => {
  describe('searchAllDomains', () => {
    it('returns no results for an empty query', () => {
      const data = makeData({
        characters: [makeCharacter({ name: 'Rusty' })],
      });

      expect(searchAllDomains(data, '')).toEqual([]);
    });

    it('returns no results for a query below the minimum length', () => {
      const data = makeData({
        characters: [makeCharacter({ name: 'Rusty' })],
      });

      expect(searchAllDomains(data, 'r')).toEqual([]);
      expect(searchAllDomains(data, '  r  ')).toEqual([]);
    });

    it('matches case-insensitively on each domain primary field', () => {
      const data = makeData({
        characters: [makeCharacter({ id: 'c1', name: 'Rusty Nail' })],
        factions: [makeStoredFaction({ name: 'Rust Barons' })],
        locations: [makeLocation({ id: 'l1', name: 'Rust Yard' })],
        events: [makeEvent({ id: 'e1', title: 'Rust Storm' })],
        quests: [makeQuest({ id: 'q1', name: 'Clear the Rust' })],
      });

      const results = searchAllDomains(data, 'RUST');

      expect(results.map(result => result.domain)).toEqual([
        'character',
        'faction',
        'location',
        'event',
        'quest',
      ]);
      expect(results.map(result => result.title)).toEqual([
        'Rusty Nail',
        'Rust Barons',
        'Rust Yard',
        'Rust Storm',
        'Clear the Rust',
      ]);
    });

    it('matches secondary fields and surfaces them as the subtitle', () => {
      const data = makeData({
        characters: [
          makeCharacter({
            id: 'c1',
            name: 'Vera',
            factions: [
              {
                name: 'Scrap Collective',
                standing: RelationshipStanding.Neutral,
              },
            ],
          }),
        ],
        events: [
          makeEvent({ id: 'e1', title: 'Town Meeting', notes: 'scrap tax' }),
        ],
        quests: [
          makeQuest({
            id: 'q1',
            name: 'Delivery Run',
            junktownOffice: 'Scrap Office',
          }),
        ],
      });

      const results = searchAllDomains(data, 'scrap');

      expect(results).toHaveLength(3);
      const [character, event, quest] = results;
      expect(character).toMatchObject({
        domain: 'character',
        title: 'Vera',
        subtitle: 'Scrap Collective',
        primaryMatch: false,
      });
      expect(event).toMatchObject({
        domain: 'event',
        title: 'Town Meeting',
        subtitle: 'scrap tax',
      });
      expect(quest).toMatchObject({
        domain: 'quest',
        title: 'Delivery Run',
        subtitle: 'Scrap Office',
      });
    });

    it('ranks primary-field matches before secondary-field matches', () => {
      const data = makeData({
        locations: [
          makeLocation({
            id: 'l1',
            name: 'Water Tower',
            description: 'Old landmark',
          }),
          makeLocation({
            id: 'l2',
            name: 'Arena',
            description: 'Has a water fountain',
          }),
        ],
      });

      const results = searchAllDomains(data, 'water');

      expect(results.map(result => result.title)).toEqual([
        'Water Tower',
        'Arena',
      ]);
      expect(results.map(result => result.primaryMatch)).toEqual([true, false]);
    });

    it('sorts alphabetically within a ranking tier', () => {
      const data = makeData({
        characters: [
          makeCharacter({ id: 'c1', name: 'Zeke the Rat' }),
          makeCharacter({ id: 'c2', name: 'Abel the Rat' }),
        ],
      });

      const results = searchAllDomains(data, 'rat');

      expect(results.map(result => result.title)).toEqual([
        'Abel the Rat',
        'Zeke the Rat',
      ]);
    });

    it('caps results per domain', () => {
      const characters = Array.from(
        { length: MAX_RESULTS_PER_DOMAIN + 5 },
        (_, index) =>
          makeCharacter({ id: `c${index}`, name: `Raider ${index}` })
      );
      const data = makeData({
        characters,
        factions: [makeStoredFaction({ name: 'Raider Coalition' })],
      });

      const results = searchAllDomains(data, 'raider');

      expect(
        results.filter(result => result.domain === 'character')
      ).toHaveLength(MAX_RESULTS_PER_DOMAIN);
      expect(
        results.filter(result => result.domain === 'faction')
      ).toHaveLength(1);
    });

    it('builds stable keys and navigation payloads per domain', () => {
      const character = makeCharacter({ id: 'c1', name: 'Mira' });
      const data = makeData({
        characters: [character],
        factions: [makeStoredFaction({ name: 'Miracle Workers' })],
        locations: [makeLocation({ id: 'l1', name: 'Mirage Bar' })],
        events: [makeEvent({ id: 'e1', title: 'Mira Day' })],
        quests: [makeQuest({ id: 'q1', name: 'Find Mira' })],
      });

      const results = searchAllDomains(data, 'mira');

      expect(results).toEqual([
        expect.objectContaining({
          domain: 'character',
          key: 'character:c1',
          character,
        }),
        expect.objectContaining({
          domain: 'faction',
          key: 'faction:Miracle Workers',
          factionName: 'Miracle Workers',
        }),
        expect.objectContaining({
          domain: 'location',
          key: 'location:l1',
          locationId: 'l1',
        }),
        expect.objectContaining({
          domain: 'event',
          key: 'event:e1',
          eventId: 'e1',
        }),
        expect.objectContaining({
          domain: 'quest',
          key: 'quest:q1',
          questId: 'q1',
        }),
      ]);
    });

    it('includes retired characters', () => {
      const data = makeData({
        characters: [
          makeCharacter({ id: 'c1', name: 'Old Pete', retired: true }),
        ],
      });

      const results = searchAllDomains(data, 'pete');

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Old Pete');
    });

    it('does not mutate the input arrays while ranking', () => {
      const characters = [
        makeCharacter({ id: 'c1', name: 'Zeke' }),
        makeCharacter({ id: 'c2', name: 'Abel' }),
      ];
      const data = makeData({ characters });

      searchAllDomains(data, 'ze');

      expect(characters.map(character => character.name)).toEqual([
        'Zeke',
        'Abel',
      ]);
    });
  });
});
