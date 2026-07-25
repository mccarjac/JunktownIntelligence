import React, { useCallback, useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  Text,
  LayoutChangeEvent,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/navigation/types';
import { GameLocation } from '@models/types';
import { loadLocations, updateLocation } from '@utils/characterStorage';
import { colors as themeColors } from '@/styles/theme';
import { commonStyles } from '@/styles/commonStyles';
import {
  LocationMarker,
  MapInfoCard,
  MapLocationPickerModal,
} from '@/components';
import {
  containerPointToNormalized,
  clampTranslation,
  Point,
  Size,
} from '@/utils/mapCoordinates';
import mapImage from '../../../assets/JunktownMap.png';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

type LocationMapNavigationProp = StackNavigationProp<RootStackParamList>;

export const LocationMapScreen: React.FC = () => {
  const navigation = useNavigation<LocationMapNavigationProp>();

  const [imageSize, setImageSize] = useState<Size>({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState<Size>({
    width: 0,
    height: 0,
  });
  const [locations, setLocations] = useState<GameLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<GameLocation | null>(
    null
  );
  const [pendingCoords, setPendingCoords] = useState<Point | null>(null);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      loadLocations().then(setLocations);
    }, [])
  );

  // Get the actual image dimensions
  React.useEffect(() => {
    // For local assets, we can use Image.resolveAssetSource
    const source = Image.resolveAssetSource(mapImage);
    if (source) {
      const { width, height } = source;
      // Scale the image to fit within the screen while maintaining aspect ratio
      const scaleValue = Math.min(
        (screenWidth - 32) / width, // Account for padding
        (screenHeight - 100) / height, // Account for header and padding
        1 // Don't scale up, only down
      );
      setImageSize({
        width: width * scaleValue,
        height: height * scaleValue,
      });
    }
  }, []);

  const handleContainerLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerSize({ width, height });
  };

  const handleLongPress = (coords: Point) => {
    setPendingCoords(coords);
  };

  const handlePlaceLocation = async (locationId: string) => {
    if (!pendingCoords) {
      return;
    }
    await updateLocation(locationId, { mapCoordinates: pendingCoords });
    setPendingCoords(null);
    const updated = await loadLocations();
    setLocations(updated);
  };

  const handleViewDetails = (locationId: string) => {
    setSelectedLocation(null);
    navigation.navigate('LocationDetails', { locationId });
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate(e => {
      scale.value = savedScale.value * e.scale;
      const clamped = clampTranslation(
        translateX.value,
        translateY.value,
        scale.value,
        imageSize,
        containerSize
      );
      translateX.value = clamped.x;
      translateY.value = clamped.y;
    })
    .onEnd(() => {
      // Constrain scale between 1 and 3
      let targetScale = scale.value;
      if (targetScale < 1) {
        targetScale = 1;
      } else if (targetScale > 3) {
        targetScale = 3;
      }
      const clamped = clampTranslation(
        translateX.value,
        translateY.value,
        targetScale,
        imageSize,
        containerSize
      );
      scale.value = withTiming(targetScale);
      translateX.value = withTiming(clamped.x);
      translateY.value = withTiming(clamped.y);
      savedScale.value = targetScale;
      savedTranslateX.value = clamped.x;
      savedTranslateY.value = clamped.y;
    });

  const panGesture = Gesture.Pan()
    .onUpdate(e => {
      const clamped = clampTranslation(
        savedTranslateX.value + e.translationX,
        savedTranslateY.value + e.translationY,
        scale.value,
        imageSize,
        containerSize
      );
      translateX.value = clamped.x;
      translateY.value = clamped.y;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        // Zoom out
        scale.value = withTiming(1);
        savedScale.value = 1;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        // Zoom in to 2x
        const targetScale = 2;
        const clamped = clampTranslation(
          translateX.value,
          translateY.value,
          targetScale,
          imageSize,
          containerSize
        );
        scale.value = withTiming(targetScale);
        savedScale.value = targetScale;
        translateX.value = withTiming(clamped.x);
        translateY.value = withTiming(clamped.y);
        savedTranslateX.value = clamped.x;
        savedTranslateY.value = clamped.y;
      }
    });

  const longPress = Gesture.LongPress().onStart(e => {
    const normalized = containerPointToNormalized(
      { x: e.x, y: e.y },
      containerSize,
      imageSize,
      {
        scale: scale.value,
        translateX: translateX.value,
        translateY: translateY.value,
      }
    );
    if (normalized) {
      runOnJS(handleLongPress)(normalized);
    }
  });

  const composedGesture = Gesture.Simultaneous(
    doubleTap,
    Gesture.Simultaneous(pinchGesture, panGesture),
    longPress
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const placedLocations = locations.filter(location => location.mapCoordinates);

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <View style={styles.imageContainer} onLayout={handleContainerLayout}>
          {imageSize.width > 0 ? (
            <Animated.View
              style={[
                {
                  width: imageSize.width,
                  height: imageSize.height,
                },
                animatedStyle,
              ]}
            >
              <Image
                source={mapImage}
                style={styles.mapImage}
                resizeMode="contain"
              />
              {placedLocations.map(location => (
                <LocationMarker
                  key={location.id}
                  location={location}
                  imageWidth={imageSize.width}
                  imageHeight={imageSize.height}
                  scale={scale}
                  onPress={setSelectedLocation}
                />
              ))}
            </Animated.View>
          ) : (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading map...</Text>
            </View>
          )}
        </View>
      </GestureDetector>

      {selectedLocation && (
        <MapInfoCard
          location={selectedLocation}
          onViewDetails={handleViewDetails}
          onClose={() => setSelectedLocation(null)}
        />
      )}

      <MapLocationPickerModal
        visible={pendingCoords !== null}
        locations={locations}
        onSelect={handlePlaceLocation}
        onCancel={() => setPendingCoords(null)}
      />
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.primary,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...commonStyles.text.body,
    color: themeColors.text.secondary,
  },
});
