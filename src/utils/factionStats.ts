import { GameCharacter, RelationshipStanding } from '../models/types';
import {
  AVAILABLE_PERKS,
  AVAILABLE_DISTINCTIONS,
  PerkTag,
} from '../models/gameData';
import { FactionRelationship } from './characterStorage';
import {
  getLabel,
  afterworldsRuleset,
  type RulesetDefinition,
} from '../ruleset';

export interface FactionStats {
  factionName: string;
  totalMembers: number;
  presentMembers: number;

  // Perk tag analysis
  perkTagCounts: Record<PerkTag, number>;
  topPerkTags: { tag: PerkTag; count: number; percentage: number }[];

  // Common perks and distinctions
  commonPerks: { name: string; count: number; percentage: number }[];
  commonDistinctions: { name: string; count: number; percentage: number }[];

  // Species distribution
  speciesDistribution: Record<string, number>;

  // Relationships
  relationships: FactionRelationship[];
  alliedFactions: string[];
  enemyFactions: string[];

  // Combined strength (with allies)
  combinedMemberCount?: number;
  combinedPerkTags?: Record<PerkTag, number>;
}

export interface CombinedFactionAnalysis {
  factionName: string;
  directMembers: number;
  alliedFactions: string[];
  combinedMembers: number;
  combinedPerkTags: Record<PerkTag, number>;
  strengthMultiplier: number; // Combined vs direct member ratio
}

/**
 * Calculate statistics for a single faction based on its members.
 * `ruleset` defaults to afterworldsRuleset so existing callers are
 * unaffected; pass the active ruleset explicitly from a screen that has one.
 */
