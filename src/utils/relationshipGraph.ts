import {
  GameCharacter,
  GameLocation,
  RelationshipStanding,
} from '@models/types';
import type { StoredFaction } from '@utils/characterStorage';
import { Point, Size } from '@utils/mapCoordinates';

/**
 * Pure, dependency-free graph model + layout for the relationship graph
 * screen. Nodes are namespaced (`character:<id>`, `faction:<name>`,
 * `location:<id>`) because characters and locations are id-keyed while
 * factions are name-keyed (there is no `GameFaction`/`id` for factions —
 * see `StoredFaction` in `characterStorage.ts`).
 *
 * Only edges backed by a real stored field are produced: character↔character
 * (`GameCharacter.relationships`), character↔faction (`GameCharacter.factions`),
 * character↔location (`GameCharacter.locationId`), and faction↔faction
 * (`StoredFaction.relationships`). There is no `controlledLocations` field
 * anywhere in the data model, so faction↔location edges are never derived.
 */

export type GraphNodeType = 'character' | 'faction' | 'location';

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  /** GameCharacter.id | faction name | GameLocation.id */
  refId: string;
  /** Number of edges touching this node in the graph it was built from. */
  degree: number;
}

export type GraphEdgeKind =
  | 'character-character'
  | 'character-faction'
  | 'character-location'
  | 'faction-faction';

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  kind: GraphEdgeKind;
  /**
   * Drives edge color. For character-location edges (which carry no
   * standing in the data model) this is always `Neutral`.
   */
  standing: RelationshipStanding;
  /**
   * Set when the reciprocal side of a character-character or
   * faction-faction relationship exists and disagrees with `standing`
   * (e.g. A calls B an Ally but B calls A Hostile).
   */
  reciprocalStanding?: RelationshipStanding;
}

export interface RelationshipGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface BuildGraphInput {
  characters: GameCharacter[];
  factions: StoredFaction[];
  locations: GameLocation[];
}

export interface BuildGraphOptions {
  includeCharacters?: boolean;
  includeFactions?: boolean;
  includeLocations?: boolean;
  /** Include retired characters/factions. Default false. */
  includeRetired?: boolean;
  /** Drop nodes with no edges. Default false. */
  hideIsolated?: boolean;
}

export const characterNodeId = (id: string): string => `character:${id}`;
export const factionNodeId = (name: string): string => `faction:${name}`;
export const locationNodeId = (id: string): string => `location:${id}`;

const undirectedKey = (a: string, b: string): string =>
  a < b ? `${a}|${b}` : `${b}|${a}`;

/**
 * Builds the relationship graph from raw storage data. Faction nodes are the
 * union of `StoredFaction` entries and faction names embedded on characters
 * (mirrors `FactionListScreen`'s pattern) — `migrateFactionDescriptions()`
 * only backfills `StoredFaction`s that had a non-empty embedded description,
 * so `loadFactions()` alone can miss faction names. Character-character
 * edges resolve `Relationship.characterName` against the character list by
 * name (there is no id on that field) and silently drop targets that don't
 * resolve to an included character.
 */
