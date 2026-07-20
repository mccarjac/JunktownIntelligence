import {
  AVAILABLE_PERKS,
  AVAILABLE_DISTINCTIONS,
  type PerkTag,
  type StatModifiers,
} from './gameData';
import type { Species } from './speciesTypes';

export type PerkId = (typeof AVAILABLE_PERKS)[number]['id'];
export type DistinctionId = (typeof AVAILABLE_DISTINCTIONS)[number]['id'];

export interface GameLocation {
  id: string;
  name: string;
  description: string;
  imageUri?: string; // Deprecated: Use imageUris instead
  imageUris?: string[];
  mapCoordinates?: {
    x: number; // Normalized coordinate (0-1) representing position on map
    y: number; // Normalized coordinate (0-1) representing position on map
  };
  createdAt: string;
  updatedAt: string;
}

export interface LocationDataset {
  locations: GameLocation[];
  version: string;
  lastUpdated: string;
}

export enum RelationshipStanding {
  Ally = 'Ally',
  Friend = 'Friend',
  Neutral = 'Neutral',
  Hostile = 'Hostile',
  Enemy = 'Enemy',
}

export const POSITIVE_RELATIONSHIP_TYPE: RelationshipStanding[] = [
  RelationshipStanding.Ally,
  RelationshipStanding.Friend,
];

export const NEGATIVE_RELATIONSHIP_TYPE: RelationshipStanding[] = [
  RelationshipStanding.Hostile,
  RelationshipStanding.Enemy,
];

export interface Recipe {
  id: string;
  name: string;
  description: string;
  materials: string[];
}

export interface Distinction {
  id: string;
  name: string;
  description: string;
  allowedSpecies?: Species[];
}

export interface Faction {
  name: string;
  standing: RelationshipStanding;
  description?: string;
}

export interface Relationship {
  characterName: string;
  relationshipType: RelationshipStanding;
  description?: string;
  customName?: string;
}

export interface Cyberware {
  name: string;
  description: string;
  statModifiers?: StatModifiers;
}

