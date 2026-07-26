import { RelationshipStanding } from '@/models/types';
import {
  makeCharacter,
  makeLocation,
  makeStoredFaction,
} from '../helpers/factories';
import {
  buildRelationshipGraph,
  characterNodeId,
  computeGraphLayout,
  factionNodeId,
  getNeighborhood,
  locationNodeId,
  standingDistanceFactor,
} from '@/utils/relationshipGraph';

describe('buildRelationshipGraph', () => {
  it('builds character-character edges from relationships, resolved by name', () => {
    const alice = makeCharacter({
      id: 'c-alice',
      name: 'Alice',
      relationships: [
        { characterName: 'Bob', relationshipType: RelationshipStanding.Ally },
      ],
    });
    const bob = makeCharacter({ id: 'c-bob', name: 'Bob' });

    const graph = buildRelationshipGraph({
      characters: [alice, bob],
      factions: [],
      locations: [],
    });

    expect(graph.edges).toEqual([
      expect.objectContaining({
        kind: 'character-character',
        sourceId: characterNodeId('c-alice'),
        targetId: characterNodeId('c-bob'),
        standing: RelationshipStanding.Ally,
      }),
    ]);
  });

  it('drops relationships that reference an unresolvable character name', () => {
    const alice = makeCharacter({
      id: 'c-alice',
      name: 'Alice',
      relationships: [
        {
          characterName: 'Ghost',
          relationshipType: RelationshipStanding.Enemy,
          customName: 'The Ghost',
        },
      ],
    });

    const graph = buildRelationshipGraph({
      characters: [alice],
      factions: [],
      locations: [],
    });

    expect(graph.edges).toHaveLength(0);
  });

  it('dedupes a mutual character-character relationship into one edge and records disagreement', () => {
    const alice = makeCharacter({
      id: 'c-alice',
      name: 'Alice',
      relationships: [
        { characterName: 'Bob', relationshipType: RelationshipStanding.Ally },
      ],
    });
    const bob = makeCharacter({
      id: 'c-bob',
      name: 'Bob',
      relationships: [
        {
          characterName: 'Alice',
          relationshipType: RelationshipStanding.Hostile,
        },
      ],
    });

    const graph = buildRelationshipGraph({
      characters: [alice, bob],
      factions: [],
      locations: [],
    });

    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]).toMatchObject({
      standing: RelationshipStanding.Ally,
      reciprocalStanding: RelationshipStanding.Hostile,
    });
  });

  it('builds character-faction edges for every affiliation entry, including antagonistic standings', () => {
    const alice = makeCharacter({
      id: 'c-alice',
      name: 'Alice',
      factions: [
        { name: 'Brotherhood', standing: RelationshipStanding.Ally },
        { name: 'Raiders', standing: RelationshipStanding.Enemy },
      ],
    });

    const graph = buildRelationshipGraph({
      characters: [alice],
      factions: [
        makeStoredFaction({ name: 'Brotherhood' }),
        makeStoredFaction({ name: 'Raiders' }),
      ],
      locations: [],
    });

    const factionEdges = graph.edges.filter(
      e => e.kind === 'character-faction'
    );
    expect(factionEdges).toHaveLength(2);
    expect(factionEdges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetId: factionNodeId('Brotherhood'),
          standing: RelationshipStanding.Ally,
        }),
        expect.objectContaining({
          targetId: factionNodeId('Raiders'),
          standing: RelationshipStanding.Enemy,
        }),
      ])
    );
  });

  it('creates faction nodes from character-embedded names even without a StoredFaction', () => {
    const alice = makeCharacter({
      id: 'c-alice',
      name: 'Alice',
      factions: [{ name: 'Scavengers', standing: RelationshipStanding.Ally }],
    });

    const graph = buildRelationshipGraph({
      characters: [alice],
      factions: [],
      locations: [],
    });

    expect(graph.nodes).toContainEqual(
      expect.objectContaining({
        id: factionNodeId('Scavengers'),
        type: 'faction',
      })
    );
  });

  it('builds a character-location edge from locationId', () => {
    const alice = makeCharacter({
      id: 'c-alice',
      name: 'Alice',
      locationId: 'loc-1',
    });
    const location = makeLocation({ id: 'loc-1', name: 'The Docks' });

    const graph = buildRelationshipGraph({
      characters: [alice],
      factions: [],
      locations: [location],
    });

    expect(graph.edges).toContainEqual(
      expect.objectContaining({
        kind: 'character-location',
        sourceId: characterNodeId('c-alice'),
        targetId: locationNodeId('loc-1'),
        standing: RelationshipStanding.Neutral,
      })
    );
  });

  it('drops a character-location edge when the location is filtered out', () => {
    const alice = makeCharacter({ id: 'c-alice', locationId: 'loc-1' });

    const graph = buildRelationshipGraph(
      {
        characters: [alice],
        factions: [],
        locations: [makeLocation({ id: 'loc-1' })],
      },
      { includeLocations: false }
    );

    expect(
      graph.edges.filter(e => e.kind === 'character-location')
    ).toHaveLength(0);
  });

  it('dedupes bidirectional faction-faction relationships and records disagreement', () => {
    const factionA = makeStoredFaction({
      name: 'Brotherhood',
      relationships: [
        {
          factionName: 'Raiders',
          relationshipType: RelationshipStanding.Enemy,
        },
      ],
    });
    const factionB = makeStoredFaction({
      name: 'Raiders',
      relationships: [
        {
          factionName: 'Brotherhood',
          relationshipType: RelationshipStanding.Hostile,
        },
      ],
    });

    const graph = buildRelationshipGraph({
      characters: [],
      factions: [factionA, factionB],
      locations: [],
    });

    const ffEdges = graph.edges.filter(e => e.kind === 'faction-faction');
    expect(ffEdges).toHaveLength(1);
    expect(ffEdges[0]).toMatchObject({
      standing: RelationshipStanding.Enemy,
      reciprocalStanding: RelationshipStanding.Hostile,
    });
  });

  it('excludes retired characters and factions by default, and includes them when requested', () => {
    const retiredChar = makeCharacter({
      id: 'c-retired',
      name: 'Old Timer',
      retired: true,
    });
    const activeChar = makeCharacter({ id: 'c-active', name: 'Active' });
    const retiredFaction = makeStoredFaction({
      name: 'Old Guard',
      retired: true,
    });

    const defaultGraph = buildRelationshipGraph({
      characters: [retiredChar, activeChar],
      factions: [retiredFaction],
      locations: [],
    });
    expect(defaultGraph.nodes.map(n => n.id)).not.toContain(
      characterNodeId('c-retired')
    );
    expect(defaultGraph.nodes.map(n => n.id)).not.toContain(
      factionNodeId('Old Guard')
    );

    const withRetired = buildRelationshipGraph(
      {
        characters: [retiredChar, activeChar],
        factions: [retiredFaction],
        locations: [],
      },
      { includeRetired: true }
    );
    expect(withRetired.nodes.map(n => n.id)).toContain(
      characterNodeId('c-retired')
    );
    expect(withRetired.nodes.map(n => n.id)).toContain(
      factionNodeId('Old Guard')
    );
  });

  it('hides isolated nodes only when hideIsolated is set', () => {
    const lonely = makeCharacter({ id: 'c-lonely', name: 'Lonely' });
    const alice = makeCharacter({
      id: 'c-alice',
      name: 'Alice',
      relationships: [
        { characterName: 'Bob', relationshipType: RelationshipStanding.Ally },
      ],
    });
    const bob = makeCharacter({ id: 'c-bob', name: 'Bob' });

    const withIsolated = buildRelationshipGraph({
      characters: [lonely, alice, bob],
      factions: [],
      locations: [],
    });
    expect(withIsolated.nodes).toHaveLength(3);

    const withoutIsolated = buildRelationshipGraph(
      { characters: [lonely, alice, bob], factions: [], locations: [] },
      { hideIsolated: true }
    );
    expect(withoutIsolated.nodes.map(n => n.id)).not.toContain(
      characterNodeId('c-lonely')
    );
    expect(withoutIsolated.nodes).toHaveLength(2);
  });

  it('computes node degree across all edge kinds', () => {
    const alice = makeCharacter({
      id: 'c-alice',
      name: 'Alice',
      relationships: [
        { characterName: 'Bob', relationshipType: RelationshipStanding.Ally },
      ],
      factions: [{ name: 'Brotherhood', standing: RelationshipStanding.Ally }],
      locationId: 'loc-1',
    });
    const bob = makeCharacter({ id: 'c-bob', name: 'Bob' });

    const graph = buildRelationshipGraph({
      characters: [alice, bob],
      factions: [makeStoredFaction({ name: 'Brotherhood' })],
      locations: [makeLocation({ id: 'loc-1' })],
    });

    const aliceNode = graph.nodes.find(
      n => n.id === characterNodeId('c-alice')
    );
    expect(aliceNode?.degree).toBe(3);
  });
});