export function buildRelationshipGraph(
  input: BuildGraphInput,
  options: BuildGraphOptions = {}
): RelationshipGraph {
  const {
    includeCharacters = true,
    includeFactions = true,
    includeLocations = true,
    includeRetired = false,
    hideIsolated = false,
  } = options;

  const characters = includeCharacters
    ? input.characters.filter(c => includeRetired || !c.retired)
    : [];
  const characterByName = new Map(characters.map(c => [c.name, c]));

  const factionEntityByName = new Map(input.factions.map(f => [f.name, f]));

  // Discover every faction name that exists anywhere in the data, regardless
  // of which characters are currently included, so a faction isn't hidden
  // just because its only members are filtered out (e.g. retired).
  const factionNameSet = new Set<string>();
  input.factions.forEach(f => factionNameSet.add(f.name));
  input.characters.forEach(c =>
    c.factions?.forEach(f => factionNameSet.add(f.name))
  );

  const factions = includeFactions
    ? Array.from(factionNameSet).filter(name => {
        const entity = factionEntityByName.get(name);
        return includeRetired || !entity?.retired;
      })
    : [];
  const factionIds = new Set(factions.map(factionNodeId));

  const locations = includeLocations ? input.locations : [];
  const locationIds = new Set(locations.map(l => locationNodeId(l.id)));

  const edges: GraphEdge[] = [];

  // character-character (directed relationships, deduped to one undirected
  // edge per pair, with the reciprocal standing recorded when it disagrees).
  const characterEdgeSeen = new Map<string, GraphEdge>();
  characters.forEach(source => {
    source.relationships?.forEach(rel => {
      const target = characterByName.get(rel.characterName);
      if (!target || target.id === source.id) {
        return;
      }
      const sourceId = characterNodeId(source.id);
      const targetId = characterNodeId(target.id);
      const key = undirectedKey(sourceId, targetId);
      const existing = characterEdgeSeen.get(key);
      if (existing) {
        if (existing.standing !== rel.relationshipType) {
          existing.reciprocalStanding = rel.relationshipType;
        }
        return;
      }
      const edge: GraphEdge = {
        id: `cc:${key}`,
        sourceId,
        targetId,
        kind: 'character-character',
        standing: rel.relationshipType,
      };
      characterEdgeSeen.set(key, edge);
      edges.push(edge);
    });
  });

  // character-faction (affiliation; every entry becomes an edge colored by
  // its standing — an Enemy standing is an antagonism edge, not membership).
  characters.forEach(character => {
    character.factions?.forEach(faction => {
      const targetId = factionNodeId(faction.name);
      if (!factionIds.has(targetId)) {
        return;
      }
      const sourceId = characterNodeId(character.id);
      edges.push({
        id: `cf:${sourceId}|${targetId}`,
        sourceId,
        targetId,
        kind: 'character-faction',
        standing: faction.standing,
      });
    });
  });

  // character-location (singular, optional; no standing in the model).
  characters.forEach(character => {
    if (!character.locationId) {
      return;
    }
    const targetId = locationNodeId(character.locationId);
    if (!locationIds.has(targetId)) {
      return;
    }
    const sourceId = characterNodeId(character.id);
    edges.push({
      id: `cl:${sourceId}|${targetId}`,
      sourceId,
      targetId,
      kind: 'character-location',
      standing: RelationshipStanding.Neutral,
    });
  });

  // faction-faction (mostly bidirectional per `createFaction`, deduped the
  // same way as character-character).
  const factionEdgeSeen = new Map<string, GraphEdge>();
  factions.forEach(factionName => {
    const entity = factionEntityByName.get(factionName);
    entity?.relationships?.forEach(rel => {
      const targetId = factionNodeId(rel.factionName);
      if (!factionIds.has(targetId)) {
        return;
      }
      const sourceId = factionNodeId(factionName);
      if (sourceId === targetId) {
        return;
      }
      const key = undirectedKey(sourceId, targetId);
      const existing = factionEdgeSeen.get(key);
      if (existing) {
        if (existing.standing !== rel.relationshipType) {
          existing.reciprocalStanding = rel.relationshipType;
        }
        return;
      }
      const edge: GraphEdge = {
        id: `ff:${key}`,
        sourceId,
        targetId,
        kind: 'faction-faction',
        standing: rel.relationshipType,
      };
      factionEdgeSeen.set(key, edge);
      edges.push(edge);
    });
  });

  const degree = new Map<string, number>();
  edges.forEach(edge => {
    degree.set(edge.sourceId, (degree.get(edge.sourceId) ?? 0) + 1);
    degree.set(edge.targetId, (degree.get(edge.targetId) ?? 0) + 1);
  });

  let nodes: GraphNode[] = [
    ...characters.map(c => ({
      id: characterNodeId(c.id),
      type: 'character' as const,
      label: c.name,
      refId: c.id,
      degree: degree.get(characterNodeId(c.id)) ?? 0,
    })),
    ...factions.map(name => ({
      id: factionNodeId(name),
      type: 'faction' as const,
      label: name,
      refId: name,
      degree: degree.get(factionNodeId(name)) ?? 0,
    })),
    ...locations.map(l => ({
      id: locationNodeId(l.id),
      type: 'location' as const,
      label: l.name,
      refId: l.id,
      degree: degree.get(locationNodeId(l.id)) ?? 0,
    })),
  ];

  if (hideIsolated) {
    nodes = nodes.filter(node => node.degree > 0);
  }

  return { nodes, edges };
}

export interface PositionedNode extends GraphNode {
  x: number;
  y: number;
}

export interface LayoutOptions {
  /** Force-simulation iteration count. Default 150. */
  iterations?: number;
  padding?: number;
}

const TYPE_ORDER: GraphNodeType[] = ['character', 'faction', 'location'];

/**
 * Deterministic force-directed layout: nodes seed on a circle in a stable
 * (type, id) order, then repulsion/attraction/centering forces run for a
 * fixed iteration count — no randomness, so identical input always produces
 * identical positions (needed both for testability and so the graph doesn't
 * visually reshuffle on every re-render). O(nodes^2 * iterations); fine for
 * the dozens-to-low-hundreds of nodes this app's campaigns produce.
 */
