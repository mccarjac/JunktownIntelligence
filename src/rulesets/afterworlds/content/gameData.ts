import { Recipe, Distinction } from './types';
import {
  Species,
  ORGANIC_SPECIES,
  ROBOTIC_SPECIES,
  MUTANT_SPECIES,
  ANDROID_SPECIES,
} from './speciesTypes';

export enum PerkTag {
  Agility = 'Agility',
  Charisma = 'Charisma',
  Crafting = 'Crafting',
  Defense = 'Defense',
  Endurance = 'Endurance',
  Finesse = 'Finesse',
  Grit = 'Grit',
  Medical = 'Medical',
  Smarts = 'Smarts',
  Strength = 'Strength',
  Teamwork = 'Teamwork',
  Technical = 'Technical',
}

export interface StatModifiers {
  health?: number;
  limit?: number;
  healthCap?: number;
  limitCap?: number;
  tagModifiers?: Partial<Record<PerkTag, number>>;
}

export interface TagScoreBonus {
  requiredScore: number;
  health?: number;
  limit?: number;
}

export type TagBonusConfig = {
  [key in PerkTag]: TagScoreBonus[];
};

// TODO : Populate with actual tag score bonuses
export const TAG_SCORE_BONUSES: TagBonusConfig = {
  Agility: [
    { requiredScore: 3, limit: 1 },
    { requiredScore: 6, limit: 1 },
    { requiredScore: 10, limit: 1 },
  ],
  Charisma: [
    { requiredScore: 3, limit: 1 },
    { requiredScore: 6, limit: 1 },
    { requiredScore: 10, limit: 1 },
  ],
  Crafting: [
    { requiredScore: 3, health: 1 },
    { requiredScore: 6, limit: 1 },
    { requiredScore: 10, health: 1 },
  ],
  Defense: [
    { requiredScore: 3, limit: 1 },
    { requiredScore: 6, limit: 1, health: 1 },
    { requiredScore: 10, limit: 1, health: 1 },
  ],
  Endurance: [
    { requiredScore: 3, health: 1 },
    { requiredScore: 6, health: 1 },
    { requiredScore: 10, health: 2 },
  ],
  Finesse: [
    { requiredScore: 3, limit: 1 },
    { requiredScore: 6, limit: 1 },
    { requiredScore: 10, limit: 1 },
  ],
  Grit: [
    { requiredScore: 3, limit: 1 },
    { requiredScore: 6, health: 1 },
    { requiredScore: 10, limit: 1 },
  ],
  Medical: [
    { requiredScore: 3, limit: 1 },
    { requiredScore: 6, health: 1 },
    { requiredScore: 10, limit: 1 },
  ],
  Smarts: [
    { requiredScore: 3, limit: 1 },
    { requiredScore: 6, limit: 1 },
    { requiredScore: 10, limit: 1 },
  ],
  Strength: [
    { requiredScore: 3, health: 1 },
    { requiredScore: 6, health: 1 },
    { requiredScore: 10, health: 1 },
  ],
  Teamwork: [
    { requiredScore: 3, limit: 1 },
    { requiredScore: 6, limit: 1 },
    { requiredScore: 10, limit: 1, health: 1 },
  ],
  Technical: [
    { requiredScore: 3, limit: 1 },
    { requiredScore: 6, health: 1 },
    { requiredScore: 10, limit: 1 },
  ],
};

export type RecipeId = (typeof AVAILABLE_RECIPES)[number]['id'];

// TODO : Populate with actual recipes
export const AVAILABLE_RECIPES: Recipe[] = [
  {
    id: 'r1',
    name: 'Makeshift Battery',
    description: 'A jury-rigged power cell that can power small devices',
    materials: ['Scrap Electronics', 'Copper Wire', 'Chemical Solution'],
  },
  {
    id: 'r2',
    name: 'Scrap Armor',
    description: 'Basic protection crafted from salvaged materials',
    materials: ['Metal Scraps', 'Leather', 'Fasteners'],
  },
  {
    id: 'r3',
    name: 'Advanced Power Armor',
    description: 'High-tech protective suit with power assistance',
    materials: [
      'Rare Alloy',
      'Power Core',
      'Hydraulic Systems',
      'Control Circuit',
    ],
  },
  {
    id: 'r4',
    name: 'Energy Shield Generator',
    description: 'Personal defense system that projects an energy barrier',
    materials: [
      'Crystal Matrix',
      'Power Core',
      'Shield Emitter',
      'Control Circuit',
    ],
  },
] as const;

export interface Perk {
  id: string;
  name: string;
  description: string;
  tag: PerkTag;
  statModifiers?: StatModifiers;
  allowedSpecies?: Species[];
  recipeIds?: RecipeId[];
}

