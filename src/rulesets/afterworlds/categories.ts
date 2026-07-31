import type { FacetCategory } from 'lore/ruleset';
import { PerkTag } from './content/gameData';

/**
 * Was a hardcoded `Record<PerkTag, string>` inside FactionStatsScreen (#9).
 * Category colors are ruleset content — a flavor with five categories gets to
 * pick its own five, and the screen cycles a shared palette for any it omits.
 */
const CATEGORY_COLORS: Record<string, string> = {
  [PerkTag.Agility]: '#3498DB',
  [PerkTag.Charisma]: '#E91E63',
  [PerkTag.Crafting]: '#FF9800',
  [PerkTag.Defense]: '#9C27B0',
  [PerkTag.Endurance]: '#4CAF50',
  [PerkTag.Finesse]: '#00BCD4',
  [PerkTag.Grit]: '#795548',
  [PerkTag.Medical]: '#F44336',
  [PerkTag.Smarts]: '#2196F3',
  [PerkTag.Strength]: '#E74C3C',
  [PerkTag.Teamwork]: '#009688',
  [PerkTag.Technical]: '#607D8B',
};

export const afterworldsTraitCategories: FacetCategory[] = Object.values(
  PerkTag
).map(tag => ({ id: tag, label: tag, color: CATEGORY_COLORS[tag] }));
