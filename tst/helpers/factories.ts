import {
  GameCharacter,
  GameEvent,
  GameLocation,
  GameQuest,
  QuestStatus,
} from '@models/types';
import type { StoredFaction } from '@utils/characterStorage';

const TEST_TIMESTAMP = '2026-01-01T00:00:00.000Z';

export const makeCharacter = (
  overrides: Partial<GameCharacter> = {}
): GameCharacter => ({
  id: 'character-1',
  name: 'Test Character',
  species: 'Human',
  perkIds: [],
  distinctionIds: [],
  factions: [],
  relationships: [],
  createdAt: TEST_TIMESTAMP,
  updatedAt: TEST_TIMESTAMP,
  ...overrides,
});

export const makeStoredFaction = (
  overrides: Partial<StoredFaction> = {}
): StoredFaction => ({
  name: 'Test Faction',
  description: '',
  createdAt: TEST_TIMESTAMP,
  updatedAt: TEST_TIMESTAMP,
  ...overrides,
});

export const makeLocation = (
  overrides: Partial<GameLocation> = {}
): GameLocation => ({
  id: 'location-1',
  name: 'Test Location',
  description: '',
  createdAt: TEST_TIMESTAMP,
  updatedAt: TEST_TIMESTAMP,
  ...overrides,
});

export const makeEvent = (overrides: Partial<GameEvent> = {}): GameEvent => ({
  id: 'event-1',
  title: 'Test Event',
  date: '2026-01-01',
  createdAt: TEST_TIMESTAMP,
  updatedAt: TEST_TIMESTAMP,
  ...overrides,
});

export const makeQuest = (overrides: Partial<GameQuest> = {}): GameQuest => ({
  id: 'quest-1',
  name: 'Test Quest',
  status: QuestStatus.NotStarted,
  createdAt: TEST_TIMESTAMP,
  updatedAt: TEST_TIMESTAMP,
  ...overrides,
});