describe('computeGraphLayout', () => {
  it('returns a position for every node, clamped within the given size', () => {
    const alice = makeCharacter({
      id: 'c-alice',
      name: 'Alice',
      relationships: [
        { characterName: 'Bob', relationshipType: RelationshipStanding.Ally },
      ],
    });
    const bob = makeCharacter({ id: 'c-bob', name: 'Bob' });
    const graph = buildRelationshipGraph({
      characters: [alice, bob],
      factions: [],
      locations: [],
    });

    const positions = computeGraphLayout(graph, { width: 400, height: 300 });

    expect(positions).toHaveLength(2);
    positions.forEach(p => {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(400);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(300);
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    });
  });

  it('is deterministic: identical input produces identical positions', () => {
    const characters = [
      makeCharacter({
        id: 'c-1',
        name: 'One',
        relationships: [
          {
            characterName: 'Two',
            relationshipType: RelationshipStanding.Friend,
          },
        ],
      }),
      makeCharacter({ id: 'c-2', name: 'Two' }),
      makeCharacter({ id: 'c-3', name: 'Three' }),
    ];
    const graph = buildRelationshipGraph({
      characters,
      factions: [],
      locations: [],
    });

    const first = computeGraphLayout(graph, { width: 500, height: 500 });
    const second = computeGraphLayout(graph, { width: 500, height: 500 });

    expect(first).toEqual(second);
  });

  it('places a single node at the center', () => {
    const graph = buildRelationshipGraph({
      characters: [makeCharacter({ id: 'c-1', name: 'Solo' })],
      factions: [],
      locations: [],
    });

    const positions = computeGraphLayout(graph, { width: 200, height: 100 });

    expect(positions).toEqual([expect.objectContaining({ x: 100, y: 50 })]);
  });

  it('returns an empty array for an empty graph', () => {
    expect(
      computeGraphLayout({ nodes: [], edges: [] }, { width: 100, height: 100 })
    ).toEqual([]);
  });

  it('does not throw on edges whose endpoints are missing from the node set', () => {
    const graph = buildRelationshipGraph({
      characters: [makeCharacter({ id: 'c-1', name: 'One' })],
      factions: [],
      locations: [],
    });
    const withDanglingEdge = {
      nodes: [
        ...graph.nodes,
        {
          id: characterNodeId('c-2'),
          type: 'character' as const,
          label: 'Two',
          refId: 'c-2',
          degree: 0,
        },
      ],
      edges: [
        {
          id: 'dangling',
          sourceId: characterNodeId('c-1'),
          targetId: characterNodeId('c-ghost'),
          kind: 'character-character' as const,
          standing: RelationshipStanding.Ally,
        },
      ],
    };

    expect(() =>
      computeGraphLayout(withDanglingEdge, { width: 400, height: 400 })
    ).not.toThrow();
  });

  it('places positively-related pairs closer than negatively-related ones', () => {
    const hub = makeCharacter({
      id: 'c-hub',
      name: 'Hub',
      relationships: [
        { characterName: 'Buddy', relationshipType: RelationshipStanding.Ally },
        {
          characterName: 'Rival',
          relationshipType: RelationshipStanding.Enemy,
        },
      ],
    });
    const buddy = makeCharacter({ id: 'c-buddy', name: 'Buddy' });
    const rival = makeCharacter({ id: 'c-rival', name: 'Rival' });
    const graph = buildRelationshipGraph({
      characters: [hub, buddy, rival],
      factions: [],
      locations: [],
    });

    const positions = computeGraphLayout(graph, { width: 1200, height: 1200 });
    const positionOf = (id: string) => {
      const position = positions.find(p => p.id === id);
      if (!position) {
        throw new Error(`missing position for ${id}`);
      }
      return position;
    };
    const hubPos = positionOf(characterNodeId('c-hub'));
    const buddyPos = positionOf(characterNodeId('c-buddy'));
    const rivalPos = positionOf(characterNodeId('c-rival'));

    expect(
      Math.hypot(buddyPos.x - hubPos.x, buddyPos.y - hubPos.y)
    ).toBeLessThan(Math.hypot(rivalPos.x - hubPos.x, rivalPos.y - hubPos.y));
  });

  it('spreads nodes further apart with a larger spacing option', () => {
    const characters = [
      makeCharacter({
        id: 'c-1',
        name: 'One',
        relationships: [
          {
            characterName: 'Two',
            relationshipType: RelationshipStanding.Neutral,
          },
          {
            characterName: 'Three',
            relationshipType: RelationshipStanding.Neutral,
          },
        ],
      }),
      makeCharacter({ id: 'c-2', name: 'Two' }),
      makeCharacter({ id: 'c-3', name: 'Three' }),
    ];
    const graph = buildRelationshipGraph({
      characters,
      factions: [],
      locations: [],
    });
    const size = { width: 2000, height: 2000 };

    const meanPairwiseDistance = (spacing: number): number => {
      const positions = computeGraphLayout(graph, size, { spacing });
      let total = 0;
      let pairs = 0;
      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          total += Math.hypot(
            positions[i].x - positions[j].x,
            positions[i].y - positions[j].y
          );
          pairs++;
        }
      }
      return total / pairs;
    };

    expect(meanPairwiseDistance(2)).toBeGreaterThan(meanPairwiseDistance(1));
  });
});

