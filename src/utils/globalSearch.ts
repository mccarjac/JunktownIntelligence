/**
 * Pure cross-domain search over the five entity types (characters, factions,
 * locations, events, quests). Takes already-loaded arrays so it stays free of
 * storage/side effects; callers load data via the `characterStorage` loaders.
 *
 * Matching mirrors the per-screen list filters: case-insensitive substring on
 * the trimmed query. Within each domain, matches on the primary field
 * (name/title) rank before matches on secondary fields (descriptions, notes,
 * etc.), alphabetically within each tier, capped per domain.
 */

import {
  GameCharacter,
  GameEvent,
  GameLocation,
  GameQuest,
} from '@models/types';
import type { StoredFaction } from './characterStorage';

export type SearchDomain =
  | 'character'
  | 'faction'
  | 'location'
  | 'event'
  | 'quest';

interface BaseSearchResult {
  /** Stable list key, e.g. `character:<id>`, `faction:<name>`. */
  key: string;
  /** Primary display text (name/title). */
  title: string;
  /** Context line: the matched secondary field, or default context. */
  subtitle?: string;
  /** True when the query matched the primary field (used for ranking). */
  primaryMatch: boolean;
}

export interface CharacterSearchResult extends BaseSearchResult {
  domain: 'character';
  /** Full object — the CharacterDetail route takes the whole character. */
  character: GameCharacter;
}

export interface FactionSearchResult extends BaseSearchResult {
  domain: 'faction';
  /** Factions have no id; the FactionDetails route keys on name. */
  factionName: string;
}

export interface LocationSearchResult extends BaseSearchResult {
  domain: 'location';
  locationId: string;
}

export interface EventSearchResult extends BaseSearchResult {
  domain: 'event';
  eventId: string;
}

export interface QuestSearchResult extends BaseSearchResult {
  domain: 'quest';
  questId: string;
}

export type GlobalSearchResult =
  | CharacterSearchResult
  | FactionSearchResult
  | LocationSearchResult
  | EventSearchResult
  | QuestSearchResult;

export interface GlobalSearchData {
  characters: GameCharacter[];
  factions: StoredFaction[];
  locations: GameLocation[];
  events: GameEvent[];
  quests: GameQuest[];
}

export const MIN_QUERY_LENGTH = 2;
export const MAX_RESULTS_PER_DOMAIN = 20;

export const SEARCH_DOMAIN_ORDER: SearchDomain[] = [
  'character',
  'faction',
  'location',
  'event',
  'quest',
];

interface FieldMatch {
  primaryMatch: boolean;
  subtitle?: string;
}

const includesQuery = (value: string | undefined, query: string): boolean =>
  value !== undefined && value.toLowerCase().includes(query);

/**
 * Matches an entity against the query. A primary-field hit keeps the given
 * default context as the subtitle; otherwise the first matching secondary
 * field becomes the subtitle so the user can see why the result matched.
 */
const matchFields = (
  primary: string,
  defaultSubtitle: string | undefined,
  secondary: (string | undefined)[],
  query: string
): FieldMatch | undefined => {
  if (includesQuery(primary, query)) {
    return { primaryMatch: true, subtitle: defaultSubtitle };
  }
  const matched = secondary.find(field => includesQuery(field, query));
  if (matched !== undefined) {
    return { primaryMatch: false, subtitle: matched };
  }
  return undefined;
};

const rankAndCap = <T extends GlobalSearchResult>(results: T[]): T[] =>
  results
    .sort((a, b) => {
      if (a.primaryMatch !== b.primaryMatch) {
        return a.primaryMatch ? -1 : 1;
      }
      return a.title.localeCompare(b.title);
    })
    .slice(0, MAX_RESULTS_PER_DOMAIN);

const searchCharacters = (
  characters: GameCharacter[],
  query: string
): CharacterSearchResult[] => {
  const results: CharacterSearchResult[] = [];
  for (const character of characters) {
    const match = matchFields(
      character.name,
      character.occupation ?? character.species,
      [
        character.occupation,
        character.species,
        character.notes,
        ...(character.factions ?? []).map(faction => faction.name),
      ],
      query
    );
    if (match) {
      results.push({
        domain: 'character',
        key: `character:${character.id}`,
        title: character.name,
        character,
        ...match,
      });
    }
  }
  return rankAndCap(results);
};

const searchFactions = (
  factions: StoredFaction[],
  query: string
): FactionSearchResult[] => {
  const results: FactionSearchResult[] = [];
  for (const faction of factions) {
    const match = matchFields(
      faction.name,
      faction.description || undefined,
      [faction.description],
      query
    );
    if (match) {
      results.push({
        domain: 'faction',
        key: `faction:${faction.name}`,
        title: faction.name,
        factionName: faction.name,
        ...match,
      });
    }
  }
  return rankAndCap(results);
};

const searchLocations = (
  locations: GameLocation[],
  query: string
): LocationSearchResult[] => {
  const results: LocationSearchResult[] = [];
  for (const location of locations) {
    const match = matchFields(
      location.name,
      location.description || undefined,
      [location.description],
      query
    );
    if (match) {
      results.push({
        domain: 'location',
        key: `location:${location.id}`,
        title: location.name,
        locationId: location.id,
        ...match,
      });
    }
  }
  return rankAndCap(results);
};

const searchEvents = (
  events: GameEvent[],
  query: string
): EventSearchResult[] => {
  const results: EventSearchResult[] = [];
  for (const event of events) {
    const match = matchFields(
      event.title,
      event.description ?? event.date,
      [event.description, event.notes],
      query
    );
    if (match) {
      results.push({
        domain: 'event',
        key: `event:${event.id}`,
        title: event.title,
        eventId: event.id,
        ...match,
      });
    }
  }
  return rankAndCap(results);
};

const searchQuests = (
  quests: GameQuest[],
  query: string
): QuestSearchResult[] => {
  const results: QuestSearchResult[] = [];
  for (const quest of quests) {
    const match = matchFields(
      quest.name,
      quest.details,
      [
        quest.details,
        quest.notes,
        quest.junktownOffice,
        ...(quest.factionNames ?? []),
      ],
      query
    );
    if (match) {
      results.push({
        domain: 'quest',
        key: `quest:${quest.id}`,
        title: quest.name,
        questId: quest.id,
        ...match,
      });
    }
  }
  return rankAndCap(results);
};

/**
 * Searches all five domains. Returns results grouped in
 * `SEARCH_DOMAIN_ORDER`, each group ranked (primary-field matches first,
 * alphabetical within each tier) and capped at `MAX_RESULTS_PER_DOMAIN`.
 * Queries shorter than `MIN_QUERY_LENGTH` after trimming return no results.
 */
export const searchAllDomains = (
  data: GlobalSearchData,
  query: string
): GlobalSearchResult[] => {
  const normalized = query.trim().toLowerCase();
  if (normalized.length < MIN_QUERY_LENGTH) {
    return [];
  }
  return [
    ...searchCharacters(data.characters, normalized),
    ...searchFactions(data.factions, normalized),
    ...searchLocations(data.locations, normalized),
    ...searchEvents(data.events, normalized),
    ...searchQuests(data.quests, normalized),
  ];
};
