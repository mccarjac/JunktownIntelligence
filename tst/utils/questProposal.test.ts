import {
  scoreCharacterForQuest,
  getProposalTargetQuests,
  getAvailableCharacters,
  generateQuestProposals,
  DEFAULT_TEAM_SIZE,
} from '@/utils/questProposal';
import { GameCharacter, GameQuest, QuestStatus } from '@/models/types';
import { PerkTag } from '@/models/gameData';

const mockDate = '2025-01-01T00:00:00.000Z';

const makeCharacter = (
  id: string,
  overrides: Partial<GameCharacter> = {}
): GameCharacter => ({
  id,
  name: `Character ${id}`,
  species: 'Human',
  perkIds: [],
  distinctionIds: [],
  factions: [],
  relationships: [],
  present: true,
  retired: false,
  createdAt: mockDate,
  updatedAt: mockDate,
  ...overrides,
});

const makeQuest = (
  id: string,
  overrides: Partial<GameQuest> = {}
): GameQuest => ({
  id,
  name: `Quest ${id}`,
  status: QuestStatus.NotStarted,
  createdAt: mockDate,
  updatedAt: mockDate,
  ...overrides,
});

describe('questProposal', () => {
  describe('scoreCharacterForQuest', () => {
    it('scores 0 when the quest has no preferences', () => {
      const character = makeCharacter('a', { perkIds: ['agility_1'] });
      const quest = makeQuest('q1');

      expect(scoreCharacterForQuest(character, quest)).toBe(0);
    });

    it('rewards a desirable tag proportional to the tag score', () => {
      const character = makeCharacter('a', {
        perkIds: ['agility_1', 'agility_2'],
      });
      const quest = makeQuest('q1', {
        desirable: { tags: [PerkTag.Agility] },
      });

      // 2 agility perks => tagScores.get(Agility) === 2, weight 1 each.
      expect(scoreCharacterForQuest(character, quest)).toBe(2);
    });

    it('penalizes an undesirable tag proportional to the tag score', () => {
      const character = makeCharacter('a', { perkIds: ['agility_1'] });
      const quest = makeQuest('q1', {
        undesirable: { tags: [PerkTag.Agility] },
      });

      expect(scoreCharacterForQuest(character, quest)).toBe(-1);
    });

    it('rewards a desirable species match', () => {
      const character = makeCharacter('a', { species: 'Android' });
      const quest = makeQuest('q1', {
        desirable: { species: ['Android'] },
      });

      expect(scoreCharacterForQuest(character, quest)).toBeGreaterThan(0);
    });

    it('penalizes an undesirable species match', () => {
      const character = makeCharacter('a', { species: 'Android' });
      const quest = makeQuest('q1', {
        undesirable: { species: ['Android'] },
      });

      expect(scoreCharacterForQuest(character, quest)).toBeLessThan(0);
    });

    it('rewards a desirable perk match', () => {
      const character = makeCharacter('a', { perkIds: ['agility_1'] });
      const quest = makeQuest('q1', {
        desirable: { perkIds: ['agility_1'] },
      });

      expect(scoreCharacterForQuest(character, quest)).toBeGreaterThan(0);
    });

    it('penalizes an undesirable perk match', () => {
      const character = makeCharacter('a', { perkIds: ['agility_1'] });
      const quest = makeQuest('q1', {
        undesirable: { perkIds: ['agility_1'] },
      });

      expect(scoreCharacterForQuest(character, quest)).toBeLessThan(0);
    });

    it('rewards a desirable distinction match', () => {
      const character = makeCharacter('a', { distinctionIds: ['d1'] });
      const quest = makeQuest('q1', {
        desirable: { distinctionIds: ['d1'] },
      });

      expect(scoreCharacterForQuest(character, quest)).toBeGreaterThan(0);
    });

    it('penalizes an undesirable distinction match', () => {
      const character = makeCharacter('a', { distinctionIds: ['d1'] });
      const quest = makeQuest('q1', {
        undesirable: { distinctionIds: ['d1'] },
      });

      expect(scoreCharacterForQuest(character, quest)).toBeLessThan(0);
    });
  });

  describe('getProposalTargetQuests', () => {
    it('excludes quests that are Successful or Failure', () => {
      const quests = [
        makeQuest('a', { status: QuestStatus.Successful }),
        makeQuest('b', { status: QuestStatus.Failure }),
        makeQuest('c', { status: QuestStatus.NotStarted }),
      ];

      expect(getProposalTargetQuests(quests).map(q => q.id)).toEqual(['c']);
    });

    it('excludes quests that already have an assigned team', () => {
      const quests = [
        makeQuest('a', { assignedCharacterIds: ['char-1'] }),
        makeQuest('b', { assignedCharacterIds: [] }),
        makeQuest('c'),
      ];

      expect(
        getProposalTargetQuests(quests)
          .map(q => q.id)
          .sort()
      ).toEqual(['b', 'c']);
    });
  });

  describe('getAvailableCharacters', () => {
    it('only includes present, non-retired characters', () => {
      const characters = [
        makeCharacter('a', { present: true, retired: false }),
        makeCharacter('b', { present: false, retired: false }),
        makeCharacter('c', { present: true, retired: true }),
        makeCharacter('d', { present: undefined }),
      ];

      expect(getAvailableCharacters(characters).map(c => c.id)).toEqual(['a']);
    });
  });

  describe('generateQuestProposals', () => {
    it('returns no proposals when there are no target quests', () => {
      const quests = [makeQuest('a', { status: QuestStatus.Successful })];
      const characters = [makeCharacter('char-1')];

      expect(generateQuestProposals(quests, characters)).toEqual([]);
    });

    it('proposes an empty team when no characters are present', () => {
      const quests = [makeQuest('a')];
      const characters = [makeCharacter('char-1', { present: false })];

      expect(generateQuestProposals(quests, characters)).toEqual([
        { questId: 'a', proposedCharacterIds: [] },
      ]);
    });

    it('fills a team up to the default team size', () => {
      const quest = makeQuest('a');
      const characters = Array.from({ length: DEFAULT_TEAM_SIZE + 2 }, (_, i) =>
        makeCharacter(`char-${i}`)
      );

      const [proposal] = generateQuestProposals([quest], characters);

      expect(proposal.proposedCharacterIds).toHaveLength(DEFAULT_TEAM_SIZE);
    });

    it('respects a custom teamSize', () => {
      const quest = makeQuest('a', { teamSize: 2 });
      const characters = Array.from({ length: 5 }, (_, i) =>
        makeCharacter(`char-${i}`)
      );

      const [proposal] = generateQuestProposals([quest], characters);

      expect(proposal.proposedCharacterIds).toHaveLength(2);
    });

    it('prefers higher-scoring characters for a quest', () => {
      const quest = makeQuest('a', {
        teamSize: 1,
        desirable: { tags: [PerkTag.Agility] },
      });
      const strongMatch = makeCharacter('strong', {
        perkIds: ['agility_1', 'agility_2', 'agility_3'],
      });
      const weakMatch = makeCharacter('weak', { perkIds: [] });

      const [proposal] = generateQuestProposals(
        [quest],
        [weakMatch, strongMatch]
      );

      expect(proposal.proposedCharacterIds).toEqual(['strong']);
    });

    it('avoids assigning the same character to two quests while unused characters remain', () => {
      const quests = [
        makeQuest('a', { teamSize: 1 }),
        makeQuest('b', { teamSize: 1 }),
      ];
      const characters = [makeCharacter('char-1'), makeCharacter('char-2')];

      const proposals = generateQuestProposals(quests, characters);
      const assignedIds = proposals.flatMap(p => p.proposedCharacterIds);

      expect(new Set(assignedIds).size).toBe(2);
    });

    it('allows reusing a character once every present character has been used', () => {
      const quests = [
        makeQuest('a', { teamSize: 1 }),
        makeQuest('b', { teamSize: 1 }),
        makeQuest('c', { teamSize: 1 }),
      ];
      const characters = [makeCharacter('char-1'), makeCharacter('char-2')];

      const proposals = generateQuestProposals(quests, characters);

      // Only 2 present characters for 3 quest slots: every quest still gets a
      // proposed character (a duplicate is unavoidable once the pool of 2 is
      // exhausted), and both characters are used at least once.
      expect(proposals.every(p => p.proposedCharacterIds.length === 1)).toBe(
        true
      );
      const usedIds = new Set(proposals.flatMap(p => p.proposedCharacterIds));
      expect(usedIds).toEqual(new Set(['char-1', 'char-2']));
    });
  });
});
