import { RelationshipStanding } from '@models/types';
import type { GraphNodeType } from '@utils/relationshipGraph';
import { colors } from '@/styles/theme';

/**
 * `colors.standing` keys (allied/friendly/neutral/hostile/enemy) don't share
 * casing with the `RelationshipStanding` enum values (Ally/Friend/...), so
 * this maps one to the other for edge coloring.
 */
export const standingEdgeColor = (standing: RelationshipStanding): string => {
  switch (standing) {
    case RelationshipStanding.Ally:
      return colors.standing.allied;
    case RelationshipStanding.Friend:
      return colors.standing.friendly;
    case RelationshipStanding.Hostile:
      return colors.standing.hostile;
    case RelationshipStanding.Enemy:
      return colors.standing.enemy;
    case RelationshipStanding.Neutral:
    default:
      return colors.standing.neutral;
  }
};

export const nodeTypeColor = (type: GraphNodeType): string => {
  switch (type) {
    case 'character':
      return colors.accent.primary;
    case 'faction':
      return colors.accent.secondary;
    case 'location':
      return colors.accent.info;
    default:
      return colors.accent.primary;
  }
};

export const nodeTypeLabel = (type: GraphNodeType): string => {
  switch (type) {
    case 'character':
      return 'Character';
    case 'faction':
      return 'Faction';
    case 'location':
      return 'Location';
    default:
      return type;
  }
};
