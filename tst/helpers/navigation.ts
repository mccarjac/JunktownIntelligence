import { useEffect, type ReactElement } from 'react';

/**
 * Helpers for controlling the global `@react-navigation/native` mock from
 * `jest.setup.js`. The global mock returns a fresh object with new `jest.fn()`s
 * on every `useNavigation()` call, which makes asserting on `setOptions`,
 * `goBack`, or `navigate` impossible. `installNavigationMock` swaps in a single
 * stable mock for the current test; `installRouteParams` does the same for
 * `useRoute`. Both are restored by `resetNavigationMocks` (call in `afterEach`).
 */

export interface NavMock {
  navigate: jest.Mock;
  goBack: jest.Mock;
  push: jest.Mock;
  setOptions: jest.Mock;
  addListener: jest.Mock;
  removeListener: jest.Mock;
}

interface MockedNavigationModule {
  useNavigation: () => unknown;
  useRoute: () => { params: Record<string, unknown> };
  useFocusEffect: (callback: () => void) => void;
}

const getMockModule = (): MockedNavigationModule =>
  jest.requireMock('@react-navigation/native') as MockedNavigationModule;

let originalUseNavigation: MockedNavigationModule['useNavigation'] | undefined;
let originalUseRoute: MockedNavigationModule['useRoute'] | undefined;
let originalUseFocusEffect:
  | MockedNavigationModule['useFocusEffect']
  | undefined;

export function installNavigationMock(): NavMock {
  const mockModule = getMockModule();
  if (!originalUseNavigation) {
    originalUseNavigation = mockModule.useNavigation;
  }
  const nav: NavMock = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    push: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
  };
  mockModule.useNavigation = () => nav;
  return nav;
}

export function installRouteParams(params: Record<string, unknown>): void {
  const mockModule = getMockModule();
  if (!originalUseRoute) {
    originalUseRoute = mockModule.useRoute;
  }
  mockModule.useRoute = () => ({ params });
}

/**
 * The global `useFocusEffect` mock (`jest.setup.js`) invokes its callback
 * synchronously on *every* render, unlike the real hook (which only re-fires
 * on focus). For screens that gate a full-screen loading spinner behind
 * state set inside that callback, this causes a genuine render-phase update
 * loop (loading flips true → false → true forever) that trips React's "Too
 * many re-renders" guard. This installs a version that behaves like a normal
 * mount effect (runs the callback once, after render, via `useEffect`),
 * which is enough to test the initial load without the bounce.
 */
function useFocusEffectOnceMock(callback: () => void): void {
  useEffect(() => {
    callback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function installFocusEffectOnce(): void {
  const mockModule = getMockModule();
  if (!originalUseFocusEffect) {
    originalUseFocusEffect = mockModule.useFocusEffect;
  }
  mockModule.useFocusEffect = useFocusEffectOnceMock;
}

export function resetNavigationMocks(): void {
  const mockModule = getMockModule();
  if (originalUseNavigation) {
    mockModule.useNavigation = originalUseNavigation;
  }
  if (originalUseRoute) {
    mockModule.useRoute = originalUseRoute;
  }
  if (originalUseFocusEffect) {
    mockModule.useFocusEffect = originalUseFocusEffect;
  }
}

/**
 * Screens configure header buttons by passing a `headerRight` render function
 * to `navigation.setOptions`. Returns the element produced by the most recent
 * such call so tests can `render()` it and press the buttons.
 */
export function getLastHeaderRight(nav: NavMock): ReactElement {
  const calls = nav.setOptions.mock.calls;
  for (let i = calls.length - 1; i >= 0; i--) {
    const options = calls[i][0] as { headerRight?: () => ReactElement };
    if (options && typeof options.headerRight === 'function') {
      return options.headerRight();
    }
  }
  throw new Error(
    'navigation.setOptions was never called with a headerRight function'
  );
}
