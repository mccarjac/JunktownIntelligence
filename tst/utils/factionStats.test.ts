import {
  calculateFactionStats,
  calculateCombinedFactionStats,
  getAllFactionStats,
} from '@/utils/factionStats';
import { GameCharacter, RelationshipStanding } from '@/models/types';
import { FactionRelationship } from '@/utils/characterStorage';
import { makeCharacter } from '../helpers/factories';

describe('factionStats', () => {
  describe('calculateFactionStats', () => {
    it('returns empty stats when the faction has no members', () => {
      const stats = calculateFactionStats('Brotherhood', []);

      expect(stats).toEqual({
        factionName: 'Brotherhood',
        totalMembers: 0,
        presentMembers: 0,
        perkTagCounts: {},
        topPerkTags: [],
        commonPerks: [],
        commonDistinctions: [],
        speciesDistribution: {},
        relationships: [],
        alliedFactions: [],
        enemyFactions: [],
      });
    });

    it('only counts Ally/Friend standings as members, ignoring Neutral/Hostile/Enemy', () => {
      const characters: GameCharacter[] = [
        makeCharacter({
          id: '1',
          name: 'Ally Member',
          factions: [
            { name: 'Brotherhood', standing: RelationshipStanding.Ally },
          ],
        }),
        makeCharacter({
          id: '2',
          name: 'Friend Member',
          factions: [
            { name: 'Brotherhood', standing: RelationshipStanding.Friend },
          ],
        }),
        makeCharacter({
          id: '3',
          name: 'Enemy Non-member',
          factions: [
            { name: 'Brotherhood', standing: RelationshipStanding.Enemy },
          ],
        }),
        makeCharacter({
          id: '4',
          name: 'Unrelated',
          factions: [{ name: 'Raiders', standing: RelationshipStanding.Ally }],
        }),
      ];

      const stats = calculateFactionStats('Brotherhood', characters);

      expect(stats.totalMembers).toBe(2);
    });

    it('counts present members separately from total members', () => {
      const characters: GameCharacter[] = [
        makeCharacter({
          id: '1',
          name: 'Present',
          present: true,
          factions: [
            { name: 'Brotherhood', standing: RelationshipStanding.Ally },
          ],
        }),
        makeCharacter({
          id: '2',
          name: 'Absent',
          present: false,
          factions: [
            { name: 'Brotherhood', standing: RelationshipStanding.Ally },
          ],
        }),
      ];

      const stats = calculateFactionStats('Brotherhood', characters);

      expect(stats.totalMembers).toBe(2);
      expect(stats.presentMembers).toBe(1);
    });

    it('aggregates perk tag counts, top perk tags, common perks, and species distribution', () => {
      const characters: GameCharacter[] = [
        makeCharacter({
          id: '1',
          name: 'Member A',
          species: 'Human',
          perkIds: ['agility_1'],
          factions: [
            { name: 'Brotherhood', standing: RelationshipStanding.Ally },
          ],
        }),
        makeCharacter({
          id: '2',
          name: 'Member B',
          species: 'Human',
          perkIds: ['agility_1', 'agility_2'],
          factions: [
            { name: 'Brotherhood', standing: RelationshipStanding.Friend },
          ],
        }),
        makeCharacter({
          id: '3',
          name: 'Member C',
          species: 'Mutant',
          perkIds: [],
          factions: [
            { name: 'Brotherhood', standing: RelationshipStanding.Ally },
          ],
        }),
      ];

      const stats = calculateFactionStats('Brotherhood', characters);

      expect(stats.perkTagCounts.Agility).toBe(3);
      expect(stats.topPerkTags[0]).toEqual({
        tag: 'Agility',
        count: 3,
        percentage: 100,
      });
      expect(stats.commonPerks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Agile Strikes',
            count: 2,
            percentage: (2 / 3) * 100,
          }),
        ])
      );
      expect(stats.speciesDistribution).toEqual({ Human: 2, Mutant: 1 });
    });

    it('falls back to Unknown Perk/Distinction names for unrecognized ids', () => {
      const characters: GameCharacter[] = [
        makeCharacter({
          id: '1',
          name: 'Member A',
          perkIds: ['not-a-real-perk'],
          distinctionIds: ['not-a-real-distinction'],
          factions: [
            { name: 'Brotherhood', standing: RelationshipStanding.Ally },
          ],
        }),
      ];

      const stats = calculateFactionStats('Brotherhood', characters);

      expect(stats.commonPerks[0].name).toBe('Unknown Perk');
      expect(stats.commonDistinctions[0].name).toBe('Unknown Distinction');
    });

    it('classifies faction relationships into allied and enemy factions', () => {
      const relationships: FactionRelationship[] = [
        { factionName: 'Raiders', relationshipType: RelationshipStanding.Ally },
        {
          factionName: 'Scavengers',
          relationshipType: RelationshipStanding.Friend,
        },
        {
          factionName: 'Vault Dwellers',
          relationshipType: RelationshipStanding.Enemy,
        },
        {
          factionName: 'Ghouls',
          relationshipType: RelationshipStanding.Hostile,
        },
        {
          factionName: 'Traders',
          relationshipType: RelationshipStanding.Neutral,
        },
      ];
      const characters: GameCharacter[] = [
        makeCharacter({
          id: '1',
          name: 'Member A',
          factions: [
            { name: 'Brotherhood', standing: RelationshipStanding.Ally },
          ],
        }),
      ];

      const stats = calculateFactionStats(
        'Brotherhood',
        characters,
        relationships
      );

      expect(stats.alliedFactions).toEqual(['Raiders', 'Scavengers']);
      expect(stats.enemyFactions).toEqual(['Vault Dwellers', 'Ghouls']);
      expect(stats.relationships).toBe(relationships);
    });
  });

  describe('calculateCombinedFactionStats', () => {
    it('combines member counts and perk tags with allied factions', () => {
      const characters: GameCharacter[] = [
        makeCharacter({
          id: '1',
          name: 'Brotherhood Member',
          perkIds: ['agility_1'],
          factions: [
            { name: 'Brotherhood', standing: RelationshipStanding.Ally },
          ],
        }),
        makeCharacter({
          id: '2',
          name: 'Ally Member',
          perkIds: ['agility_1'],
          factions: [
            { name: 'Scavengers', standing: RelationshipStanding.Ally },
          ],
        }),
      ];
      const relationshipsMap = new Map<string, FactionRelationship[]>([
        [
          'Brotherhood',
          [
            {
              factionName: 'Scavengers',
              relationshipType: RelationshipStanding.Ally,
            },
          ],
        ],
        ['Scavengers', []],
      ]);

      const combined = calculateCombinedFactionStats(
        'Brotherhood',
        characters,
        relationshipsMap
      );

      expect(combined.directMembers).toBe(1);
      expect(combined.alliedFactions).toEqual(['Scavengers']);
      expect(combined.combinedMembers).toBe(2);
      expect(combined.combinedPerkTags.Agility).toBe(2);
      expect(combined.strengthMultiplier).toBe(2);
    });

    it('defaults strengthMultiplier to 1 when the faction has no direct members', () => {
      const relationshipsMap = new Map<string, FactionRelationship[]>();

      const combined = calculateCombinedFactionStats(
        'Empty Faction',
        [],
        relationshipsMap
      );

      expect(combined.directMembers).toBe(0);
      expect(combined.combinedMembers).toBe(0);
      expect(combined.strengthMultiplier).toBe(1);
    });

    it('treats an unknown faction relationships key as an empty relationship list', () => {
      const combined = calculateCombinedFactionStats(
        'Unknown Faction',
        [],
        new Map()
      );

      expect(combined.alliedFactions).toEqual([]);
      expect(combined.combinedMembers).toBe(0);
    });
  });

  describe('getAllFactionStats', () => {
    it('returns stats for every faction present in the relationships map', () => {
      const characters: GameCharacter[] = [
        makeCharacter({
          id: '1',
          name: 'Member A',
          factions: [
            { name: 'Brotherhood', standing: RelationshipStanding.Ally },
          ],
        }),
      ];
      const relationshipsMap = new Map<string, FactionRelationship[]>([
        ['Brotherhood', []],
        ['Raiders', []],
      ]);

      const stats = getAllFactionStats(characters, relationshipsMap);

      expect(stats.map(s => s.factionName)).toEqual(['Brotherhood', 'Raiders']);
      expect(stats[0].totalMembers).toBe(1);
      expect(stats[1].totalMembers).toBe(0);
    });

    it('returns an empty array when the relationships map is empty', () => {
      expect(getAllFactionStats([], new Map())).toEqual([]);
    });
  });
});