// TODO : Populate with actual perks
export const AVAILABLE_PERKS: Perk[] = [
  // Agility Perks
  {
    id: 'agility_1',
    name: 'Agile Strikes',
    description: '',
    tag: PerkTag.Agility,
  },
  {
    id: 'agility_2',
    name: 'Danger Sense',
    description: '',
    tag: PerkTag.Agility,
  },
  {
    id: 'agility_3',
    name: 'Defensive Roll',
    description: '',
    tag: PerkTag.Agility,
  },
  {
    id: 'agility_4',
    name: 'Desperate Maneuvers',
    description: '',
    tag: PerkTag.Agility,
  },
  {
    id: 'agility_5',
    name: 'Duck And Cover',
    description: '',
    tag: PerkTag.Agility,
  },
  {
    id: 'agility_6',
    name: 'Escape Artist',
    description: '',
    tag: PerkTag.Agility,
  },
  {
    id: 'agility_7',
    name: 'Nimble Moves',
    description: '',
    tag: PerkTag.Agility,
  },
  { id: 'agility_8', name: 'Outplay', description: '', tag: PerkTag.Agility },
  { id: 'agility_9', name: 'Parkour', description: '', tag: PerkTag.Agility },
  {
    id: 'agility_10',
    name: 'Pinning Strike',
    description: '',
    tag: PerkTag.Agility,
  },
  {
    id: 'agility_11',
    name: 'Precision Strike',
    description: '',
    tag: PerkTag.Agility,
  },
  {
    id: 'agility_12',
    name: 'Preparation',
    description: '',
    tag: PerkTag.Agility,
  },
  {
    id: 'agility_13',
    name: 'Twin Parry',
    description: '',
    tag: PerkTag.Agility,
  },
  {
    id: 'agility_14',
    name: 'Viper Strike',
    description: '',
    tag: PerkTag.Agility,
  },
  {
    id: 'agility_15',
    name: 'Shockbolts',
    description: '',
    tag: PerkTag.Agility,
    allowedSpecies: [...MUTANT_SPECIES],
  },
  {
    id: 'agility_16',
    name: 'Tunnel Rat',
    description: '',
    tag: PerkTag.Agility,
    allowedSpecies: ['Nomad'],
  },
  {
    id: 'agility_17',
    name: 'Cornered Beast',
    description: '',
    tag: PerkTag.Agility,
    allowedSpecies: ['Stray'],
  },
  {
    id: 'agility_18',
    name: 'Natural Weapons',
    description: '',
    tag: PerkTag.Agility,
    allowedSpecies: ['Stray'],
  },
  {
    id: 'agility_19',
    name: 'Snap',
    description: '',
    tag: PerkTag.Agility,
    allowedSpecies: ['Stray'],
  },
  {
    id: 'agility_20',
    name: 'Zoomies',
    description: '',
    tag: PerkTag.Agility,
    allowedSpecies: ['Stray'],
  },

  // Charisma Perks
  {
    id: 'charisma_1',
    name: 'De-Escalate',
    description: '',
    tag: PerkTag.Charisma,
  },
  {
    id: 'charisma_2',
    name: 'Good Company',
    description: '',
    tag: PerkTag.Charisma,
  },
  { id: 'charisma_3', name: 'Haggle', description: '', tag: PerkTag.Charisma },
  {
    id: 'charisma_4',
    name: 'Inconspicuous',
    description: '',
    tag: PerkTag.Charisma,
  },
  {
    id: 'charisma_5',
    name: 'Infiltrate',
    description: '',
    tag: PerkTag.Charisma,
  },
  { id: 'charisma_6', name: 'Intel', description: '', tag: PerkTag.Charisma },
  {
    id: 'charisma_7',
    name: 'Intimidate',
    description: '',
    tag: PerkTag.Charisma,
  },
  {
    id: 'charisma_8',
    name: 'Last Word',
    description: '',
    tag: PerkTag.Charisma,
  },
  {
    id: 'charisma_9',
    name: 'Magnetism',
    description: '',
    tag: PerkTag.Charisma,
  },
  {
    id: 'charisma_10',
    name: 'Negotiate',
    description: '',
    tag: PerkTag.Charisma,
  },
  {
    id: 'charisma_11',
    name: 'Obnoxious',
    description: '',
    tag: PerkTag.Charisma,
  },
  {
    id: 'charisma_12',
    name: 'Pep Talk',
    description: '',
    tag: PerkTag.Charisma,
  },
  {
    id: 'charisma_13',
    name: 'Practiced Negotiator',
    description: '',
    tag: PerkTag.Charisma,
  },
  { id: 'charisma_14', name: 'Savvy', description: '', tag: PerkTag.Charisma },
  {
    id: 'charisma_15',
    name: 'Peech Suite',
    description: '',
    tag: PerkTag.Charisma,
    allowedSpecies: [...ANDROID_SPECIES],
  },
  {
    id: 'charisma_16',
    name: 'Voice Activated',
    description: '',
    tag: PerkTag.Charisma,
    allowedSpecies: ['Drone'],
  },
  {
    id: 'charisma_17',
    name: 'Mind Fortress',
    description: '',
    tag: PerkTag.Charisma,
    allowedSpecies: [...MUTANT_SPECIES],
  },

  // Crafting Perks
  {
    id: 'crafting_1',
    name: 'Alchemist',
    description: '',
    tag: PerkTag.Crafting,
  },
  {
    id: 'crafting_2',
    name: 'Apothecary',
    description: '',
    tag: PerkTag.Crafting,
  },
  { id: 'crafting_3', name: 'Artisan', description: '', tag: PerkTag.Crafting },
  {
    id: 'crafting_4',
    name: 'Backstock',
    description: '',
    tag: PerkTag.Crafting,
  },
  {
    id: 'crafting_5',
    name: 'Bullet Smith',
    description: '',
    tag: PerkTag.Crafting,
  },
  { id: 'crafting_6', name: 'Chemist', description: '', tag: PerkTag.Crafting },
  { id: 'crafting_7', name: 'Cook', description: '', tag: PerkTag.Crafting },
  {
    id: 'crafting_8',
    name: 'Creative',
    description: '',
    tag: PerkTag.Crafting,
  },
  {
    id: 'crafting_9',
    name: 'Efficient',
    description: '',
    tag: PerkTag.Crafting,
  },
  {
    id: 'crafting_10',
    name: 'Fletcher',
    description: '',
    tag: PerkTag.Crafting,
  },
  {
    id: 'crafting_11',
    name: 'Herbalist',
    description: '',
    tag: PerkTag.Crafting,
  },
  { id: 'crafting_12', name: 'Hookup', description: '', tag: PerkTag.Crafting },
  {
    id: 'crafting_13',
    name: 'Mad Science',
    description: '',
    tag: PerkTag.Crafting,
  },
  {
    id: 'crafting_14',
    name: 'Ordinance',
    description: '',
    tag: PerkTag.Crafting,
  },
  {
    id: 'crafting_15',
    name: 'Pharmacist',
    description: '',
    tag: PerkTag.Crafting,
  },
  {
    id: 'crafting_16',
    name: 'Recycler',
    description: '',
    tag: PerkTag.Crafting,
  },
  {
    id: 'crafting_17',
    name: 'Seamster',
    description: '',
    tag: PerkTag.Crafting,
  },
  {
    id: 'crafting_18',
    name: 'Security Expert',
    description: '',
    tag: PerkTag.Crafting,
  },
  {
    id: 'crafting_19',
    name: 'Supply Tech',
    description: '',
    tag: PerkTag.Crafting,
  },
  { id: 'crafting_20', name: 'Tailor', description: '', tag: PerkTag.Crafting },
  { id: 'crafting_21', name: 'Techie', description: '', tag: PerkTag.Crafting },
  {
    id: 'crafting_22',
    name: 'Tinkerer',
    description: '',
    tag: PerkTag.Crafting,
  },
  {
    id: 'crafting_23',
    name: 'Sarasang Suite',
    description: '',
    tag: PerkTag.Crafting,
    allowedSpecies: [...ANDROID_SPECIES],
  },
  {
    id: 'crafting_24',
    name: 'Fermentation',
    description: '',
    tag: PerkTag.Crafting,
    allowedSpecies: ['Nomad'],
  },
  {
    id: 'crafting_25',
    name: 'Honest Work',
    description: '',
    tag: PerkTag.Crafting,
    allowedSpecies: ['Nomad'],
  },
  {
    id: 'crafting_26',
    name: 'Stash',
    description: '',
    tag: PerkTag.Crafting,
    allowedSpecies: ['Nomad'],
  },

  // Defense Perks
  { id: 'defense_1', name: 'Aegis', description: '', tag: PerkTag.Defense },
  { id: 'defense_2', name: 'Breach', description: '', tag: PerkTag.Defense },
  { id: 'defense_3', name: 'Bulwark', description: '', tag: PerkTag.Defense },
  { id: 'defense_4', name: 'Custodian', description: '', tag: PerkTag.Defense },
  {
    id: 'defense_5',
    name: 'Defensive Stance',
    description: '',
    tag: PerkTag.Defense,
  },
  { id: 'defense_6', name: 'Goalie', description: '', tag: PerkTag.Defense },
  { id: 'defense_7', name: 'Guardian', description: '', tag: PerkTag.Defense },
  {
    id: 'defense_8',
    name: 'Lead Lining',
    description: '',
    tag: PerkTag.Defense,
  },
  {
    id: 'defense_9',
    name: 'Light Armor Mastery',
    description: '',
    tag: PerkTag.Defense,
  },
  {
    id: 'defense_10',
    name: 'Not On My Watch',
    description: '',
    tag: PerkTag.Defense,
  },
  {
    id: 'defense_11',
    name: 'One Man Army',
    description: '',
    tag: PerkTag.Defense,
  },
  { id: 'defense_12', name: 'Ornery', description: '', tag: PerkTag.Defense },
  {
    id: 'defense_13',
    name: 'Safekeeper',
    description: '',
    tag: PerkTag.Defense,
  },
  {
    id: 'defense_14',
    name: 'Shieldkin',
    description: '',
    tag: PerkTag.Defense,
  },
  {
    id: 'defense_15',
    name: 'Shieldbash',
    description: '',
    tag: PerkTag.Defense,
  },
  {
    id: 'defense_16',
    name: 'Shieldbearer',
    description: '',
    tag: PerkTag.Defense,
  },
  {
    id: 'defense_17',
    name: 'Shield Wall',
    description: '',
    tag: PerkTag.Defense,
  },
  {
    id: 'defense_18',
    name: 'Strongarm',
    description: '',
    tag: PerkTag.Defense,
  },
  {
    id: 'defense_19',
    name: 'True Threat',
    description: '',
    tag: PerkTag.Defense,
  },
  {
    id: 'defense_20',
    name: 'Battle Bot',
    description: '',
    tag: PerkTag.Defense,
    allowedSpecies: [...ANDROID_SPECIES],
  },
  {
    id: 'defense_21',
    name: 'Defensive Measures',
    description: '',
    tag: PerkTag.Defense,
    allowedSpecies: [...ANDROID_SPECIES],
  },
  {
    id: 'defense_22',
    name: 'Overdrive',
    description: '',
    tag: PerkTag.Defense,
    allowedSpecies: [...ANDROID_SPECIES],
  },
  {
    id: 'defense_23',
    name: 'Rugged Construction',
    description: '',
    tag: PerkTag.Defense,
    allowedSpecies: [...ANDROID_SPECIES],
    statModifiers: { health: 1 },
  },
  {
    id: 'defense_24',
    name: 'Yeskia Suite',
    description: '',
    tag: PerkTag.Defense,
    allowedSpecies: [...ANDROID_SPECIES],
  },
  {
    id: 'defense_25',
    name: 'Force Shield',
    description: '',
    tag: PerkTag.Defense,
    allowedSpecies: [...MUTANT_SPECIES],
  },
  {
    id: 'defense_26',
    name: 'Forcefield',
    description: '',
    tag: PerkTag.Defense,
    allowedSpecies: [...MUTANT_SPECIES],
  },
  {
    id: 'defense_27',
    name: 'Inedible',
    description: '',
    tag: PerkTag.Defense,
    allowedSpecies: [...MUTANT_SPECIES],
  },
  {
    id: 'defense_28',
    name: 'Thorns',
    description: '',
    tag: PerkTag.Defense,
    allowedSpecies: [...MUTANT_SPECIES],
  },
  {
    id: 'defense_29',
    name: 'Skittish',
    description: '',
    tag: PerkTag.Defense,
    allowedSpecies: ['Stray'],
  },
  {
    id: 'defense_30',
    name: 'Thick Hide',
    description: '',
    tag: PerkTag.Defense,
    allowedSpecies: ['Stray'],
  },

  // Endurance Perks
  {
    id: 'endurance_1',
    name: 'Adrenaline Rush',
    description: '',
    tag: PerkTag.Endurance,
  },
  {
    id: 'endurance_2',
    name: 'Antibodies',
    description: '',
    tag: PerkTag.Endurance,
  },
  {
    id: 'endurance_3',
    name: 'Battle Scars',
    description: '',
    tag: PerkTag.Endurance,
  },
  {
    id: 'endurance_4',
    name: 'Brawler',
    description: '',
    tag: PerkTag.Endurance,
  },
  {
    id: 'endurance_5',
    name: 'Chokehold',
    description: '',
    tag: PerkTag.Endurance,
  },
  {
    id: 'endurance_6',
    name: 'Chrome Prone',
    description: '',
    tag: PerkTag.Endurance,
  },
  {
    id: 'endurance_7',
    name: 'Executioner',
    description: '',
    tag: PerkTag.Endurance,
  },
  { id: 'endurance_8', name: 'Fury', description: '', tag: PerkTag.Endurance },
  {
    id: 'endurance_9',
    name: 'Human Shield',
    description: '',
    tag: PerkTag.Endurance,
  },
  {
    id: 'endurance_10',
    name: 'Juggernaut',
    description: '',
    tag: PerkTag.Endurance,
  },
  {
    id: 'endurance_11',
    name: 'Meat Shield',
    description: '',
    tag: PerkTag.Endurance,
  },
  { id: 'endurance_12', name: 'Rage', description: '', tag: PerkTag.Endurance },
  {
    id: 'endurance_13',
    name: 'Resilience',
    description: '',
    tag: PerkTag.Endurance,
  },
  {
    id: 'endurance_14',
    name: 'Self Care',
    description: '',
    tag: PerkTag.Endurance,
  },
  {
    id: 'endurance_15',
    name: 'Tenacity',
    description: '',
    tag: PerkTag.Endurance,
  },
  {
    id: 'endurance_16',
    name: 'Autotomy',
    description: '',
    tag: PerkTag.Endurance,
    allowedSpecies: [...MUTANT_SPECIES],
  },
  {
    id: 'endurance_17',
    name: 'Electrolance',
    description: '',
    tag: PerkTag.Endurance,
    allowedSpecies: [...MUTANT_SPECIES],
  },
  {
    id: 'endurance_18',
    name: 'Feedback',
    description: '',
    tag: PerkTag.Endurance,
    allowedSpecies: [...MUTANT_SPECIES],
  },
  {
    id: 'endurance_19',
    name: 'Leech',
    description: '',
    tag: PerkTag.Endurance,
    allowedSpecies: [...MUTANT_SPECIES],
  },
  {
    id: 'endurance_20',
    name: 'Photosynthesis',
    description: '',
    tag: PerkTag.Endurance,
    allowedSpecies: [...MUTANT_SPECIES],
  },
  {
    id: 'endurance_21',
    name: 'Poison Cloud',
    description: '',
    tag: PerkTag.Endurance,
    allowedSpecies: [...MUTANT_SPECIES],
  },
  {
    id: 'endurance_22',
    name: 'Rad Regeneration',
    description: '',
    tag: PerkTag.Endurance,
    allowedSpecies: [...MUTANT_SPECIES],
  },
  {
    id: 'endurance_23',
    name: 'Rad Sponge',
    description: '',
    tag: PerkTag.Endurance,
    allowedSpecies: [...MUTANT_SPECIES],
  },
  {
    id: 'endurance_24',
    name: 'Good Blood',
    description: '',
    tag: PerkTag.Endurance,
    allowedSpecies: ['Nomad'],
  },
  {
    id: 'endurance_25',
    name: 'Sleep It Off',
    description: '',
    tag: PerkTag.Endurance,
    allowedSpecies: ['Nomad'],
  },
  {
    id: 'endurance_26',
    name: 'Thick Skin',
    description: '',
    tag: PerkTag.Endurance,
    allowedSpecies: ['Nomad'],
    statModifiers: { health: 1 },
  },
  {
    id: 'endurance_27',
    name: 'Deathroll',
    description: '',
    tag: PerkTag.Endurance,
    allowedSpecies: ['Stray'],
  },
  {
    id: 'endurance_28',
    name: 'Lockjaw',
    description: '',
    tag: PerkTag.Endurance,
    allowedSpecies: ['Stray'],
  },
  {
    id: 'endurance_29',
    name: 'Cling To Humanity',
    description: '',
    tag: PerkTag.Endurance,
    allowedSpecies: ['Unturned'],
  },
  {
    id: 'endurance_30',
    name: 'Desperation',
    description: '',
    tag: PerkTag.Endurance,
    allowedSpecies: ['Unturned'],
  },
  {
    id: 'endurance_31',
    name: 'First Blood',
    description: '',
    tag: PerkTag.Endurance,
    allowedSpecies: ['Unturned'],
  },
  {
    id: 'endurance_32',
    name: 'Give In To Hunger',
    description: '',
    tag: PerkTag.Endurance,
    allowedSpecies: ['Unturned'],
  },
  {
    id: 'endurance_33',
    name: 'Gnash',
    description: '',
    tag: PerkTag.Endurance,
    allowedSpecies: ['Unturned'],
  },
  {
    id: 'endurance_34',
    name: 'Pain Suppression',
    description: '',
    tag: PerkTag.Endurance,
    allowedSpecies: ['Unturned'],
  },
  {
    id: 'endurance_35',
    name: 'Revenant',
    description: '',
    tag: PerkTag.Endurance,
    allowedSpecies: ['Unturned'],
  },
  {
    id: 'endurance_36',
    name: 'Vigor Mortis',
    description: '',
    tag: PerkTag.Endurance,
    allowedSpecies: ['Unturned'],
  },

  // Finesse Perks
  {
    id: 'finesse_1',
    name: 'Armored Sneak',
    description: '',
    tag: PerkTag.Finesse,
  },
  { id: 'finesse_2', name: 'Assassin', description: '', tag: PerkTag.Finesse },
  {
    id: 'finesse_3',
    name: 'Cover Your Tracks',
    description: '',
    tag: PerkTag.Finesse,
  },
  {
    id: 'finesse_4',
    name: 'Feign Death',
    description: '',
    tag: PerkTag.Finesse,
  },
  {
    id: 'finesse_5',
    name: 'Lock Picking',
    description: '',
    tag: PerkTag.Finesse,
  },
  { id: 'finesse_6', name: 'Lucky', description: '', tag: PerkTag.Finesse },
  { id: 'finesse_7', name: 'Malice', description: '', tag: PerkTag.Finesse },
  {
    id: 'finesse_8',
    name: 'Shadow Sting',
    description: '',
    tag: PerkTag.Finesse,
  },
  { id: 'finesse_9', name: 'Slink', description: '', tag: PerkTag.Finesse },
  { id: 'finesse_10', name: 'Swoop', description: '', tag: PerkTag.Finesse },
  { id: 'finesse_11', name: 'Vanish', description: '', tag: PerkTag.Finesse },
  {
    id: 'finesse_12',
    name: 'Power Down',
    description: '',
    tag: PerkTag.Finesse,
    allowedSpecies: [...ANDROID_SPECIES],
  },
  {
    id: 'finesse_13',
    name: 'Phase',
    description: '',
    tag: PerkTag.Finesse,
    allowedSpecies: [...MUTANT_SPECIES],
  },
  {
    id: 'finesse_14',
    name: 'Stalker',
    description: '',
    tag: PerkTag.Finesse,
    allowedSpecies: ['Unturned'],
  },

  // Grit Perks
  { id: 'grit_1', name: 'Bloodthirsty', description: '', tag: PerkTag.Grit },
  { id: 'grit_2', name: 'Bot-Battler', description: '', tag: PerkTag.Grit },
  { id: 'grit_3', name: 'Bounty Hunter', description: '', tag: PerkTag.Grit },
  { id: 'grit_4', name: 'Camouflage', description: '', tag: PerkTag.Grit },
  { id: 'grit_5', name: 'Conserve Ammo', description: '', tag: PerkTag.Grit },
  { id: 'grit_6', name: 'Dead Eye', description: '', tag: PerkTag.Grit },
  { id: 'grit_7', name: 'Dead Ringer', description: '', tag: PerkTag.Grit },
  { id: 'grit_8', name: 'Double Tap', description: '', tag: PerkTag.Grit },
  { id: 'grit_9', name: 'Guerilla', description: '', tag: PerkTag.Grit },
  { id: 'grit_10', name: 'Home Team', description: '', tag: PerkTag.Grit },
  {
    id: 'grit_11',
    name: 'Reloading Drills',
    description: '',
    tag: PerkTag.Grit,
  },
  { id: 'grit_12', name: 'Snipe', description: '', tag: PerkTag.Grit },
  { id: 'grit_13', name: 'Trick Shot', description: '', tag: PerkTag.Grit },
  { id: 'grit_14', name: 'Wasteland CSI', description: '', tag: PerkTag.Grit },
  { id: 'grit_15', name: 'Wild Child', description: '', tag: PerkTag.Grit },
  { id: 'grit_16', name: 'Zombie Hunter', description: '', tag: PerkTag.Grit },
  {
    id: 'grit_17',
    name: 'Hunter Drone',
    description: '',
    tag: PerkTag.Grit,
    allowedSpecies: ['Drone'],
  },
  {
    id: 'grit_18',
    name: 'Scanner',
    description: '',
    tag: PerkTag.Grit,
    allowedSpecies: ['Drone'],
  },
  {
    id: 'grit_19',
    name: 'Target Assistant',
    description: '',
    tag: PerkTag.Grit,
    allowedSpecies: ['Drone'],
  },
  {
    id: 'grit_20',
    name: 'Weapon Mount',
    description: '',
    tag: PerkTag.Grit,
    allowedSpecies: ['Drone'],
  },
  {
    id: 'grit_21',
    name: 'Sewer Hunter',
    description: '',
    tag: PerkTag.Grit,
    allowedSpecies: ['Nomad'],
  },
  {
    id: 'grit_22',
    name: 'Tae-Kwon-Bow',
    description: '',
    tag: PerkTag.Grit,
    allowedSpecies: ['Nomad'],
  },
  {
    id: 'grit_23',
    name: 'Scent',
    description: '',
    tag: PerkTag.Grit,
    allowedSpecies: ['Stray'],
  },
  {
    id: 'grit_24',
    name: 'Thrill Of The Hunt',
    description: '',
    tag: PerkTag.Grit,
    allowedSpecies: ['Stray'],
  },
  {
    id: 'grit_25',
    name: 'Tracker',
    description: '',
    tag: PerkTag.Grit,
    allowedSpecies: ['Stray'],
  },
  {
    id: 'grit_26',
    name: 'Venomous',
    description: '',
    tag: PerkTag.Grit,
    allowedSpecies: ['Stray'],
  },
  {
    id: 'grit_27',
    name: 'Child Of The Night',
    description: '',
    tag: PerkTag.Grit,
    allowedSpecies: ['Unturned'],
  },
  {
    id: 'grit_28',
    name: 'One Of Them',
    description: '',
    tag: PerkTag.Grit,
    allowedSpecies: ['Unturned'],
  },

  // Medical Perks
  {
    id: 'medical_1',
    name: 'Anesthesiologist',
    description: '',
    tag: PerkTag.Medical,
  },
  { id: 'medical_2', name: 'Attendant', description: '', tag: PerkTag.Medical },
  { id: 'medical_3', name: 'Chop-Doc', description: '', tag: PerkTag.Medical },
  { id: 'medical_4', name: 'Clinician', description: '', tag: PerkTag.Medical },
  {
    id: 'medical_5',
    name: 'Combat Medic',
    description: '',
    tag: PerkTag.Medical,
  },
  { id: 'medical_6', name: 'Coroner', description: '', tag: PerkTag.Medical },
  { id: 'medical_7', name: 'Examiner', description: '', tag: PerkTag.Medical },
  { id: 'medical_8', name: 'First Aid', description: '', tag: PerkTag.Medical },
  {
    id: 'medical_9',
    name: 'First Responder',
    description: '',
    tag: PerkTag.Medical,
  },
  {
    id: 'medical_10',
    name: 'General Practitioner',
    description: '',
    tag: PerkTag.Medical,
  },
  { id: 'medical_11', name: 'Hazmat', description: '', tag: PerkTag.Medical },
  {
    id: 'medical_12',
    name: 'Miracle Worker',
    description: '',
    tag: PerkTag.Medical,
  },
  {
    id: 'medical_13',
    name: 'Veterinarian',
    description: '',
    tag: PerkTag.Medical,
  },
  {
    id: 'medical_14',
    name: 'Wasteland MD',
    description: '',
    tag: PerkTag.Medical,
  },

  // Smarts Perks
  {
    id: 'smarts_1',
    name: 'Brains Over Brawn',
    description: '',
    tag: PerkTag.Smarts,
  },
  {
    id: 'smarts_2',
    name: 'Cunning Strike',
    description: '',
    tag: PerkTag.Smarts,
  },
  { id: 'smarts_3', name: 'Dopamine', description: '', tag: PerkTag.Smarts },
  {
    id: 'smarts_4',
    name: 'Exploit Weakness',
    description: '',
    tag: PerkTag.Smarts,
  },
  { id: 'smarts_5', name: 'Pat Down', description: '', tag: PerkTag.Smarts },
  { id: 'smarts_6', name: 'Polymath', description: '', tag: PerkTag.Smarts },
  { id: 'smarts_7', name: 'Ingenuity', description: '', tag: PerkTag.Smarts },
  {
    id: 'smarts_8',
    name: 'Scavengers Sense',
    description: '',
    tag: PerkTag.Smarts,
  },
  {
    id: 'smarts_9',
    name: 'Signature Equipment',
    description: '',
    tag: PerkTag.Smarts,
  },
  {
    id: 'smarts_10',
    name: 'Signature Style',
    description: '',
    tag: PerkTag.Smarts,
  },
  { id: 'smarts_11', name: 'Strategist', description: '', tag: PerkTag.Smarts },
  {
    id: 'smarts_12',
    name: 'Temporary Brilliance',
    description: '',
    tag: PerkTag.Smarts,
  },
  { id: 'smarts_13', name: 'Wired', description: '', tag: PerkTag.Smarts },
  {
    id: 'smarts_14',
    name: 'Expanded Battery',
    description: '',
    tag: PerkTag.Smarts,
    allowedSpecies: [...ANDROID_SPECIES],
    statModifiers: { limit: 1 },
  },
  {
    id: 'smarts_15',
    name: 'Capacitor Discharge',
    description: '',
    tag: PerkTag.Smarts,
    allowedSpecies: ['Drone'],
  },
  {
    id: 'smarts_16',
    name: 'Fine Tuned',
    description: '',
    tag: PerkTag.Smarts,
    allowedSpecies: ['Drone'],
  },
  {
    id: 'smarts_17',
    name: 'High Capacity Cells',
    description: '',
    tag: PerkTag.Smarts,
    allowedSpecies: ['Drone'],
    statModifiers: { limit: 1 },
  },
  {
    id: 'smarts_18',
    name: 'Hybrid Fuel',
    description: '',
    tag: PerkTag.Smarts,
    allowedSpecies: ['Drone'],
  },
  {
    id: 'smarts_19',
    name: 'Plug And Play',
    description: '',
    tag: PerkTag.Smarts,
    allowedSpecies: ['Drone'],
  },
  {
    id: 'smarts_20',
    name: 'Big Brain',
    description: '',
    tag: PerkTag.Smarts,
    allowedSpecies: [...MUTANT_SPECIES],
    statModifiers: { health: -1, limit: 1, healthCap: -1, limitCap: 1 },
  },
  {
    id: 'smarts_21',
    name: 'Brain Blast',
    description: '',
    tag: PerkTag.Smarts,
    allowedSpecies: [...MUTANT_SPECIES],
  },
  {
    id: 'smarts_22',
    name: 'Mindwalk',
    description: '',
    tag: PerkTag.Smarts,
    allowedSpecies: [...MUTANT_SPECIES],
  },
  {
    id: 'smarts_23',
    name: 'Psychic Scream',
    description: '',
    tag: PerkTag.Smarts,
    allowedSpecies: [...MUTANT_SPECIES],
  },
  {
    id: 'smarts_24',
    name: 'Grazing',
    description: '',
    tag: PerkTag.Smarts,
    allowedSpecies: ['Nomad'],
  },
  {
    id: 'smarts_25',
    name: "It's Still Good",
    description: '',
    tag: PerkTag.Smarts,
    allowedSpecies: ['Nomad'],
  },
  {
    id: 'smarts_26',
    name: 'Slow And Steady',
    description: '',
    tag: PerkTag.Smarts,
    allowedSpecies: ['Nomad'],
  },
  {
    id: 'smarts_27',
    name: 'Herbivore',
    description: '',
    tag: PerkTag.Smarts,
    allowedSpecies: ['Stray'],
  },
  {
    id: 'smarts_28',
    name: 'Nosework',
    description: '',
    tag: PerkTag.Smarts,
    allowedSpecies: ['Stray'],
  },
  {
    id: 'smarts_29',
    name: 'Retrocognition',
    description: '',
    tag: PerkTag.Smarts,
    allowedSpecies: ['Unturned'],
  },
  {
    id: 'smarts_30',
    name: 'Taste Of Talent',
    description: '',
    tag: PerkTag.Smarts,
    allowedSpecies: ['Unturned'],
  },

  // Strength Perks
  {
    id: 'strength_1',
    name: 'Annihilate',
    description: '',
    tag: PerkTag.Strength,
  },
  { id: 'strength_2', name: 'Brawn', description: '', tag: PerkTag.Strength },
  { id: 'strength_3', name: 'Brute', description: '', tag: PerkTag.Strength },
  { id: 'strength_4', name: 'Cleave', description: '', tag: PerkTag.Strength },
  {
    id: 'strength_5',
    name: 'Counter Attack',
    description: '',
    tag: PerkTag.Strength,
  },
  {
    id: 'strength_6',
    name: 'Crushing Strike',
    description: '',
    tag: PerkTag.Strength,
  },
  {
    id: 'strength_7',
    name: 'Leverage',
    description: '',
    tag: PerkTag.Strength,
  },
  { id: 'strength_8', name: 'Mangle', description: '', tag: PerkTag.Strength },
  {
    id: 'strength_9',
    name: 'Obliterate',
    description: '',
    tag: PerkTag.Strength,
  },
  { id: 'strength_10', name: 'Punish', description: '', tag: PerkTag.Strength },
  {
    id: 'strength_11',
    name: 'Rampage',
    description: '',
    tag: PerkTag.Strength,
  },
  {
    id: 'strength_12',
    name: 'Sweeping Strikes',
    description: '',
    tag: PerkTag.Strength,
  },
  { id: 'strength_13', name: 'Temper', description: '', tag: PerkTag.Strength },
  {
    id: 'strength_14',
    name: 'Unstoppable',
    description: '',
    tag: PerkTag.Strength,
  },
  {
    id: 'strength_15',
    name: 'Cargo Upgrade',
    description: '',
    tag: PerkTag.Strength,
    allowedSpecies: [...ANDROID_SPECIES],
  },
  {
    id: 'strength_16',
    name: 'Static Strike',
    description: '',
    tag: PerkTag.Strength,
    allowedSpecies: [...MUTANT_SPECIES],
  },
  {
    id: 'strength_17',
    name: 'Burrow',
    description: '',
    tag: PerkTag.Strength,
    allowedSpecies: ['Nomad'],
  },
  {
    id: 'strength_18',
    name: 'Long Haul',
    description: '',
    tag: PerkTag.Strength,
    allowedSpecies: ['Nomad'],
  },
  {
    id: 'strength_19',
    name: 'Fangs',
    description: '',
    tag: PerkTag.Strength,
    allowedSpecies: ['Stray'],
  },

  // Teamwork Perks
  {
    id: 'teamwork_1',
    name: 'Ambush Commander',
    description: '',
    tag: PerkTag.Teamwork,
  },
  {
    id: 'teamwork_2',
    name: 'Brutal Commander',
    description: '',
    tag: PerkTag.Teamwork,
  },
  {
    id: 'teamwork_3',
    name: 'Compassionate Commander',
    description: '',
    tag: PerkTag.Teamwork,
  },
  { id: 'teamwork_4', name: 'Devoted', description: '', tag: PerkTag.Teamwork },
  {
    id: 'teamwork_5',
    name: 'Efficient Commander',
    description: '',
    tag: PerkTag.Teamwork,
  },
  {
    id: 'teamwork_6',
    name: 'Natural Born Leader',
    description: '',
    tag: PerkTag.Teamwork,
  },
  {
    id: 'teamwork_7',
    name: 'Rallying Cry',
    description: '',
    tag: PerkTag.Teamwork,
  },
  {
    id: 'teamwork_8',
    name: 'Respected',
    description: '',
    tag: PerkTag.Teamwork,
  },
  {
    id: 'teamwork_9',
    name: 'Strength In Numbers',
    description: '',
    tag: PerkTag.Teamwork,
  },
  {
    id: 'teamwork_10',
    name: 'Visionary',
    description: '',
    tag: PerkTag.Teamwork,
  },
  { id: 'teamwork_11', name: 'Volley', description: '', tag: PerkTag.Teamwork },
  { id: 'teamwork_12', name: 'Warcry', description: '', tag: PerkTag.Teamwork },
  {
    id: 'teamwork_13',
    name: 'Hotswap',
    description: '',
    tag: PerkTag.Teamwork,
    allowedSpecies: [...ANDROID_SPECIES],
  },
  {
    id: 'teamwork_14',
    name: 'Dual Core',
    description: '',
    tag: PerkTag.Teamwork,
    allowedSpecies: ['Drone'],
  },
  {
    id: 'teamwork_15',
    name: 'Precision Manipulators',
    description: '',
    tag: PerkTag.Teamwork,
    allowedSpecies: ['Drone'],
  },
  {
    id: 'teamwork_16',
    name: 'Rescue Operations',
    description: '',
    tag: PerkTag.Teamwork,
    allowedSpecies: ['Drone'],
  },
  {
    id: 'teamwork_17',
    name: 'Loyal',
    description: '',
    tag: PerkTag.Teamwork,
    allowedSpecies: ['Stray'],
  },
  {
    id: 'teamwork_18',
    name: 'Pack Bond',
    description: '',
    tag: PerkTag.Teamwork,
    allowedSpecies: ['Stray'],
  },
  {
    id: 'teamwork_19',
    name: 'Pack Leader',
    description: '',
    tag: PerkTag.Teamwork,
    allowedSpecies: ['Stray'],
  },

  // Technical Perks
  {
    id: 'technical_1',
    name: 'Android Technician',
    description: '',
    tag: PerkTag.Technical,
  },
  {
    id: 'technical_2',
    name: 'Breaker',
    description: '',
    tag: PerkTag.Technical,
  },
  {
    id: 'technical_3',
    name: 'Clutch Mechanic',
    description: '',
    tag: PerkTag.Technical,
  },
  {
    id: 'technical_4',
    name: 'Cyber-Surgeon',
    description: '',
    tag: PerkTag.Technical,
  },
  {
    id: 'technical_5',
    name: 'Degauss',
    description: '',
    tag: PerkTag.Technical,
  },
  {
    id: 'technical_6',
    name: 'Drone Certified',
    description: '',
    tag: PerkTag.Technical,
  },
  {
    id: 'technical_7',
    name: 'Gearhead',
    description: '',
    tag: PerkTag.Technical,
  },
  {
    id: 'technical_8',
    name: 'Jump Start',
    description: '',
    tag: PerkTag.Technical,
  },
  {
    id: 'technical_9',
    name: 'Mechanic',
    description: '',
    tag: PerkTag.Technical,
  },
  {
    id: 'technical_10',
    name: 'Percussive Maintenance',
    description: '',
    tag: PerkTag.Technical,
  },
  {
    id: 'technical_11',
    name: 'Scrapper',
    description: '',
    tag: PerkTag.Technical,
  },
  {
    id: 'technical_12',
    name: 'Shop Hand',
    description: '',
    tag: PerkTag.Technical,
  },
  {
    id: 'technical_13',
    name: 'Access Port',
    description: '',
    tag: PerkTag.Technical,
    allowedSpecies: [...ANDROID_SPECIES],
  },
  {
    id: 'technical_14',
    name: 'Delayed Obsolescence',
    description: '',
    tag: PerkTag.Technical,
    allowedSpecies: [...ANDROID_SPECIES],
  },
  {
    id: 'technical_15',
    name: 'Engingoa Suite',
    description: '',
    tag: PerkTag.Technical,
    allowedSpecies: [...ANDROID_SPECIES],
  },
  {
    id: 'technical_16',
    name: 'Nuclear Powered',
    description: '',
    tag: PerkTag.Technical,
    allowedSpecies: [...ANDROID_SPECIES],
  },
  {
    id: 'technical_17',
    name: 'Recall Protocol',
    description: '',
    tag: PerkTag.Technical,
    allowedSpecies: [...ANDROID_SPECIES],
  },
  {
    id: 'technical_18',
    name: 'Solar Skin',
    description: '',
    tag: PerkTag.Technical,
    allowedSpecies: [...ANDROID_SPECIES],
  },
  {
    id: 'technical_19',
    name: 'Component Assimilator',
    description: '',
    tag: PerkTag.Technical,
    allowedSpecies: ['Drone'],
  },
] as const;

