import React from 'react';
import { Image } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import { LocationMapScreen } from '@screens/location/LocationMapScreen';

/**
 * The global `react-native-reanimated` and `react-native-gesture-handler`
 * mocks (jest.setup.js) only cover what the templated list/detail/form
 * screens need. LocationMapScreen is the sole user of shared-value
 * animations and gesture composition, so it needs its own local mocks —
 * simple passthroughs are enough to exercise the mount/resize behavior
 * without a real gesture/animation engine.
 */
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: {
    View: 'Animated.View',
    Image: 'Animated.Image',
    createAnimatedComponent: (component: unknown) => component,
  },
  useSharedValue: (initial: number) => ({ value: initial }),
  useAnimatedStyle: (factory: () => unknown) => factory(),
  withTiming: (value: number) => value,
}));

const chainable = () => {
  const gesture: Record<string, jest.Mock> = {};
  ['onUpdate', 'onEnd', 'numberOfTaps'].forEach(method => {
    gesture[method] = jest.fn(() => gesture);
  });
  return gesture;
};

jest.mock('react-native-gesture-handler', () => ({
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  Gesture: {
    Pinch: () => chainable(),
    Pan: () => chainable(),
    Tap: () => chainable(),
    Simultaneous: (...gestures: unknown[]) => gestures,
  },
}));

describe('LocationMapScreen', () => {
  it('shows a loading state before the map asset size resolves', () => {
    jest.spyOn(Image, 'resolveAssetSource').mockReturnValue(undefined as any);

    const { getByText } = render(<LocationMapScreen />);

    expect(getByText('Loading map...')).toBeTruthy();
  });

  it('renders the map image once the asset size resolves', async () => {
    jest.spyOn(Image, 'resolveAssetSource').mockReturnValue({
      width: 1000,
      height: 500,
      uri: 'mock-map-uri',
      scale: 1,
    });

    const { queryByText, UNSAFE_getByType } = render(<LocationMapScreen />);

    await waitFor(() => {
      expect(queryByText('Loading map...')).toBeNull();
    });
    expect(UNSAFE_getByType('Animated.Image' as never)).toBeTruthy();
  });
});