export function computeGraphLayout(
  graph: RelationshipGraph,
  size: Size,
  options: LayoutOptions = {}
): PositionedNode[] {
  const { iterations = 150, padding = 24 } = options;
  const { nodes, edges } = graph;
  const count = nodes.length;
  if (count === 0) {
    return [];
  }

  const width = Math.max(size.width, padding * 2 + 1);
  const height = Math.max(size.height, padding * 2 + 1);
  const centerX = width / 2;
  const centerY = height / 2;
  const startRadius = Math.max(1, Math.min(width, height) / 2 - padding);

  const ordered = [...nodes].sort((a, b) => {
    const typeDiff = TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type);
    return typeDiff !== 0 ? typeDiff : a.id.localeCompare(b.id);
  });

  const positions = new Map<string, Point>();
  ordered.forEach((node, index) => {
    const angle = (2 * Math.PI * index) / count;
    positions.set(node.id, {
      x: centerX + startRadius * Math.cos(angle),
      y: centerY + startRadius * Math.sin(angle),
    });
  });

  if (count === 1) {
    const only = ordered[0];
    return [{ ...only, x: centerX, y: centerY }];
  }

  const REPULSION = (width * height) / count / 4;
  const ATTRACTION = 0.02;
  const CENTERING = 0.01;

  for (let iter = 0; iter < iterations; iter++) {
    const forces = new Map<string, Point>();
    ordered.forEach(node => forces.set(node.id, { x: 0, y: 0 }));

    for (let i = 0; i < ordered.length; i++) {
      for (let j = i + 1; j < ordered.length; j++) {
        const nodeA = ordered[i];
        const nodeB = ordered[j];
        const posA = positions.get(nodeA.id) as Point;
        const posB = positions.get(nodeB.id) as Point;
        let dx = posA.x - posB.x;
        let dy = posA.y - posB.y;
        let distSq = dx * dx + dy * dy;
        if (distSq < 0.01) {
          // Deterministic jitter for coincident points, seeded by index.
          dx = Math.cos(i - j);
          dy = Math.sin(i - j);
          distSq = 0.01;
        }
        const dist = Math.sqrt(distSq);
        const force = REPULSION / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        const forceA = forces.get(nodeA.id) as Point;
        const forceB = forces.get(nodeB.id) as Point;
        forceA.x += fx;
        forceA.y += fy;
        forceB.x -= fx;
        forceB.y -= fy;
      }
    }

    edges.forEach(edge => {
      const posA = positions.get(edge.sourceId);
      const posB = positions.get(edge.targetId);
      const forceA = forces.get(edge.sourceId);
      const forceB = forces.get(edge.targetId);
      if (!posA || !posB || !forceA || !forceB) {
        // Guards subgraphs (e.g. from getNeighborhood) that may omit an
        // endpoint; shouldn't happen for a full graph.
        return;
      }
      const dx = posB.x - posA.x;
      const dy = posB.y - posA.y;
      const fx = dx * ATTRACTION;
      const fy = dy * ATTRACTION;
      forceA.x += fx;
      forceA.y += fy;
      forceB.x -= fx;
      forceB.y -= fy;
    });

    ordered.forEach(node => {
      const pos = positions.get(node.id) as Point;
      const force = forces.get(node.id) as Point;
      force.x += (centerX - pos.x) * CENTERING;
      force.y += (centerY - pos.y) * CENTERING;
      positions.set(node.id, {
        x: Math.min(width - padding, Math.max(padding, pos.x + force.x)),
        y: Math.min(height - padding, Math.max(padding, pos.y + force.y)),
      });
    });
  }

  return ordered.map(node => ({
    ...node,
    ...(positions.get(node.id) as Point),
  }));
}

/**
 * Returns the induced subgraph reachable from `nodeId` within `depth` hops
 * (BFS over the undirected adjacency implied by `graph.edges`), including
 * the focus node itself. Node `degree` values are carried over unchanged
 * from the source graph — they describe full-graph connectivity, not the
 * neighborhood. Returns an empty graph if `nodeId` isn't present.
 */
export function getNeighborhood(
  graph: RelationshipGraph,
  nodeId: string,
  depth: number
): RelationshipGraph {
  const nodeById = new Map(graph.nodes.map(n => [n.id, n]));
  if (!nodeById.has(nodeId)) {
    return { nodes: [], edges: [] };
  }

  const adjacency = new Map<string, string[]>();
  graph.edges.forEach(edge => {
    if (!adjacency.has(edge.sourceId)) {
      adjacency.set(edge.sourceId, []);
    }
    if (!adjacency.has(edge.targetId)) {
      adjacency.set(edge.targetId, []);
    }
    (adjacency.get(edge.sourceId) as string[]).push(edge.targetId);
    (adjacency.get(edge.targetId) as string[]).push(edge.sourceId);
  });

  const visited = new Set<string>([nodeId]);
  let frontier = [nodeId];
  for (let hop = 0; hop < depth && frontier.length > 0; hop++) {
    const next: string[] = [];
    frontier.forEach(id => {
      (adjacency.get(id) ?? []).forEach(neighborId => {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          next.push(neighborId);
        }
      });
    });
    frontier = next;
  }

  return {
    nodes: graph.nodes.filter(node => visited.has(node.id)),
    edges: graph.edges.filter(
      edge => visited.has(edge.sourceId) && visited.has(edge.targetId)
    ),
  };
}
