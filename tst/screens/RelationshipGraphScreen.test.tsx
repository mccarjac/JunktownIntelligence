import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { RelationshipGraphScreen } from '@screens/RelationshipGraphScreen';
import { RelationshipStanding } from '@models/types';
import { getStorageMock, primeStorageDefaults } from '../helpers/storage';
import {
  makeCharacter,
  makeLocation,
  makeStoredFaction,
} from '../helpers/factories';
import {
  installFocusEffectOnce,
  installNavigationMock,
  resetNavigationMocks,
} from '../helpers/navigation';

jest.mock('@utils/characterStorage');
jest.mock('@utils/graphPreferences', () => ({
  ...jest.requireActual('@utils/graphPreferences'),
  getGraphPreferences: jest.fn(),
  updateGraphPreferences: jest.fn(),
  resetGraphPreferences: jest.fn(),
}));

import {
  DEFAULT_GRAPH_PREFERENCES,
  getGraphPreferences,
  updateGraphPreferences,
} from '@utils/graphPreferences';

const storage = getStorageMock();

const CANVAS_SIZE = {
  x: 0,
  y: 0,
  width: 400,
  height: 400,
};

const fireCanvasLayout = (getByTestId: (id: string) => unknown) => {
  fireEvent(getByTestId('graph-canvas-container') as never, 'layout', {
    nativeEvent: { layout: CANVAS_SIZE },
  });
};

