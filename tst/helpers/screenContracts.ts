import { render, waitFor, fireEvent } from '@testing-library/react-native';
import {
  installNavigationMock,
  installRouteParams,
  resetNavigationMocks,
  getLastHeaderRight,
  NavMock,
} from './navigation';
import { spyOnAlert, pressAlertButton } from './alertAndPlatform';
import { primeStorageDefaults } from './storage';

/**
 * Reusable behavior suites ("contracts") for screens built on the
 * `Base{List,Form,Detail}Screen` templates. Each generator registers a
 * `describe` block with the tests every screen of that shape must pass, so a
 * concrete screen's test file reduces to a config object plus any
 * screen-specific extras.
 *
 * Requirements for callers:
 * - the test file must call `jest.mock('@utils/characterStorage')` (plus mocks
 *   for any other storage modules the screen imports),
 * - per-test data is primed through the `prime*` callbacks using
 *   `getStorageMock()` from `./storage` and the factories from `./factories`.
 */

type RenderResult = ReturnType<typeof render>;

export interface ListScreenContractConfig {
  name: string;
  renderScreen: () => RenderResult;
  emptyStateTitle: string;
  searchPlaceholder: string;
  /** Mock functions the screen must call to load its data on mount. */
  loadFns: () => unknown[];
  /** Primes storage so the screen renders `populatedTexts`. */
  primePopulated: () => void;
  populatedTexts: string[];
  /** Extra priming applied in every test (both empty and populated). */
  prime?: () => void;
}

export function describeListScreenContract(
  config: ListScreenContractConfig
): void {
  describe(`${config.name} — list screen contract`, () => {
    beforeEach(() => {
      jest.clearAllMocks();
      primeStorageDefaults();
      config.prime?.();
    });

    it('renders the empty state when there is no data', async () => {
      const { getByText } = config.renderScreen();

      await waitFor(() => {
        expect(getByText(config.emptyStateTitle)).toBeTruthy();
      });
    });

    it('calls its data loaders on mount', async () => {
      config.renderScreen();

      await waitFor(() => {
        config.loadFns().forEach(loadFn => {
          expect(loadFn).toHaveBeenCalled();
        });
      });
    });

    it('shows the search input', async () => {
      const { getByPlaceholderText } = config.renderScreen();

      await waitFor(() => {
        expect(getByPlaceholderText(config.searchPlaceholder)).toBeTruthy();
      });
    });

    it('renders loaded items', async () => {
      config.primePopulated();

      const { getByText } = config.renderScreen();

      await waitFor(() => {
        config.populatedTexts.forEach(text => {
          expect(getByText(text)).toBeTruthy();
        });
      });
    });
  });
}

export interface DetailScreenContractConfig {
  name: string;
  renderScreen: () => RenderResult;
  routeParams?: Record<string, unknown>;
  /** Per-test priming beyond `primeStorageDefaults()`. */
  prime?: () => void;
  /** Texts (or patterns) that must appear once the screen has loaded. */
  expectedContent: Array<string | RegExp>;
  /** Expected `navigation.navigate` target of the header Edit button. */
  edit?: { expectedScreen: string; expectedParams: unknown };
  /** Delete flow driven by the header Delete button (native Alert path). */
  del?: { deleteFn: () => unknown; primeDelete?: () => void };
}

export function describeDetailScreenContract(
  config: DetailScreenContractConfig
): void {
  describe(`${config.name} — detail screen contract`, () => {
    let nav: NavMock;
    let alertSpy: jest.SpyInstance;

    beforeEach(() => {
      jest.clearAllMocks();
      primeStorageDefaults();
      nav = installNavigationMock();
      installRouteParams(config.routeParams ?? {});
      alertSpy = spyOnAlert();
      config.prime?.();
    });

    afterEach(() => {
      resetNavigationMocks();
      jest.restoreAllMocks();
    });

    const renderHeaderButtons = async (): Promise<RenderResult> => {
      config.renderScreen();
      await waitFor(() => {
        expect(nav.setOptions).toHaveBeenCalled();
      });
      return render(getLastHeaderRight(nav));
    };

    it('renders the screen content', async () => {
      const { getByText } = config.renderScreen();

      await waitFor(() => {
        config.expectedContent.forEach(content => {
          expect(getByText(content)).toBeTruthy();
        });
      });
    });

    it('configures header actions via navigation.setOptions', async () => {
      const header = await renderHeaderButtons();

      if (config.edit) {
        expect(header.getByText('Edit')).toBeTruthy();
      }
      if (config.del) {
        expect(header.getByText('Delete')).toBeTruthy();
      }
    });

    if (config.edit) {
      const edit = config.edit;
      it('navigates to the edit screen from the header Edit button', async () => {
        const header = await renderHeaderButtons();

        fireEvent.press(header.getByText('Edit'));

        expect(nav.navigate).toHaveBeenCalledWith(
          edit.expectedScreen,
          edit.expectedParams
        );
      });
    }

    if (config.del) {
      const del = config.del;

      it('does not delete when the confirmation is cancelled', async () => {
        del.primeDelete?.();
        const header = await renderHeaderButtons();

        fireEvent.press(header.getByText('Delete'));

        await waitFor(() => {
          expect(alertSpy).toHaveBeenCalled();
        });
        await pressAlertButton(alertSpy, 'Cancel');

        expect(del.deleteFn()).not.toHaveBeenCalled();
        expect(nav.goBack).not.toHaveBeenCalled();
      });

      it('deletes and navigates back when the confirmation is accepted', async () => {
        del.primeDelete?.();
        const header = await renderHeaderButtons();

        fireEvent.press(header.getByText('Delete'));

        await waitFor(() => {
          expect(alertSpy).toHaveBeenCalled();
        });
        await pressAlertButton(alertSpy, 'Delete');

        await waitFor(() => {
          expect(del.deleteFn()).toHaveBeenCalled();
          expect(nav.goBack).toHaveBeenCalled();
        });
      });
    }
  });
}

