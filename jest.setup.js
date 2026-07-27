// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  getAllKeys: jest.fn(),
}));

// Mock expo modules
// NOTE: exportImport.ts, gitIntegration.ts, and discordApi.ts all import
// `expo-file-system/legacy`, not bare `expo-file-system` — mock the specifier
// that's actually used, or the real (native-backed) module loads instead.
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file://mock-document-directory/',
  cacheDirectory: 'file://mock-cache-directory/',
  writeAsStringAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  // Needed by gitIntegration.ts's image-download path (getInfoAsync for the
  // local cache-hit check, makeDirectoryAsync for the images/ tree). Not
  // needed by exportImport.ts today, but harmless there.
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
  copyAsync: jest.fn(),
  EncodingType: { Base64: 'base64', UTF8: 'utf8' },
}));

jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn(),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  MediaTypeOptions: {
    Images: 'Images',
  },
}));

// Mock react-native-zip-archive
jest.mock('react-native-zip-archive', () => ({
  zip: jest.fn(),
  unzip: jest.fn(),
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
  }),
  useFocusEffect: jest.fn(callback => callback()),
  useRoute: () => ({
    params: {},
  }),
  useIsFocused: () => true,
}));

jest.mock('@react-navigation/drawer', () => ({
  ...jest.requireActual('@react-navigation/drawer'),
  DrawerNavigationProp: jest.fn(),
}));

jest.mock('@react-navigation/stack', () => ({
  ...jest.requireActual('@react-navigation/stack'),
  StackNavigationProp: jest.fn(),
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  // Chainable stub matching the `Gesture.Pan()/.onUpdate(cb).onEnd(cb)` API.
  // Every `.on*` call is a jest.fn() that both records the callback (so
  // tests can invoke it directly) and returns the stub for chaining.
  const createGestureStub = () => {
    const stub = {
      callbacks: {},
    };
    ['onStart', 'onUpdate', 'onEnd', 'onFinalize'].forEach(method => {
      stub[method] = jest.fn(cb => {
        stub.callbacks[method] = cb;
        return stub;
      });
    });
    ['numberOfTaps', 'minDuration', 'maxDistance'].forEach(method => {
      stub[method] = jest.fn(() => stub);
    });
    return stub;
  };

  return {
    GestureDetector: ({ children }) => children,
    Gesture: {
      Pan: jest.fn(createGestureStub),
      Pinch: jest.fn(createGestureStub),
      Tap: jest.fn(createGestureStub),
      LongPress: jest.fn(createGestureStub),
      Simultaneous: jest.fn((...gestures) => gestures),
      Exclusive: jest.fn((...gestures) => gestures),
    },
    TouchableOpacity: 'TouchableOpacity',
    ScrollView: 'ScrollView',
    State: {},
    PanGestureHandler: 'PanGestureHandler',
    TouchableWithoutFeedback: 'TouchableWithoutFeedback',
    FlatList: 'FlatList',
  };
});

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => ({
  // Without this, Babel's default-import interop (`import Animated from
  // 'react-native-reanimated'`) sees no `__esModule` marker, assumes this is
  // a plain CJS export, and wraps the *whole* mock object as `Animated`
  // instead of unwrapping to the `default` below — so `Animated.View` is
  // undefined everywhere it's used as a component.
  __esModule: true,
  default: {
    View: 'Animated.View',
    Image: 'Animated.Image',
    createAnimatedComponent: component => component,
  },
  useSharedValue: initial => ({ value: initial }),
  useAnimatedStyle: factory => factory(),
  withTiming: value => value,
  runOnJS:
    fn =>
    (...args) =>
      fn(...args),
  Easing: {
    bezier: () => ({ factory: () => x => x }),
  },
}));

// Global __DEV__ variable for development checks
global.__DEV__ = false;

// Suppress console output in tests (some screens log lifecycle debug info)
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
