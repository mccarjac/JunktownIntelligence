import React from 'react';
import { Image } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Gesture } from 'react-native-gesture-handler';
import { LocationMapScreen } from '@screens/location/LocationMapScreen';
import { getStorageMock, primeStorageDefaults } from '../../helpers/storage';
import { makeLocation } from '../../helpers/factories';
import {
  installNavigationMock,
  resetNavigationMocks,
} from '../../helpers/navigation';

jest.mock('@utils/characterStorage');

const storage = getStorageMock();

// Small, well below any real screen size, so the fit-to-screen scale in
// LocationMapScreen never kicks in and imageSize == {300, 200} exactly.
const IMAGE_SIZE = { width: 300, height: 200 };

const getLatestLongPressStub = () => {
  const results = (Gesture.LongPress as jest.Mock).mock.results;
  return results[results.length - 1].value;
};

describe('LocationMapScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    primeStorageDefaults();
  });

  afterEach(() => {
    resetNavigationMocks();
  });

  it('shows a loading state before the map asset size resolves', () => {
    jest.spyOn(Image, 'resolveAssetSource').mockReturnValue(undefined as any);

    const { getByText } = render(<LocationMapScreen />);

    expect(getByText('Loading map...')).toBeTruthy();
  });

  it('renders markers only for locations that have map coordinates', async () => {
    jest.spyOn(Image, 'resolveAssetSource').mockReturnValue({
      width: IMAGE_SIZE.width,
      height: IMAGE_SIZE.height,
      uri: 'test-map-uri',
      scale: 1,
    });
    storage.loadLocations.mockResolvedValue([
      makeLocation({
        id: 'loc-placed',
        name: 'The Docks',
        mapCoordinates: { x: 0.5, y: 0.5 },
      }),
      makeLocation({ id: 'loc-unplaced', name: 'Rust Alley' }),
    ]);

    const { getByLabelText, queryByLabelText } = render(<LocationMapScreen />);

    await waitFor(() => {
      expect(getByLabelText('The Docks')).toBeTruthy();
    });
    expect(queryByLabelText('Rust Alley')).toBeNull();
  });

  it('shows the info card with a "View details" link when a marker is pressed', async () => {
    jest.spyOn(Image, 'resolveAssetSource').mockReturnValue({
      width: IMAGE_SIZE.width,
      height: IMAGE_SIZE.height,
      uri: 'test-map-uri',
      scale: 1,
    });
    storage.loadLocations.mockResolvedValue([
      makeLocation({
        id: 'loc-1',
        name: 'The Docks',
        description: 'A rundown pier.',
        mapCoordinates: { x: 0.5, y: 0.5 },
      }),
    ]);

    const { getByLabelText, findByText } = render(<LocationMapScreen />);

    const marker = await waitFor(() => getByLabelText('The Docks'));
    fireEvent.press(marker);

    expect(await findByText('A rundown pier.')).toBeTruthy();
    expect(await findByText('View details')).toBeTruthy();
  });

  it('navigates to LocationDetails with the location id from the info card', async () => {
    jest.spyOn(Image, 'resolveAssetSource').mockReturnValue({
      width: IMAGE_SIZE.width,
      height: IMAGE_SIZE.height,
      uri: 'test-map-uri',
      scale: 1,
    });
    storage.loadLocations.mockResolvedValue([
      makeLocation({
        id: 'loc-1',
        name: 'The Docks',
        mapCoordinates: { x: 0.5, y: 0.5 },
      }),
    ]);
    const nav = installNavigationMock();

    const { getByLabelText, findByText } = render(<LocationMapScreen />);

    const marker = await waitFor(() => getByLabelText('The Docks'));
    fireEvent.press(marker);

    fireEvent.press(await findByText('View details'));

    expect(nav.navigate).toHaveBeenCalledWith('LocationDetails', {
      locationId: 'loc-1',
    });
  });

  it('places a location at the long-pressed coordinates via the picker', async () => {
    jest.spyOn(Image, 'resolveAssetSource').mockReturnValue({
      width: IMAGE_SIZE.width,
      height: IMAGE_SIZE.height,
      uri: 'test-map-uri',
      scale: 1,
    });
    storage.loadLocations.mockResolvedValue([
      makeLocation({ id: 'loc-1', name: 'The Docks' }),
    ]);
    storage.updateLocation.mockResolvedValue(
      makeLocation({
        id: 'loc-1',
        name: 'The Docks',
        mapCoordinates: { x: 0.5, y: 0.5 },
      })
    );

    const { findByText } = render(<LocationMapScreen />);

    // Let the initial `loadLocations()` from `useFocusEffect` resolve before
    // long-pressing, so the picker has the location to list.
    const loadCallsBeforePlacement = () =>
      storage.loadLocations.mock.calls.length;
    await waitFor(() => expect(loadCallsBeforePlacement()).toBeGreaterThan(0));
    const callsBeforePlacement = loadCallsBeforePlacement();

    const longPressStub = getLatestLongPressStub();
    act(() => {
      longPressStub.callbacks.onStart({ x: 0, y: 0 });
    });

    fireEvent.press(await findByText('The Docks'));

    await waitFor(() => {
      expect(storage.updateLocation).toHaveBeenCalledWith('loc-1', {
        mapCoordinates: { x: 0.5, y: 0.5 },
      });
    });
    // Placement reloads the location list so the new marker appears.
    await waitFor(() => {
      expect(loadCallsBeforePlacement()).toBeGreaterThan(callsBeforePlacement);
    });
  });
});
