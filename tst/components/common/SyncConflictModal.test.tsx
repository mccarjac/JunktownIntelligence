import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SyncConflictModal } from '@components/common/SyncConflictModal';
import type { SyncConflict } from '@utils/syncMerge';

const editConflict: SyncConflict = {
  collection: 'characters',
  key: 'c1',
  label: 'Alice',
  fields: ['notes'],
  local: { id: 'c1', name: 'Alice', notes: 'my note' },
  remote: { id: 'c1', name: 'Alice', notes: 'their note' },
};

const deletionConflict: SyncConflict = {
  collection: 'locations',
  key: 'l1',
  label: 'Docks',
  fields: ['(deleted remotely)'],
  local: { id: 'l1', name: 'Docks', description: 'edited' },
  remote: null,
};

describe('SyncConflictModal', () => {
  it('renders one row per conflict with the collection label and field values', () => {
    const { getByText } = render(
      <SyncConflictModal
        visible={true}
        conflicts={[editConflict]}
        onResolve={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(getByText('Character: Alice')).toBeTruthy();
    expect(getByText('notes')).toBeTruthy();
    expect(getByText('Mine: my note')).toBeTruthy();
    expect(getByText('Theirs: their note')).toBeTruthy();
  });

  it('describes an edit-vs-delete conflict instead of listing fields', () => {
    const { getByText, queryByText } = render(
      <SyncConflictModal
        visible={true}
        conflicts={[deletionConflict]}
        onResolve={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(
      getByText('You edited this record; it was deleted remotely.')
    ).toBeTruthy();
    expect(queryByText('(deleted remotely)')).toBeNull();
  });

  it('resolves every conflict to local by default when Apply is pressed untouched', () => {
    const onResolve = jest.fn();
    const { getByText } = render(
      <SyncConflictModal
        visible={true}
        conflicts={[editConflict]}
        onResolve={onResolve}
        onCancel={jest.fn()}
      />
    );

    fireEvent.press(getByText('Apply'));

    expect(onResolve).toHaveBeenCalledWith({ 'characters:c1': 'local' });
  });

  it('applies a per-row choice to keep the remote value', () => {
    const onResolve = jest.fn();
    const { getByText, getAllByText } = render(
      <SyncConflictModal
        visible={true}
        conflicts={[editConflict]}
        onResolve={onResolve}
        onCancel={jest.fn()}
      />
    );

    fireEvent.press(getAllByText('Keep Theirs')[0]);
    fireEvent.press(getByText('Apply'));

    expect(onResolve).toHaveBeenCalledWith({ 'characters:c1': 'remote' });
  });

  it('applies "Keep All Theirs" to every conflict', () => {
    const other: SyncConflict = {
      ...editConflict,
      key: 'c2',
      label: 'Bob',
    };
    const onResolve = jest.fn();
    const { getByText } = render(
      <SyncConflictModal
        visible={true}
        conflicts={[editConflict, other]}
        onResolve={onResolve}
        onCancel={jest.fn()}
      />
    );

    fireEvent.press(getByText('Keep All Theirs'));
    fireEvent.press(getByText('Apply'));

    expect(onResolve).toHaveBeenCalledWith({
      'characters:c1': 'remote',
      'characters:c2': 'remote',
    });
  });

  it('calls onCancel without resolving anything', () => {
    const onResolve = jest.fn();
    const onCancel = jest.fn();
    const { getByText } = render(
      <SyncConflictModal
        visible={true}
        conflicts={[editConflict]}
        onResolve={onResolve}
        onCancel={onCancel}
      />
    );

    fireEvent.press(getByText('Cancel'));

    expect(onCancel).toHaveBeenCalled();
    expect(onResolve).not.toHaveBeenCalled();
  });

  it('resets resolutions to local when the conflicts prop changes', () => {
    const onResolve = jest.fn();
    const { getByText, getAllByText, rerender } = render(
      <SyncConflictModal
        visible={true}
        conflicts={[editConflict]}
        onResolve={onResolve}
        onCancel={jest.fn()}
      />
    );

    fireEvent.press(getAllByText('Keep Theirs')[0]);

    const nextConflict: SyncConflict = { ...editConflict, key: 'c2' };
    rerender(
      <SyncConflictModal
        visible={true}
        conflicts={[nextConflict]}
        onResolve={onResolve}
        onCancel={jest.fn()}
      />
    );

    fireEvent.press(getByText('Apply'));

    expect(onResolve).toHaveBeenCalledWith({ 'characters:c2': 'local' });
  });
});
