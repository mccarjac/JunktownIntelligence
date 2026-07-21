import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  SharedValue,
} from 'react-native-reanimated';
import { GameLocation } from '@models/types';
import { colors, borderRadius, shadows } from '@/styles/theme';
import { normalizedToImagePoint } from '@/utils/mapCoordinates';

const MARKER_SIZE = 44;
const DOT_SIZE = 20;

interface LocationMarkerProps {
  location: GameLocation;
  imageWidth: number;
  imageHeight: number;
  scale: SharedValue<number>;
  onPress: (location: GameLocation) => void;
}

export const LocationMarker: React.FC<LocationMarkerProps> = ({
  location,
  imageWidth,
  imageHeight,
  scale,
  onPress,
}) => {
  const counterScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 / scale.value }],
  }));

  if (!location.mapCoordinates) {
    return null;
  }

  const { x, y } = normalizedToImagePoint(location.mapCoordinates, {
    width: imageWidth,
    height: imageHeight,
  });

  return (
    <Animated.View
      style={[
        styles.touchArea,
        {
          left: x - MARKER_SIZE / 2,
          top: y - MARKER_SIZE / 2,
        },
        counterScaleStyle,
      ]}
    >
      <TouchableOpacity
        style={styles.touchAreaInner}
        onPress={() => onPress(location)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={location.name}
      >
        <View style={styles.dot} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  touchArea: {
    position: 'absolute',
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  touchAreaInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accent.primary,
    borderWidth: 2,
    borderColor: colors.text.primary,
    ...shadows.small,
  },
});