export interface FormScreenContractConfig {
  name: string;
  renderScreen: () => RenderResult;
  requiredFieldPlaceholder: string;
  requiredFieldValue: string;
  validationErrorText: string;
  submitLabels: { create: string; update: string };
  createFn: () => unknown;
  updateFn: () => unknown;
  /** Primes the create call to succeed (e.g. `createFn.mockResolvedValue(...)`). */
  primeCreate: () => void;
  edit?: {
    routeParams: Record<string, unknown>;
    /** Primes existing data + a successful update call. */
    prime: () => void;
    /** Expected display value of the required field once prefilled. */
    prefilledValue: string;
  };
}

export function describeFormScreenContract(
  config: FormScreenContractConfig
): void {
  describe(`${config.name} — form screen contract`, () => {
    let nav: NavMock;
    let alertSpy: jest.SpyInstance;

    beforeEach(() => {
      jest.clearAllMocks();
      primeStorageDefaults();
      nav = installNavigationMock();
      installRouteParams({});
      alertSpy = spyOnAlert();
    });

    afterEach(() => {
      resetNavigationMocks();
      jest.restoreAllMocks();
    });

    it('shows the create action when no item is being edited', async () => {
      const { getByText } = config.renderScreen();

      await waitFor(() => {
        expect(getByText(config.submitLabels.create)).toBeTruthy();
      });
    });

    it('shows a validation error instead of submitting an empty form', async () => {
      const { getByText } = config.renderScreen();

      await waitFor(() => {
        expect(getByText(config.submitLabels.create)).toBeTruthy();
      });
      fireEvent.press(getByText(config.submitLabels.create));

      await waitFor(() => {
        expect(getByText(config.validationErrorText)).toBeTruthy();
      });
      expect(config.createFn()).not.toHaveBeenCalled();
    });

    it('creates the item and navigates back on success', async () => {
      config.primeCreate();

      const { getByText, getByPlaceholderText } = config.renderScreen();

      await waitFor(() => {
        expect(getByText(config.submitLabels.create)).toBeTruthy();
      });
      fireEvent.changeText(
        getByPlaceholderText(config.requiredFieldPlaceholder),
        config.requiredFieldValue
      );
      fireEvent.press(getByText(config.submitLabels.create));

      await waitFor(() => {
        expect(config.createFn()).toHaveBeenCalled();
        expect(alertSpy).toHaveBeenCalledWith(
          'Success',
          expect.any(String),
          expect.any(Array)
        );
      });
      await pressAlertButton(alertSpy, 'OK');

      expect(nav.goBack).toHaveBeenCalled();
    });

    if (config.edit) {
      const edit = config.edit;

      it('prefills existing data and updates instead of creating', async () => {
        installRouteParams(edit.routeParams);
        edit.prime();

        const { getByText, getByDisplayValue } = config.renderScreen();

        await waitFor(() => {
          expect(getByDisplayValue(edit.prefilledValue)).toBeTruthy();
          expect(getByText(config.submitLabels.update)).toBeTruthy();
        });
        fireEvent.press(getByText(config.submitLabels.update));

        await waitFor(() => {
          expect(config.updateFn()).toHaveBeenCalled();
          expect(alertSpy).toHaveBeenCalledWith(
            'Success',
            expect.any(String),
            expect.any(Array)
          );
        });
        expect(config.createFn()).not.toHaveBeenCalled();

        await pressAlertButton(alertSpy, 'OK');
        expect(nav.goBack).toHaveBeenCalled();
      });
    }
  });
}
