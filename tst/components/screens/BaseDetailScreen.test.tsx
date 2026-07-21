import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { BaseDetailScreen } from '@/components';
import {
  installNavigationMock,
  resetNavigationMocks,
  getLastHeaderRight,
  NavMock,
} from '../../helpers/navigation';
import {
  spyOnAlert,
  pressAlertButton,
  setPlatformOS,
  restorePlatformOS,
  installWindowConfirm,
  removeWindowConfirm,
} from '../../helpers/alertAndPlatform';

describe('BaseDetailScreen', () => {
  let nav: NavMock;

  beforeEach(() => {
    jest.clearAllMocks();
    nav = installNavigationMock();
  });

  afterEach(() => {
    resetNavigationMocks();
    restorePlatformOS();
    removeWindowConfirm();
    jest.restoreAllMocks();
  });

  const renderHeader = () => render(getLastHeaderRight(nav));

  it('renders its children', () => {
    const { getByText } = render(
      <BaseDetailScreen>
        <Text>Detail Content</Text>
      </BaseDetailScreen>
    );

    expect(getByText('Detail Content')).toBeTruthy();
  });

  it('does not configure a header when no header props are given', () => {
    render(
      <BaseDetailScreen>
        <Text>Detail Content</Text>
      </BaseDetailScreen>
    );

    expect(nav.setOptions).not.toHaveBeenCalled();
  });

  it('prefers a custom headerRight over the edit/delete buttons', () => {
    render(
      <BaseDetailScreen
        headerRight={<Text>Custom Action</Text>}
        onEditPress={jest.fn()}
      >
        <Text>Detail Content</Text>
      </BaseDetailScreen>
    );

    const header = renderHeader();
    expect(header.getByText('Custom Action')).toBeTruthy();
    expect(header.queryByText('Edit')).toBeNull();
  });

  it('renders an Edit header button that calls onEditPress', () => {
    const onEditPress = jest.fn();
    render(
      <BaseDetailScreen onEditPress={onEditPress}>
        <Text>Detail Content</Text>
      </BaseDetailScreen>
    );

    const header = renderHeader();
    fireEvent.press(header.getByText('Edit'));

    expect(onEditPress).toHaveBeenCalled();
  });

  describe('delete flow (native)', () => {
    const makeDeleteConfig = (
      overrides: Partial<{
        itemName: string;
        onDelete: () => Promise<void>;
        confirmTitle: string;
        confirmMessage: string;
      }> = {}
    ) => ({
      itemName: 'Test Item',
      onDelete: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    });

    it('shows a confirmation with default title and message', async () => {
      const alertSpy = spyOnAlert();
      const deleteConfig = makeDeleteConfig();
      render(
        <BaseDetailScreen deleteConfig={deleteConfig}>
          <Text>Detail Content</Text>
        </BaseDetailScreen>
      );

      fireEvent.press(renderHeader().getByText('Delete'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Delete Item',
          'Are you sure you want to delete Test Item? This action cannot be undone.',
          expect.any(Array)
        );
      });
    });

    it('uses the custom confirmation title and message when provided', async () => {
      const alertSpy = spyOnAlert();
      const deleteConfig = makeDeleteConfig({
        confirmTitle: 'Remove Widget',
        confirmMessage: 'Really remove this widget?',
      });
      render(
        <BaseDetailScreen deleteConfig={deleteConfig}>
          <Text>Detail Content</Text>
        </BaseDetailScreen>
      );

      fireEvent.press(renderHeader().getByText('Delete'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Remove Widget',
          'Really remove this widget?',
          expect.any(Array)
        );
      });
    });

    it('does nothing when the confirmation is cancelled', async () => {
      const alertSpy = spyOnAlert();
      const deleteConfig = makeDeleteConfig();
      render(
        <BaseDetailScreen deleteConfig={deleteConfig}>
          <Text>Detail Content</Text>
        </BaseDetailScreen>
      );

      fireEvent.press(renderHeader().getByText('Delete'));
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalled();
      });
      await pressAlertButton(alertSpy, 'Cancel');

      expect(deleteConfig.onDelete).not.toHaveBeenCalled();
      expect(nav.goBack).not.toHaveBeenCalled();
    });

    it('runs onDelete and navigates back when confirmed', async () => {
      const alertSpy = spyOnAlert();
      const deleteConfig = makeDeleteConfig();
      render(
        <BaseDetailScreen deleteConfig={deleteConfig}>
          <Text>Detail Content</Text>
        </BaseDetailScreen>
      );

      fireEvent.press(renderHeader().getByText('Delete'));
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalled();
      });
      await pressAlertButton(alertSpy, 'Delete');

      await waitFor(() => {
        expect(deleteConfig.onDelete).toHaveBeenCalled();
        expect(nav.goBack).toHaveBeenCalled();
      });
    });
  });

  describe('delete flow (web)', () => {
    it('deletes via window.confirm when accepted', async () => {
      setPlatformOS('web');
      const confirmMock = installWindowConfirm(true);
      const onDelete = jest.fn().mockResolvedValue(undefined);
      render(
        <BaseDetailScreen deleteConfig={{ itemName: 'Test Item', onDelete }}>
          <Text>Detail Content</Text>
        </BaseDetailScreen>
      );

      fireEvent.press(renderHeader().getByText('Delete'));

      await waitFor(() => {
        expect(confirmMock).toHaveBeenCalledWith(
          'Are you sure you want to delete Test Item? This action cannot be undone.'
        );
        expect(onDelete).toHaveBeenCalled();
        expect(nav.goBack).toHaveBeenCalled();
      });
    });

    it('does nothing when window.confirm is declined', async () => {
      setPlatformOS('web');
      const confirmMock = installWindowConfirm(false);
      const onDelete = jest.fn().mockResolvedValue(undefined);
      render(
        <BaseDetailScreen deleteConfig={{ itemName: 'Test Item', onDelete }}>
          <Text>Detail Content</Text>
        </BaseDetailScreen>
      );

      fireEvent.press(renderHeader().getByText('Delete'));

      await waitFor(() => {
        expect(confirmMock).toHaveBeenCalled();
      });
      expect(onDelete).not.toHaveBeenCalled();
      expect(nav.goBack).not.toHaveBeenCalled();
    });
  });
});
