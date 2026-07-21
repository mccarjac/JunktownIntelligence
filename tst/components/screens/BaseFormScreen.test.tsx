import React from 'react';
import { render } from '@testing-library/react-native';
import { Text, KeyboardAvoidingView } from 'react-native';
import { BaseFormScreen } from '@/components';

describe('BaseFormScreen', () => {
  it('renders its children', () => {
    const { getByText } = render(
      <BaseFormScreen>
        <Text>Form Content</Text>
      </BaseFormScreen>
    );

    expect(getByText('Form Content')).toBeTruthy();
  });

  it('wraps content in a KeyboardAvoidingView by default', () => {
    const { UNSAFE_getByType } = render(
      <BaseFormScreen>
        <Text>Form Content</Text>
      </BaseFormScreen>
    );

    expect(UNSAFE_getByType(KeyboardAvoidingView)).toBeTruthy();
  });

  it('omits the KeyboardAvoidingView when keyboard avoidance is disabled', () => {
    const { UNSAFE_queryByType, getByText } = render(
      <BaseFormScreen enableKeyboardAvoidance={false}>
        <Text>Form Content</Text>
      </BaseFormScreen>
    );

    expect(UNSAFE_queryByType(KeyboardAvoidingView)).toBeNull();
    expect(getByText('Form Content')).toBeTruthy();
  });

  it('passes scrollViewProps through to the ScrollView', () => {
    const { getByTestId } = render(
      <BaseFormScreen scrollViewProps={{ testID: 'form-scroll' }}>
        <Text>Form Content</Text>
      </BaseFormScreen>
    );

    expect(getByTestId('form-scroll')).toBeTruthy();
  });
});