describe('RelationshipGraphScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    primeStorageDefaults();
    installFocusEffectOnce();
    (getGraphPreferences as jest.Mock).mockResolvedValue(
      DEFAULT_GRAPH_PREFERENCES
    );
    (updateGraphPreferences as jest.Mock).mockResolvedValue(
      DEFAULT_GRAPH_PREFERENCES
    );
  });

  afterEach(() => {
    resetNavigationMocks();
  });

  it('shows an empty state when there is no data to graph', async () => {
    const { findByText } = render(<RelationshipGraphScreen />);

    expect(await findByText(/Nothing to graph yet/)).toBeTruthy();
  });

  it('renders nodes for characters, factions, and locations once data loads', async () => {
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
    storage.loadCharacters.mockResolvedValue([alice, bob]);
    storage.loadFactions.mockResolvedValue([
      makeStoredFaction({ name: 'Brotherhood' }),
    ]);
    storage.loadLocations.mockResolvedValue([
      makeLocation({ id: 'loc-1', name: 'The Docks' }),
    ]);

    const { getByTestId, getByLabelText } = render(<RelationshipGraphScreen />);
    fireCanvasLayout(getByTestId);

    await waitFor(() => expect(getByLabelText('Alice')).toBeTruthy());
    expect(getByLabelText('Bob')).toBeTruthy();
    expect(getByLabelText('Brotherhood')).toBeTruthy();
    expect(getByLabelText('The Docks')).toBeTruthy();
  });

  it('navigates to CharacterDetail with the character object from the info card', async () => {
    const alice = makeCharacter({ id: 'c-alice', name: 'Alice' });
    storage.loadCharacters.mockResolvedValue([alice]);
    const nav = installNavigationMock();

    const { getByTestId, getByLabelText, findByText } = render(
      <RelationshipGraphScreen />
    );
    fireCanvasLayout(getByTestId);

    const node = await waitFor(() => getByLabelText('Alice'));
    fireEvent.press(node);
    fireEvent.press(await findByText('View details'));

    expect(nav.navigate).toHaveBeenCalledWith('CharacterDetail', {
      character: alice,
    });
  });

  it('navigates to FactionDetails with the faction name from the info card', async () => {
    const alice = makeCharacter({
      id: 'c-alice',
      name: 'Alice',
      factions: [{ name: 'Brotherhood', standing: RelationshipStanding.Ally }],
    });
    storage.loadCharacters.mockResolvedValue([alice]);
    storage.loadFactions.mockResolvedValue([
      makeStoredFaction({ name: 'Brotherhood' }),
    ]);
    const nav = installNavigationMock();

    const { getByTestId, getByLabelText, findByText } = render(
      <RelationshipGraphScreen />
    );
    fireCanvasLayout(getByTestId);

    const node = await waitFor(() => getByLabelText('Brotherhood'));
    fireEvent.press(node);
    fireEvent.press(await findByText('View details'));

    expect(nav.navigate).toHaveBeenCalledWith('FactionDetails', {
      factionName: 'Brotherhood',
    });
  });

  it('navigates to LocationDetails with the location id from the info card', async () => {
    const alice = makeCharacter({
      id: 'c-alice',
      name: 'Alice',
      locationId: 'loc-1',
    });
    storage.loadCharacters.mockResolvedValue([alice]);
    storage.loadLocations.mockResolvedValue([
      makeLocation({ id: 'loc-1', name: 'The Docks' }),
    ]);
    const nav = installNavigationMock();

    const { getByTestId, getByLabelText, findByText } = render(
      <RelationshipGraphScreen />
    );
    fireCanvasLayout(getByTestId);

    const node = await waitFor(() => getByLabelText('The Docks'));
    fireEvent.press(node);
    fireEvent.press(await findByText('View details'));

    expect(nav.navigate).toHaveBeenCalledWith('LocationDetails', {
      locationId: 'loc-1',
    });
  });

  it('narrows to the neighborhood when focused, and restores on "Show full graph"', async () => {
    const alice = makeCharacter({
      id: 'c-alice',
      name: 'Alice',
      relationships: [
        { characterName: 'Bob', relationshipType: RelationshipStanding.Ally },
      ],
    });
    const bob = makeCharacter({ id: 'c-bob', name: 'Bob' });
    const dave = makeCharacter({ id: 'c-dave', name: 'Dave' });
    storage.loadCharacters.mockResolvedValue([alice, bob, dave]);

    const {
      getByTestId,
      getByLabelText,
      queryByLabelText,
      findByText,
      getByText,
    } = render(<RelationshipGraphScreen />);
    fireCanvasLayout(getByTestId);

    const aliceNode = await waitFor(() => getByLabelText('Alice'));
    expect(getByLabelText('Dave')).toBeTruthy();

    fireEvent.press(aliceNode);
    fireEvent.press(await findByText('Focus'));

    expect(await findByText('Focused on Alice')).toBeTruthy();
    expect(getByLabelText('Bob')).toBeTruthy();
    expect(queryByLabelText('Dave')).toBeNull();

    fireEvent.press(getByText('Show full graph'));

    await waitFor(() => expect(getByLabelText('Dave')).toBeTruthy());
  });

  it('hides a node type when its filter chip is toggled off', async () => {
    const alice = makeCharacter({
      id: 'c-alice',
      name: 'Alice',
      factions: [{ name: 'Brotherhood', standing: RelationshipStanding.Ally }],
    });
    storage.loadCharacters.mockResolvedValue([alice]);
    storage.loadFactions.mockResolvedValue([
      makeStoredFaction({ name: 'Brotherhood' }),
    ]);

    const { getByTestId, getByLabelText, queryByLabelText } = render(
      <RelationshipGraphScreen />
    );
    fireCanvasLayout(getByTestId);

    await waitFor(() => expect(getByLabelText('Brotherhood')).toBeTruthy());

    fireEvent.press(getByLabelText('Faction'));

    await waitFor(() => expect(queryByLabelText('Brotherhood')).toBeNull());
    expect(getByLabelText('Alice')).toBeTruthy();
  });

  it('persists spacing changes from the layout settings panel', async () => {
    const alice = makeCharacter({ id: 'c-alice', name: 'Alice' });
    storage.loadCharacters.mockResolvedValue([alice]);

    const { getByTestId, getByLabelText } = render(<RelationshipGraphScreen />);
    fireCanvasLayout(getByTestId);
    await waitFor(() => expect(getByLabelText('Alice')).toBeTruthy());

    fireEvent.press(getByLabelText('Layout settings'));
    fireEvent(getByTestId('graph-spacing-slider'), 'slidingComplete', 2.5);

    expect(updateGraphPreferences).toHaveBeenCalledWith({
      ...DEFAULT_GRAPH_PREFERENCES,
      spacing: 2.5,
    });
    // The graph still renders after the relayout on the larger canvas.
    expect(getByLabelText('Alice')).toBeTruthy();
  });
});
