import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  LayoutChangeEvent,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/navigation/types';
import { GameCharacter, GameLocation } from '@models/types';
import {
  loadCharacters,
  loadFactions,
  loadLocations,
  migrateFactionDescriptions,
  StoredFaction,
} from '@utils/characterStorage';
import {
  buildRelationshipGraph,
  computeGraphLayout,
  getNeighborhood,
  GraphNode,
  GraphNodeType,
  PositionedNode,
} from '@utils/relationshipGraph';
import {
  DEFAULT_GRAPH_PREFERENCES,
  getGraphPreferences,
  GraphPreferences,
  resetGraphPreferences,
  updateGraphPreferences,
} from '@utils/graphPreferences';
import { Size } from '@utils/mapCoordinates';
import { colors, spacing, typography, borderRadius } from '@/styles/theme';
import { commonStyles } from '@/styles/commonStyles';
import {
  GraphCanvas,
  GraphFilterBar,
  GraphFilters,
  GraphInfoCard,
  GraphLegend,
  GraphSettingsPanel,
} from '@/components';

type RelationshipGraphNavigationProp = StackNavigationProp<RootStackParamList>;

const DEFAULT_FILTERS: GraphFilters = {
  visibleTypes: new Set<GraphNodeType>(['character', 'faction', 'location']),
  showRetired: false,
  hideIsolated: false,
};

