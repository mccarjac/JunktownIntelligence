import {
  GameCharacter,
  GameLocation,
  GameEvent,
  GameQuest,
} from '@models/types';

export type RootDrawerParamList = {
  CharacterList: undefined;
  DataManagement: undefined;
  Factions: undefined;
  Locations: undefined;
  Events: undefined;
  Quests: undefined;
  InfluenceReport: undefined;
  DiscordConfig: undefined;
  DiscordServers: undefined;
  DiscordCharacterMapping: undefined;
  DiscordMessages: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  CharacterSearch: undefined;
  CharacterStats: undefined;
  FactionStats: undefined;
  FactionDetails: { factionName: string };
  FactionForm: { factionName?: string };
  LocationDetails: { locationId: string };
  LocationForm: { location?: GameLocation };
  LocationMap: undefined;
  CharacterForm: {
    character?: GameCharacter;
    onSubmit?: (character: GameCharacter) => void;
  };
  CharacterDetail: { character: GameCharacter };
  EventsTimeline: undefined;
  EventsForm: { event?: GameEvent };
  EventsDetail: { eventId: string };
  QuestsList: undefined;
  QuestsForm: { quest?: GameQuest };
  QuestsDetail: { questId: string };
  QuestProposals: undefined;
  DiscordMessageContext: { messageId: string; characterId?: string };
  DiscordServerForm: { serverConfigId?: string };
};
