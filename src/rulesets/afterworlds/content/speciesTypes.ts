/**
 * Species-specific types and constants for the game.
 * These types are game-specific and would be abstracted for other games.
 */

type BaseSpecies =
  | 'Android'
  | 'Drone'
  | 'Human'
  | 'Mutant'
  | 'Nomad'
  | 'Stray'
  | 'Unturned'
  | 'Unknown';

type PrestigeSpecies =
  | 'Cyborg'
  | 'Mook'
  | 'Mutoid'
  | 'Perfect Mutant'
  | 'Rad-Titan'
  | 'Roadkill'
  | 'Tech-Mutant';

export type Species = BaseSpecies | PrestigeSpecies;

export interface SpeciesStats {
  baseHealth: number;
  baseLimit: number;
  healthCap: number;
  limitCap: number;
  canUseCyberware: boolean;
  canUseChems: boolean;
  canTakeInjuries: boolean;
  canTakeMalfunctions: boolean;
}

export const ORGANIC_SPECIES: Species[] = [
  'Human',
  'Mutant',
  'Nomad',
  'Stray',
  'Unturned',
  'Cyborg',
  'Mook',
  'Mutoid',
  'Perfect Mutant',
  'Rad-Titan',
  'Roadkill',
  'Tech-Mutant',
];

export const ROBOTIC_SPECIES: Species[] = ['Android', 'Drone'];

export const MUTANT_SPECIES: Species[] = [
  'Mutant',
  'Perfect Mutant',
  'Tech-Mutant',
];

export const ANDROID_SPECIES: Species[] = ['Android', 'Tech-Mutant'];

// Internal helper constants for species stat definitions
const organicDefaultSpeciesStats: SpeciesStats = {
  baseHealth: 2,
  baseLimit: 1,
  healthCap: 5,
  limitCap: 5,
  canUseCyberware: true,
  canUseChems: true,
  canTakeInjuries: true,
  canTakeMalfunctions: false,
};

const roboticDefaultSpeciesStats: SpeciesStats = {
  baseHealth: 2,
  baseLimit: 1,
  healthCap: 5,
  limitCap: 5,
  canUseCyberware: false,
  canUseChems: false,
  canTakeInjuries: false,
  canTakeMalfunctions: true,
};

export const SPECIES_BASE_STATS: Record<Species, SpeciesStats> = {
  // Base Species
  Android: {
    ...roboticDefaultSpeciesStats,
  },
  Drone: {
    ...roboticDefaultSpeciesStats,
  },
  Human: {
    ...organicDefaultSpeciesStats,
    baseLimit: 2,
  },
  Mutant: {
    ...organicDefaultSpeciesStats,
  },
  Nomad: {
    ...organicDefaultSpeciesStats,
  },
  Stray: {
    ...organicDefaultSpeciesStats,
  },
  Unturned: {
    ...organicDefaultSpeciesStats,
    baseHealth: 0,
    baseLimit: 3,
    healthCap: 0,
    limitCap: 10,
  },
  Unknown: {
    ...organicDefaultSpeciesStats,
  },

  // Prestige Species
  Cyborg: {
    ...organicDefaultSpeciesStats,
  },
  Mook: {
    ...organicDefaultSpeciesStats,
  },
  // TODO: Mutoid is weird
  Mutoid: {
    baseHealth: 2,
    baseLimit: 1,
    healthCap: 5,
    limitCap: 5,
    canUseCyberware: true,
    canUseChems: true,
    canTakeInjuries: true,
    canTakeMalfunctions: false,
  },
  'Perfect Mutant': {
    ...organicDefaultSpeciesStats,
  },
  'Rad-Titan': {
    ...organicDefaultSpeciesStats,
    baseHealth: 3,
    baseLimit: 0,
    healthCap: 10,
    limitCap: 0,
  },
  Roadkill: {
    ...organicDefaultSpeciesStats,
  },
  'Tech-Mutant': {
    ...organicDefaultSpeciesStats,
  },
};