export interface GameCharacter {
  id: string;
  name: string;
  species: Species;
  perkIds: PerkId[];
  distinctionIds: DistinctionId[];
  factions: Faction[];
  relationships: Relationship[];
  imageUri?: string; // Deprecated: Use imageUris instead
  imageUris?: string[];
  notes?: string;
  locationId?: string; // Reference to GameLocation.id
  occupation?: string;
  cyberware?: Cyberware[];
  present?: boolean;
  retired?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterDataset {
  characters: GameCharacter[];
  version: string;
  lastUpdated: string;
}

export type CharacterFormData = Omit<
  GameCharacter,
  'id' | 'createdAt' | 'updatedAt'
>;

export interface GameEvent {
  id: string;
  title: string;
  description?: string;
  date: string; // ISO date string
  time?: string; // Optional time in HH:MM format
  locationId?: string; // Reference to GameLocation.id
  characterIds?: string[]; // References to GameCharacter.id
  factionNames?: string[]; // Faction names involved in the event
  notes?: string;
  imageUri?: string; // Deprecated: Use imageUris instead
  imageUris?: string[];
  certaintyLevel?: CertaintyLevel; // Certainty level: unconfirmed, confirmed, or disputed
  createdAt: string;
  updatedAt: string;
}

export interface EventDataset {
  events: GameEvent[];
  version: string;
  lastUpdated: string;
}

export type CertaintyLevel = 'unconfirmed' | 'confirmed' | 'disputed';

// Quest / Mission Management
export enum QuestStatus {
  NotStarted = 'NOTSTARTED',
  Assigned = 'ASSIGNED',
  InProgress = 'INPROGRESS',
  Successful = 'SUCCESSFUL',
  Failure = 'FAILURE',
}

export interface QuestMaterial {
  id: string;
  name: string;
  quantityRequired: number;
  quantityProvided: number;
}

export interface QuestAttributePreferences {
  tags?: PerkTag[];
  species?: Species[];
  distinctionIds?: DistinctionId[];
  perkIds?: PerkId[];
}

export interface GameQuest {
  id: string;
  name: string;
  details?: string;
  date?: string; // ISO date string (YYYY-MM-DD), optional time of mission
  time?: string; // Optional time in HH:MM format
  status: QuestStatus;
  assignedCharacterIds?: string[]; // References to GameCharacter.id
  desirable?: QuestAttributePreferences;
  undesirable?: QuestAttributePreferences;
  locationId?: string; // Reference to GameLocation.id
  factionNames?: string[]; // Faction names related to the quest
  eventIds?: string[]; // References to GameEvent.id
  junktownOffice?: string; // Related Junktown office (free text)
  requiredMaterials?: QuestMaterial[];
  teamSize?: number; // Desired team size for proposal generation
  notes?: string;
  imageUri?: string; // Deprecated: Use imageUris instead
  imageUris?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface QuestDataset {
  quests: GameQuest[];
  version: string;
  lastUpdated: string;
}

export type QuestFormData = Omit<GameQuest, 'id' | 'createdAt' | 'updatedAt'>;

// Discord Integration Types
export interface DiscordServerConfig {
  id: string; // Unique ID for this server/channel config
  name: string; // User-friendly name for this server/channel
  botToken: string; // Discord bot token (can be same across configs)
  guildId?: string; // Discord server ID (optional)
  channelId: string; // Discord channel ID
  enabled: boolean; // Whether this specific config is enabled
  lastSync?: string; // ISO timestamp of last sync for this channel
  createdAt: string;
  updatedAt: string;
}

export interface DiscordConfig {
  botToken?: string; // Legacy: Primary bot token (deprecated, use serverConfigs)
  guildId?: string; // Legacy: Discord server ID (deprecated)
  channelId?: string; // Legacy: Discord channel ID (deprecated)
  enabled: boolean; // Global enable/disable for Discord integration
  lastSync?: string; // Legacy: ISO timestamp of last sync (deprecated)
  autoSync: boolean; // Auto-sync when internet is available
  serverConfigs: DiscordServerConfig[]; // Multiple server/channel configurations
}

export interface DiscordUserMapping {
  discordUserId: string; // Discord user ID
  discordUsername: string; // Discord username for display
  characterId: string; // GameCharacter.id
  createdAt: string;
  updatedAt: string;
}

export interface DiscordMessage {
  id: string; // Discord message ID
  channelId: string; // Discord channel ID
  guildId?: string; // Discord server/guild ID (for organization)
  serverConfigId?: string; // Reference to DiscordServerConfig.id
  authorId: string; // Discord user ID
  authorUsername: string; // Discord username
  content: string; // Message content
  timestamp: string; // ISO timestamp
  characterId?: string; // Mapped character ID (if available)
  extractedCharacterName?: string; // Character name extracted from >[Name] format
  imageUris?: string[]; // Downloaded image URIs
  attachments?: DiscordAttachment[]; // Original attachment metadata
  createdAt: string; // When stored locally
  ignored?: boolean; // Whether to ignore this message (not from any character)
}

export interface DiscordCharacterAlias {
  alias: string; // The nickname or shortened name
  characterId: string; // The actual character ID it maps to
  discordUserId: string; // The Discord user who uses this alias
  confidence: number; // How confident we are in this mapping (0-1)
  usageCount: number; // How many times this alias has been used
  createdAt: string;
  updatedAt: string;
}

export interface DiscordAttachment {
  id: string;
  filename: string;
  url: string;
  contentType?: string;
  size: number;
}

export interface DiscordDataset {
  config: DiscordConfig;
  serverConfigs?: DiscordServerConfig[]; // For export/import of multi-server configs
  userMappings: DiscordUserMapping[];
  messages: DiscordMessage[];
  characterAliases: DiscordCharacterAlias[];
  version: string;
  lastUpdated: string;
}
