import { GameCharacter, GameQuest, QuestStatus } from '@models/types';
import { calculateDerivedStats } from './derivedStats';

export interface QuestProposal {
  questId: string;
  proposedCharacterIds: string[];
}

/** Default number of characters proposed for a quest when it has no
 * explicit `teamSize` set. */
export const DEFAULT_TEAM_SIZE = 4;

/** Tunable weights for the match score. Each point of a desirable tag score
 * contributes `TAG_SCORE_WEIGHT`; an exact species/perk/distinction match
 * contributes its respective weight (and undesirable matches subtract it). */
const TAG_SCORE_WEIGHT = 1;
const SPECIES_WEIGHT = 5;
const PERK_WEIGHT = 3;
const DISTINCTION_WEIGHT = 3;

/**
 * Scores how well a character fits a quest's desirable/undesirable
 * preferences. Higher is better; the score is unbounded and only meaningful
 * relative to other characters being compared for the same quest.
 */
export const scoreCharacterForQuest = (
  character: GameCharacter,
  quest: GameQuest
): number => {
  const { tagScores } = calculateDerivedStats(character);
  const desirable = quest.desirable;
  const undesirable = quest.undesirable;
  let score = 0;

  desirable?.tags?.forEach(tag => {
    score += (tagScores?.get(tag) ?? 0) * TAG_SCORE_WEIGHT;
  });
  undesirable?.tags?.forEach(tag => {
    score -= (tagScores?.get(tag) ?? 0) * TAG_SCORE_WEIGHT;
  });

  if (desirable?.species?.includes(character.species)) {
    score += SPECIES_WEIGHT;
  }
  if (undesirable?.species?.includes(character.species)) {
    score -= SPECIES_WEIGHT;
  }

  desirable?.perkIds?.forEach(perkId => {
    if (character.perkIds.includes(perkId)) score += PERK_WEIGHT;
  });
  undesirable?.perkIds?.forEach(perkId => {
    if (character.perkIds.includes(perkId)) score -= PERK_WEIGHT;
  });

  desirable?.distinctionIds?.forEach(distinctionId => {
    if (character.distinctionIds.includes(distinctionId)) {
      score += DISTINCTION_WEIGHT;
    }
  });
  undesirable?.distinctionIds?.forEach(distinctionId => {
    if (character.distinctionIds.includes(distinctionId)) {
      score -= DISTINCTION_WEIGHT;
    }
  });

  return score;
};

/** A quest is eligible for a proposal once it is unresolved and has no team
 * assigned yet. */
export const isProposalTarget = (quest: GameQuest): boolean =>
  quest.status !== QuestStatus.Successful &&
  quest.status !== QuestStatus.Failure &&
  (quest.assignedCharacterIds?.length ?? 0) === 0;

export const getProposalTargetQuests = (quests: GameQuest[]): GameQuest[] =>
  quests.filter(isProposalTarget);

/** Only present, non-retired characters are eligible to be proposed. */
export const getAvailableCharacters = (
  characters: GameCharacter[]
): GameCharacter[] =>
  characters.filter(
    character => character.present === true && !character.retired
  );

const getTeamSize = (quest: GameQuest): number => {
  const size = quest.teamSize;
  return typeof size === 'number' && Number.isFinite(size) && size > 0
    ? Math.floor(size)
    : DEFAULT_TEAM_SIZE;
};

/**
 * Proposes teams for every un-staffed, unresolved quest, drawing only from
 * present/non-retired characters. Characters are only assigned to one quest
 * each; the same character may be proposed for a second quest only once every
 * available character has already been proposed for at least one quest.
 */
export const generateQuestProposals = (
  quests: GameQuest[],
  characters: GameCharacter[]
): QuestProposal[] => {
  const targetQuests = getProposalTargetQuests(quests);
  const availableCharacters = getAvailableCharacters(characters);

  const assignments = new Map<string, string[]>(
    targetQuests.map(quest => [quest.id, []])
  );

  if (targetQuests.length === 0 || availableCharacters.length === 0) {
    return targetQuests.map(quest => ({
      questId: quest.id,
      proposedCharacterIds: [],
    }));
  }

  const scoresByQuest = new Map<string, Map<string, number>>(
    targetQuests.map(quest => [
      quest.id,
      new Map(
        availableCharacters.map(character => [
          character.id,
          scoreCharacterForQuest(character, quest),
        ])
      ),
    ])
  );

  const usedAtLeastOnce = new Set<string>();

  // Round-robin: each pass, every quest still short of its team size claims
  // its best remaining candidate. Preferring characters unused anywhere keeps
  // duplicates out until the whole present pool has been drawn from once.
  let madeProgress = true;
  while (madeProgress) {
    madeProgress = false;

    for (const quest of targetQuests) {
      const assigned = assignments.get(quest.id)!;
      if (assigned.length >= getTeamSize(quest)) continue;

      let candidates = availableCharacters.filter(
        character => !assigned.includes(character.id)
      );

      const unusedCandidates = candidates.filter(
        character => !usedAtLeastOnce.has(character.id)
      );
      if (unusedCandidates.length > 0) {
        candidates = unusedCandidates;
      }

      if (candidates.length === 0) continue;

      const characterScores = scoresByQuest.get(quest.id)!;
      candidates.sort(
        (a, b) => characterScores.get(b.id)! - characterScores.get(a.id)!
      );

      const chosen = candidates[0];
      assigned.push(chosen.id);
      usedAtLeastOnce.add(chosen.id);
      madeProgress = true;
    }
  }

  return targetQuests.map(quest => ({
    questId: quest.id,
    proposedCharacterIds: assignments.get(quest.id) ?? [],
  }));
};