describe('standingDistanceFactor', () => {
  it('orders factors Ally < Friend < Neutral < Hostile < Enemy', () => {
    const factors = [
      RelationshipStanding.Ally,
      RelationshipStanding.Friend,
      RelationshipStanding.Neutral,
      RelationshipStanding.Hostile,
      RelationshipStanding.Enemy,
    ].map(standing => standingDistanceFactor({ standing }, 1));

    const sorted = [...factors].sort((a, b) => a - b);
    expect(factors).toEqual(sorted);
    expect(new Set(factors).size).toBe(factors.length);
  });

  it('returns 1 for every standing when standingSpread is 0', () => {
    Object.values(RelationshipStanding).forEach(standing => {
      expect(standingDistanceFactor({ standing }, 0)).toBe(1);
    });
  });

  it('lets the worse standing win when the reciprocal side disagrees', () => {
    expect(
      standingDistanceFactor(
        {
          standing: RelationshipStanding.Ally,
          reciprocalStanding: RelationshipStanding.Enemy,
        },
        1
      )
    ).toBe(standingDistanceFactor({ standing: RelationshipStanding.Enemy }, 1));
  });

  it('never drops below the 0.4 floor, even at maximum spread', () => {
    expect(
      standingDistanceFactor({ standing: RelationshipStanding.Ally }, 2)
    ).toBeGreaterThanOrEqual(0.4);
  });
});

