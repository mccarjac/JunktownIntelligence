import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { colors, spacing, borderRadius, typography } from '@/styles/theme';
import type { GraphPreferences } from '@utils/graphPreferences';

interface GraphSettingsPanelProps {
  preferences: GraphPreferences;
  /** Fired live while a slider is dragged — the layout recomputes. */
  onChange: (prefs: GraphPreferences) => void;
  /** Fired when a slider is released — persist the value here. */
  onCommit: (prefs: GraphPreferences) => void;
  onReset: () => void;
}

/**
 * Collapsible layout controls for the relationship graph: overall node
 * spacing and how strongly relationship standing pulls friendly nodes
 * together / pushes hostile ones apart.
 */
export const GraphSettingsPanel: React.FC<GraphSettingsPanelProps> = ({
  preferences,
  onChange,
  onCommit,
  onReset,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.toggle}
        onPress={() => setExpanded(prev => !prev)}
        accessibilityRole="button"
        accessibilityLabel="Layout settings"
        accessibilityState={{ expanded }}
      >
        <Text style={styles.toggleText}>
          Layout settings {expanded ? '▾' : '▸'}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.panel}>
          <View style={styles.row}>
            <Text style={styles.label}>Spacing</Text>
            <Slider
              testID="graph-spacing-slider"
              style={styles.slider}
              minimumValue={1}
              maximumValue={3}
              step={0.25}
              value={preferences.spacing}
              minimumTrackTintColor={colors.accent.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.accent.primary}
              onValueChange={value =>
                onChange({ ...preferences, spacing: value })
              }
              onSlidingComplete={value =>
                onCommit({ ...preferences, spacing: value })
              }
            />
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Standing effect</Text>
            <Slider
              testID="graph-standing-slider"
              style={styles.slider}
              minimumValue={0}
              maximumValue={2}
              step={0.25}
              value={preferences.standingSpread}
              minimumTrackTintColor={colors.accent.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.accent.primary}
              onValueChange={value =>
                onChange({ ...preferences, standingSpread: value })
              }
              onSlidingComplete={value =>
                onCommit({ ...preferences, standingSpread: value })
              }
            />
          </View>
          <TouchableOpacity
            onPress={onReset}
            accessibilityRole="button"
            accessibilityLabel="Reset layout settings"
          >
            <Text style={styles.resetText}>Reset to defaults</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
  },
  toggle: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  toggleText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  panel: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  label: {
    width: 110,
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
  },
  slider: {
    flex: 1,
    height: 32,
  },
  resetText: {
    color: colors.accent.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
});