export const AVAILABLE_DISTINCTIONS: Distinction[] = [
  {
    id: 'd1',
    name: 'Apathetic',
    description:
      'You are not particularly motivated. When resting, it takes triple the amount of time to recover limit flags.',
  },
  {
    id: 'd2',
    name: 'Bad with Pets',
    description:
      "You just don't do well around wild animals. Near wild faction members, you cannot use limit flags or count as fresh/spent.",
  },
  {
    id: 'd3',
    name: 'Bite Vulnerability',
    description:
      'Your genes are extra compatible with the virus. The number of bite cards required for you to turn is always 3.',
    allowedSpecies: [...ORGANIC_SPECIES],
  },
  {
    id: 'd4',
    name: 'Brittle',
    description:
      'Maybe you should stay at home. The duration of all injuries or malfunctions you possess are doubled.',
  },
  {
    id: 'd5',
    name: 'Burnout',
    description:
      'Your candle burns bright, but from both ends. Your maximum XP cap is reduced by 250.',
  },
  {
    id: 'd6',
    name: 'Chem Resistant',
    description:
      'Your body is resistant to the effects of chems. All numerical chem benefits are halved, and scene-long effects only last until end of encounter.',
    allowedSpecies: [...ORGANIC_SPECIES],
  },
  {
    id: 'd7',
    name: 'Civil to a Fault',
    description:
      'Eating people is not OK. When you hear a "FEAST" count, you must pull a limit flag or health flag.',
  },
  {
    id: 'd8',
    name: 'Combat Paralysis',
    description:
      'You hesitate when a fight breaks out. When entering any encounter, you are hit with stun.',
  },
  {
    id: 'd9',
    name: 'Craven',
    description:
      'You are a coward. In combat encounters, you must attempt to leave as quickly as possible or pull a limit flag.',
  },
  {
    id: 'd10',
    name: 'Cruel',
    description:
      'You have a sadistic side that takes willpower to restrain. When encountering downed characters, you must burn a limit flag or attempt a killing blow.',
  },
  {
    id: 'd11',
    name: 'Cybernetic Rejection',
    description:
      'Your body rejects cybernetic enhancements. The drain value of any cyberware you have installed is tripled.',
    allowedSpecies: [...ORGANIC_SPECIES],
  },
  {
    id: 'd12',
    name: 'Delicate',
    description:
      "Your body doesn't respond to trauma very quickly. Your dying count starts at 5 instead of 30.",
  },
  {
    id: 'd13',
    name: 'Difficult Patient',
    description:
      'You are difficult to operate on. The difficulty of any surgery or maintenance on you is increased by 2.',
    allowedSpecies: [...ORGANIC_SPECIES],
  },
  {
    id: 'd14',
    name: 'Easy Mark',
    description:
      'Bandits just seem to know they can get something out of you. Near bandit faction members, you cannot use limit flags or count as fresh/spent.',
  },
  {
    id: 'd15',
    name: 'Failsafe',
    description:
      'You have core programming to prevent AI violence against humanity. You cannot attack human-like characters unless they attack first.',
    allowedSpecies: [...ROBOTIC_SPECIES],
  },
  {
    id: 'd16',
    name: 'Fear of the Dark',
    description:
      'The night is cold and full of terror. When the sun is not visible, your max limit is lowered by one.',
  },
  {
    id: 'd17',
    name: 'Fumble Fingers',
    description:
      'You have trouble with manual tasks. LOOTING, MEDIC, REPAIR, RECOVER and RELOAD counts are increased by 5.',
  },
  {
    id: 'd18',
    name: 'Insufficient Funds',
    description:
      'You have trouble preparing and saving. You start with no starter kit and lose 20 caps each event check-in.',
  },
  {
    id: 'd19',
    name: 'It Came From Beyond',
    description:
      'Off-world creatures are your worst nightmare. Near invader faction members, you cannot use limit flags or count as fresh/spent.',
    allowedSpecies: [...ORGANIC_SPECIES],
  },
  {
    id: 'd20',
    name: 'Light Sensitive',
    description:
      'You wear your sunglasses at night and during the day. When the sun is visible, your max limit is lowered by one.',
  },
  {
    id: 'd21',
    name: 'Lightweight',
    description:
      'You have very little chem tolerance. When using chems, you must make a RECOVER(30)(Res) count.',
    allowedSpecies: [...ORGANIC_SPECIES],
  },
  {
    id: 'd22',
    name: 'Lone Wolf',
    description:
      "You don't work well with others. You cannot benefit from inspire calls or be part of a party/partner/ward system.",
  },
  {
    id: 'd23',
    name: 'Loss Prevention.EXE',
    description:
      'You have lingering programs to stop property damage. You cannot cause damage to bot faction members.',
    allowedSpecies: [...ROBOTIC_SPECIES],
  },
  {
    id: 'd24',
    name: 'Paced',
    description: 'You move at your own pace. You cannot run.',
  },
  {
    id: 'd25',
    name: 'Pacifist',
    description:
      'You refuse to hurt people. Your attacks must include NO DAMAGE call.',
  },
  {
    id: 'd26',
    name: 'Poison Vulnerable',
    description:
      'You are particularly vulnerable to toxins. When hit with poison, you must burn a health flag.',
    allowedSpecies: [...ORGANIC_SPECIES],
  },
  {
    id: 'd27',
    name: 'Prideful',
    description:
      'You refuse to retreat from battle. To leave combat encounters, you must burn all limit flags.',
  },
  {
    id: 'd28',
    name: 'Rotten Luck',
    description:
      'Biters just seem to catch you at the worst times. You gain a bite card every event check-in.',
    allowedSpecies: [...ORGANIC_SPECIES],
  },
  {
    id: 'd29',
    name: 'Speechless',
    description:
      "You don't speak. You may only speak for counts, calls, damage reactions, or commanded responses.",
  },
  {
    id: 'd30',
    name: 'The Future is Scary',
    description:
      "You don't understand new technology. Near bot faction members, you cannot use limit flags or count as fresh/spent.",
  },
  {
    id: 'd31',
    name: 'Turned Averse',
    description:
      'You are terrified of the zombie virus. Near turned faction members, you cannot use limit flags or count as fresh/spent.',
  },
] as const;
