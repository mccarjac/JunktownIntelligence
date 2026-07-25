import {
  buildQuestTimeline,
  buildQuestParticipants,
} from '@utils/questNarrative';
import {
  GameEvent,
  GameQuest,
  GameCharacter,
  QuestStatus,
} from '@models/types';

const TS = '2026-01-01T00:00:00.000Z';

const makeEvent = (overrides: Partial<GameEvent> = {}): GameEvent => ({
  id: 'event-1',
  title: 'Test Event',
  date: '2026-01-01',
  createdAt: TS,
  updatedAt: TS,
  ...overrides,
});

const makeQuest = (overrides: Partial<GameQuest> = {}): GameQuest => ({
  id: 'quest-1',
  name: 'Test Quest',
  status: QuestStatus.NotStarted,
  createdAt: TS,
  updatedAt: TS,
  ...overrides,
});

const makeCharacter = (
  overrides: Partial<GameCharacter> = {}
): GameCharacter => ({
  id: 'character-1',
  name: 'Test Character',
  species: 'Human',
  perkIds: [],
  distinctionIds: [],
  factions: [],
  relationships: [],
  createdAt: TS,
  updatedAt: TS,
  ...overrides,
});

describe('buildQuestTimeline', () => {
  it('sorts linked events ascending by date', () => {
    const later = makeEvent({ id: 'e-later', date: '2026-03-01' });
    const earlier = makeEvent({ id: 'e-earlier', date: '2026-01-01' });
    const quest = makeQuest({ eventIds: [later.id, earlier.id] });

    const timeline = buildQuestTimeline(quest, [later, earlier]);

    expect(timeline.map(e => e.id)).toEqual([earlier.id, later.id]);
  });

  it('breaks ties on the same date using time', () => {
    const late = makeEvent({ id: 'e-late', date: '2026-01-01', time: '18:00' });
    const early = makeEvent({
      id: 'e-early',
      date: '2026-01-01',
      time: '08:00',
    });
    const quest = makeQuest({ eventIds: [late.id, early.id] });

    const timeline = buildQuestTimeline(quest, [late, early]);

    expect(timeline.map(e => e.id)).toEqual([early.id, late.id]);
  });

  it('sorts events with a missing or malformed date last', () => {
    const dated = makeEvent({ id: 'e-dated', date: '2026-01-01' });
    const undated = makeEvent({ id: 'e-undated', date: '' });
    const malformed = makeEvent({ id: 'e-malformed', date: 'not-a-date' });
    const quest = makeQuest({
      eventIds: [undated.id, dated.id, malformed.id],
    });

    const timeline = buildQuestTimeline(quest, [undated, dated, malformed]);

    expect(timeline[0].id).toBe(dated.id);
    expect(
      timeline
        .slice(1)
        .map(e => e.id)
        .sort()
    ).toEqual([undated.id, malformed.id].sort());
  });

  it('drops dangling event ids that no longer resolve', () => {
    const quest = makeQuest({ eventIds: ['missing-event'] });

    expect(buildQuestTimeline(quest, [])).toEqual([]);
  });

  it('returns an empty timeline when the quest has no linked events', () => {
    const quest = makeQuest();

    expect(buildQuestTimeline(quest, [makeEvent()])).toEqual([]);
  });
});

describe('buildQuestParticipants', () => {
  it('unions assigned characters with characters appearing in linked events', () => {
    const assignedOnly = makeCharacter({ id: 'c-assigned', name: 'Assigned' });
    const eventOnly = makeCharacter({ id: 'c-event', name: 'EventOnly' });
    const both = makeCharacter({ id: 'c-both', name: 'Both' });

    const event = makeEvent({
      id: 'event-1',
      characterIds: [eventOnly.id, both.id],
    });
    const quest = makeQuest({
      assignedCharacterIds: [assignedOnly.id, both.id],
      eventIds: [event.id],
    });

    const participants = buildQuestParticipants(
      quest,
      [event],
      [assignedOnly, eventOnly, both]
    );

    const byId = new Map(participants.map(p => [p.characterId, p]));

    expect(byId.get(assignedOnly.id)).toMatchObject({
      assigned: true,
      eventCount: 0,
    });
    expect(byId.get(eventOnly.id)).toMatchObject({
      assigned: false,
      eventCount: 1,
    });
    expect(byId.get(both.id)).toMatchObject({
      assigned: true,
      eventCount: 1,
    });
  });

  it('counts a character once per linked event it appears in', () => {
    const character = makeCharacter({ id: 'c-1', name: 'Recurring' });
    const eventA = makeEvent({ id: 'event-a', characterIds: [character.id] });
    const eventB = makeEvent({ id: 'event-b', characterIds: [character.id] });
    const quest = makeQuest({ eventIds: [eventA.id, eventB.id] });

    const participants = buildQuestParticipants(
      quest,
      [eventA, eventB],
      [character]
    );

    expect(participants).toEqual([
      {
        characterId: character.id,
        name: character.name,
        assigned: false,
        eventCount: 2,
      },
    ]);
  });

  it('labels an unresolved character id as Unknown', () => {
    const quest = makeQuest({ assignedCharacterIds: ['missing-character'] });

    const participants = buildQuestParticipants(quest, [], []);

    expect(participants).toEqual([
      {
        characterId: 'missing-character',
        name: 'Unknown',
        assigned: true,
        eventCount: 0,
      },
    ]);
  });

  it('sorts participants by name', () => {
    const zed = makeCharacter({ id: 'c-z', name: 'Zed' });
    const anna = makeCharacter({ id: 'c-a', name: 'Anna' });
    const quest = makeQuest({ assignedCharacterIds: [zed.id, anna.id] });

    const participants = buildQuestParticipants(quest, [], [zed, anna]);

    expect(participants.map(p => p.name)).toEqual(['Anna', 'Zed']);
  });

  it('returns an empty roster for a quest with no team and no events', () => {
    const quest = makeQuest();

    expect(buildQuestParticipants(quest, [], [])).toEqual([]);
  });
});