export const RelationshipGraphScreen: React.FC = () => {
  const navigation = useNavigation<RelationshipGraphNavigationProp>();

  const [characters, setCharacters] = useState<GameCharacter[]>([]);
  const [factions, setFactions] = useState<StoredFaction[]>([]);
  const [locations, setLocations] = useState<GameLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const [containerSize, setContainerSize] = useState<Size>({
    width: 0,
    height: 0,
  });
  const [filters, setFilters] = useState<GraphFilters>(DEFAULT_FILTERS);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<GraphPreferences>(
    DEFAULT_GRAPH_PREFERENCES
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await migrateFactionDescriptions();
      const [loadedCharacters, loadedFactions, loadedLocations, loadedPrefs] =
        await Promise.all([
          loadCharacters(),
          loadFactions(),
          loadLocations(),
          getGraphPreferences(),
        ]);
      setCharacters(loadedCharacters);
      setFactions(loadedFactions);
      setLocations(loadedLocations);
      setPreferences(loadedPrefs);
    } catch {
      // Loaders resolve [] on failure; the screen just shows the empty state.
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const fullGraph = useMemo(
    () =>
      buildRelationshipGraph(
        { characters, factions, locations },
        {
          includeCharacters: filters.visibleTypes.has('character'),
          includeFactions: filters.visibleTypes.has('faction'),
          includeLocations: filters.visibleTypes.has('location'),
          includeRetired: filters.showRetired,
          hideIsolated: filters.hideIsolated,
        }
      ),
    [characters, factions, locations, filters]
  );

  const focusedNode = focusNodeId
    ? (fullGraph.nodes.find(n => n.id === focusNodeId) ?? null)
    : null;

  const displayedGraph = useMemo(() => {
    if (!focusedNode) {
      return fullGraph;
    }
    return getNeighborhood(fullGraph, focusedNode.id, 1);
  }, [fullGraph, focusedNode]);

  // The layout runs on a virtual canvas that grows with the spacing
  // preference; the GraphCanvas pan/zoom gestures navigate the overflow.
  const virtualSize = useMemo<Size>(() => {
    const spreadFactor = Math.min(3, Math.max(1, preferences.spacing));
    return {
      width: containerSize.width * spreadFactor,
      height: containerSize.height * spreadFactor,
    };
  }, [containerSize, preferences.spacing]);

  const positionedNodes = useMemo(
    () =>
      computeGraphLayout(displayedGraph, virtualSize, {
        spacing: preferences.spacing,
        standingSpread: preferences.standingSpread,
      }),
    [displayedGraph, virtualSize, preferences]
  );

  const selectedNode: PositionedNode | null =
    positionedNodes.find(n => n.id === selectedNodeId) ?? null;

  const handleContainerLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerSize({ width, height });
  };

  const handleSelectNode = (node: PositionedNode) => {
    setSelectedNodeId(prev => (prev === node.id ? null : node.id));
  };

  const handleToggleFocus = (node: GraphNode) => {
    setSelectedNodeId(null);
    setFocusNodeId(prev => (prev === node.id ? null : node.id));
  };

  const handleShowFullGraph = () => {
    setFocusNodeId(null);
    setSelectedNodeId(null);
  };

  const handleViewDetails = (node: GraphNode) => {
    setSelectedNodeId(null);
    if (node.type === 'character') {
      const character = characters.find(c => c.id === node.refId);
      if (character) {
        navigation.navigate('CharacterDetail', { character });
      }
      return;
    }
    if (node.type === 'faction') {
      navigation.navigate('FactionDetails', { factionName: node.refId });
      return;
    }
    navigation.navigate('LocationDetails', { locationId: node.refId });
  };

  const handleToggleType = (type: GraphNodeType) => {
    setFilters(prev => {
      const visibleTypes = new Set(prev.visibleTypes);
      if (visibleTypes.has(type)) {
        visibleTypes.delete(type);
      } else {
        visibleTypes.add(type);
      }
      return { ...prev, visibleTypes };
    });
  };

  const handleToggleRetired = () => {
    setFilters(prev => ({ ...prev, showRetired: !prev.showRetired }));
  };

  const handleToggleHideIsolated = () => {
    setFilters(prev => ({ ...prev, hideIsolated: !prev.hideIsolated }));
  };

  const handlePreferencesCommit = (prefs: GraphPreferences) => {
    setPreferences(prefs);
    // Persistence failures are non-fatal — the in-memory value still applies.
    updateGraphPreferences(prefs).catch(() => {});
  };

  const handlePreferencesReset = () => {
    setPreferences(DEFAULT_GRAPH_PREFERENCES);
    resetGraphPreferences().catch(() => {});
  };

  const hasAnyData =
    characters.length > 0 || factions.length > 0 || locations.length > 0;

  return (
    <View style={styles.container}>
      <GraphFilterBar
        filters={filters}
        onToggleType={handleToggleType}
        onToggleRetired={handleToggleRetired}
        onToggleHideIsolated={handleToggleHideIsolated}
      />
      <GraphLegend />
      <GraphSettingsPanel
        preferences={preferences}
        onChange={setPreferences}
        onCommit={handlePreferencesCommit}
        onReset={handlePreferencesReset}
      />

      {focusedNode && (
        <View style={styles.focusPill}>
          <Text style={styles.focusPillText} numberOfLines={1}>
            Focused on {focusedNode.label}
          </Text>
          <TouchableOpacity
            onPress={handleShowFullGraph}
            accessibilityRole="button"
            accessibilityLabel="Show full graph"
          >
            <Text style={styles.focusPillAction}>Show full graph</Text>
          </TouchableOpacity>
        </View>
      )}

      <View
        testID="graph-canvas-container"
        style={styles.canvasContainer}
        onLayout={handleContainerLayout}
      >
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.accent.primary} />
          </View>
        ) : !hasAnyData ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>
              Nothing to graph yet. Add characters, factions, or locations to
              see their relationships here.
            </Text>
          </View>
        ) : displayedGraph.nodes.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>
              No nodes match the current filters.
            </Text>
          </View>
        ) : containerSize.width > 0 ? (
          <GraphCanvas
            containerSize={containerSize}
            contentSize={virtualSize}
            nodes={positionedNodes}
            edges={displayedGraph.edges}
            selectedNodeId={selectedNodeId}
            onSelectNode={handleSelectNode}
          />
        ) : null}
      </View>

      {selectedNode && (
        <GraphInfoCard
          node={selectedNode}
          isFocused={focusNodeId === selectedNode.id}
          onViewDetails={handleViewDetails}
          onToggleFocus={handleToggleFocus}
          onClose={() => setSelectedNodeId(null)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  canvasContainer: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    ...commonStyles.text.body,
    textAlign: 'center',
  },
  focusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: colors.elevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.accent.primary,
  },
  focusPillText: {
    flex: 1,
    marginRight: spacing.md,
    color: colors.text.primary,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
  focusPillAction: {
    color: colors.accent.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
});
