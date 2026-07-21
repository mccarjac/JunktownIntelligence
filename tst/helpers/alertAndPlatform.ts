import { Alert, Platform } from 'react-native';
import { act } from '@testing-library/react-native';

interface AlertButton {
  text?: string;
  onPress?: () => void;
}

/**
 * Spies on `Alert.alert` with a no-op implementation so tests can assert on
 * the confirmation dialogs screens raise and press their buttons via
 * `pressAlertButton`. Restore with `jest.restoreAllMocks()` in `afterEach`.
 */
export function spyOnAlert(): jest.SpyInstance {
  return jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
}

/**
 * Finds the button with the given label in the most recent `Alert.alert` call
 * and invokes its `onPress` inside a synchronous `act()`, then yields one
 * macrotask so async continuations (delete → goBack flows) can run. An async
 * `act` would await full React idle, which never arrives for screens whose
 * mocked `useFocusEffect` re-fires their data load on every render.
 */
export async function pressAlertButton(
  alertSpy: jest.SpyInstance,
  label: string
): Promise<void> {
  const calls = alertSpy.mock.calls;
  if (calls.length === 0) {
    throw new Error('Alert.alert was never called');
  }
  const buttons = (calls[calls.length - 1][2] ?? []) as AlertButton[];
  const button = buttons.find(b => b.text === label);
  if (!button) {
    const labels = buttons.map(b => b.text).join(', ');
    throw new Error(
      `No alert button labeled "${label}" (available: ${labels})`
    );
  }
  act(() => {
    button.onPress?.();
  });
  await new Promise(resolve => setTimeout(resolve, 0));
}

let replacedPlatformOS: { restore(): void } | undefined;

/**
 * Overrides `Platform.OS` for the current test (e.g. to exercise the web
 * `window.confirm` branch of delete flows). Call `restorePlatformOS` in
 * `afterEach`.
 */
export function setPlatformOS(os: 'ios' | 'android' | 'web'): void {
  replacedPlatformOS = jest.replaceProperty(Platform, 'OS', os);
}

export function restorePlatformOS(): void {
  replacedPlatformOS?.restore();
  replacedPlatformOS = undefined;
}

interface GlobalWithWindow {
  window?: { confirm?: unknown };
}

let hadWindow = false;
let previousConfirm: unknown;

/**
 * Installs a `window.confirm` mock returning the given result, for the
 * `Platform.OS === 'web'` confirmation branch (the jest environment is node,
 * so `window` may not exist). Call `removeWindowConfirm` in `afterEach`.
 */
export function installWindowConfirm(result: boolean): jest.Mock {
  const g = globalThis as GlobalWithWindow;
  hadWindow = g.window !== undefined;
  if (!g.window) {
    g.window = {};
  }
  previousConfirm = g.window.confirm;
  const confirmMock = jest.fn(() => result);
  g.window.confirm = confirmMock;
  return confirmMock;
}

export function removeWindowConfirm(): void {
  const g = globalThis as GlobalWithWindow;
  if (!g.window) {
    return;
  }
  if (hadWindow) {
    g.window.confirm = previousConfirm;
  } else {
    delete g.window;
  }
}