describe('getNeighborhood', () => {
  const buildChainGraph = () => {
    // Alice -> Bob -> Carol -> Dave, plus an isolated Eve.
    const alice = makeCharacter({
      id: 'c-alice',
      name: 'Alice',
      relationships: [
        { characterName: 'Bob', relationshipType: RelationshipStanding.Ally },
      ],
    });
    const bob = makeCharacter({
      id: 'c-bob',
      name: 'Bob',
      relationships: [
        {
          characterName: 'Carol',
          relationshipType: RelationshipStanding.Friend,
        },
      ],
    });
    const carol = makeCharacter({
      id: 'c-carol',
      name: 'Carol',
      relationships: [
        {
          characterName: 'Dave',
          relationshipType: RelationshipStanding.Neutral,
        },
      ],
    });
    const dave = makeCharacter({ id: 'c-dave', name: 'Dave' });
    const eve = makeCharacter({ id: 'c-eve', name: 'Eve' });

    return buildRelationshipGraph({
      characters: [alice, bob, carol, dave, eve],
      factions: [],
      locations: [],
    });
  };

  it('returns depth-1 neighbors only', () => {
    const graph = buildChainGraph();
    const neighborhood = getNeighborhood(graph, characterNodeId('c-bob'), 1);

    expect(neighborhood.nodes.map(n => n.id).sort()).toEqual(
      [
        characterNodeId('c-alice'),
        characterNodeId('c-bob'),
        characterNodeId('c-carol'),
      ].sort()
    );
  });

  it('expands to depth-2 neighbors', () => {
    const graph = buildChainGraph();
    const neighborhood = getNeighborhood(graph, characterNodeId('c-bob'), 2);

    expect(neighborhood.nodes.map(n => n.id).sort()).toEqual(
      [
        characterNodeId('c-alice'),
        characterNodeId('c-bob'),
        characterNodeId('c-carol'),
        characterNodeId('c-dave'),
      ].sort()
    );
  });

  it('returns an empty graph for an unknown node id', () => {
    const graph = buildChainGraph();
    expect(getNeighborhood(graph, 'character:does-not-exist', 2)).toEqual({
      nodes: [],
      edges: [],
    });
  });

  it('returns just the node itself when it has no edges', () => {
    const graph = buildChainGraph();
    const neighborhood = getNeighborhood(graph, characterNodeId('c-eve'), 3);

    expect(neighborhood.nodes.map(n => n.id)).toEqual([
      characterNodeId('c-eve'),
    ]);
    expect(neighborhood.edges).toEqual([]);
  });
});