export const calculateFactionStats = (
  factionName: string,
  allCharacters: GameCharacter[],
  factionRelationships: FactionRelationship[] = [],
  ruleset: RulesetDefinition = afterworldsRuleset
): FactionStats => {
  // Get faction members (only positive relationships count as members)
  const members = allCharacters.filter(char => {
    const faction = char.factions.find(f => f.name === factionName);
    return (
      faction &&
      (faction.standing === RelationshipStanding.Ally ||
        faction.standing === RelationshipStanding.Friend)
    );
  });

  if (members.length === 0) {
    // Return empty stats for factions with no members
    return {
      factionName,
      totalMembers: 0,
      presentMembers: 0,
      perkTagCounts: {} as Record<PerkTag, number>,
      topPerkTags: [],
      commonPerks: [],
      commonDistinctions: [],
      speciesDistribution: {},
      relationships: factionRelationships,
      alliedFactions: [],
      enemyFactions: [],
    };
  }

  const totalMembers = members.length;
  const presentMembers = members.filter(m => m.present === true).length;

  // Calculate perk tag counts - initialize all tags to 0
  const perkTagCounts: Record<PerkTag, number> = Object.fromEntries(
    Object.values(PerkTag).map(tag => [tag, 0])
  ) as Record<PerkTag, number>;

  members.forEach(member => {
    member.perkIds.forEach(perkId => {
      const perk = AVAILABLE_PERKS.find(p => p.id === perkId);
      if (perk && perk.tag) {
        perkTagCounts[perk.tag] = (perkTagCounts[perk.tag] || 0) + 1;
      }
    });
  });

  // Get top perk tags
  const topPerkTags = Object.entries(perkTagCounts)
    .map(([tag, count]) => ({
      tag: tag as PerkTag,
      count,
      percentage: (count / totalMembers) * 100,
    }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Calculate most common perks
  const perkCount: Record<string, number> = {};
  members.forEach(member => {
    member.perkIds.forEach(perkId => {
      perkCount[perkId] = (perkCount[perkId] || 0) + 1;
    });
  });

  const commonPerks = Object.entries(perkCount)
    .map(([id, count]) => ({
      name:
        AVAILABLE_PERKS.find(p => p.id === id)?.name ||
        `Unknown ${getLabel(ruleset, 'trait.singular')}`,
      count,
      percentage: (count / totalMembers) * 100,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Calculate most common distinctions
  const distinctionCount: Record<string, number> = {};
  members.forEach(member => {
    member.distinctionIds.forEach(distinctionId => {
      distinctionCount[distinctionId] =
        (distinctionCount[distinctionId] || 0) + 1;
    });
  });

  const commonDistinctions = Object.entries(distinctionCount)
    .map(([id, count]) => ({
      name:
        AVAILABLE_DISTINCTIONS.find(d => d.id === id)?.name ||
        `Unknown ${getLabel(ruleset, 'quality.singular')}`,
      count,
      percentage: (count / totalMembers) * 100,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Calculate species distribution
  const speciesDistribution = members.reduce(
    (acc, member) => {
      acc[member.species] = (acc[member.species] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Analyze relationships
  const alliedFactions = factionRelationships
    .filter(
      rel =>
        rel.relationshipType === RelationshipStanding.Ally ||
        rel.relationshipType === RelationshipStanding.Friend
    )
    .map(rel => rel.factionName);

  const enemyFactions = factionRelationships
    .filter(
      rel =>
        rel.relationshipType === RelationshipStanding.Enemy ||
        rel.relationshipType === RelationshipStanding.Hostile
    )
    .map(rel => rel.factionName);

  return {
    factionName,
    totalMembers,
    presentMembers,
    perkTagCounts,
    topPerkTags,
    commonPerks,
    commonDistinctions,
    speciesDistribution,
    relationships: factionRelationships,
    alliedFactions,
    enemyFactions,
  };
};

/**
 * Calculate combined statistics for a faction including its allies
 */
export const calculateCombinedFactionStats = (
  factionName: string,
  allCharacters: GameCharacter[],
  allFactionRelationships: Map<string, FactionRelationship[]>,
  ruleset: RulesetDefinition = afterworldsRuleset
): CombinedFactionAnalysis => {
  // Get base stats for the main faction
  const mainFactionRelationships =
    allFactionRelationships.get(factionName) || [];
  const baseStats = calculateFactionStats(
    factionName,
    allCharacters,
    mainFactionRelationships,
    ruleset
  );

  // Get allied factions
  const alliedFactions = baseStats.alliedFactions;

  // Calculate combined member count and perk tags including allies
  let combinedMembers = baseStats.totalMembers;
  const combinedPerkTags: Record<PerkTag, number> = {
    ...baseStats.perkTagCounts,
  };

  alliedFactions.forEach(allyName => {
    const allyRelationships = allFactionRelationships.get(allyName) || [];
    const allyStats = calculateFactionStats(
      allyName,
      allCharacters,
      allyRelationships,
      ruleset
    );
    combinedMembers += allyStats.totalMembers;

    // Add ally perk tags to combined totals
    Object.entries(allyStats.perkTagCounts).forEach(([tag, count]) => {
      combinedPerkTags[tag as PerkTag] =
        (combinedPerkTags[tag as PerkTag] || 0) + count;
    });
  });

  const strengthMultiplier =
    baseStats.totalMembers > 0 ? combinedMembers / baseStats.totalMembers : 1;

  return {
    factionName,
    directMembers: baseStats.totalMembers,
    alliedFactions,
    combinedMembers,
    combinedPerkTags,
    strengthMultiplier,
  };
};

/**
 * Get all faction statistics for display
 *
 * Note: This is a convenience function for getting stats for factions from a relationships map.
 * In practice, you may want to load factions from storage directly to ensure all factions
 * are included, not just those with relationships defined.
 *
 * @deprecated Consider using calculateFactionStats directly with faction list from loadFactions()
 */
export const getAllFactionStats = (
  allCharacters: GameCharacter[],
  allFactionRelationships: Map<string, FactionRelationship[]>
): FactionStats[] => {
  const factionNames = Array.from(allFactionRelationships.keys());

  return factionNames.map(factionName =>
    calculateFactionStats(
      factionName,
      allCharacters,
      allFactionRelationships.get(factionName) || []
    )
  );
};
