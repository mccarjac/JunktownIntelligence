import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/navigation/types';
import { RelationshipStanding } from '@models/types';
import {
  createFaction,
  updateFaction,
  loadFactions,
  FactionRelationship,
} from '@utils/characterStorage';
import { colors as themeColors } from '@/styles/theme';
import { commonStyles } from '@/styles/commonStyles';
import { BaseFormScreen } from '@/components';
import { Picker } from '@react-native-picker/picker';

type FactionFormNavigationProp = StackNavigationProp<
  RootStackParamList,
  'FactionForm'
>;

type FactionFormRouteProp = RouteProp<RootStackParamList, 'FactionForm'>;

interface FactionFormData {
  name: string;
  description: string;
  imageUris?: string[];
  relationships?: FactionRelationship[];
  retired?: boolean;
}

export const FactionFormScreen: React.FC = () => {
  const navigation = useNavigation<FactionFormNavigationProp>();
  const route = useRoute<FactionFormRouteProp>();
  const { factionName } = route.params || {};

  const [formData, setFormData] = useState<FactionFormData>({
    name: '',
    description: '',
    imageUris: [],
    relationships: [],
    retired: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableFactions, setAvailableFactions] = useState<string[]>([]);
  const [showRelationshipModal, setShowRelationshipModal] = useState(false);
  const [selectedFactionForRelationship, setSelectedFactionForRelationship] =
    useState<string>('');
  const [selectedRelationshipType, setSelectedRelationshipType] =
    useState<RelationshipStanding>(RelationshipStanding.Neutral);

  // Load existing faction data and available factions for relationships
  useEffect(() => {
    const loadFactionData = async () => {
      const factions = await loadFactions();

      // Filter out the current faction from available factions for relationships
      const otherFactions = factions
        .filter(f => !f.retired && f.name !== factionName)
        .map(f => f.name);
      setAvailableFactions(otherFactions);

      if (factionName) {
        const faction = factions.find(f => f.name === factionName);
        if (faction) {
          setFormData({
            name: faction.name,
            description: faction.description,
            imageUris: faction.imageUris || [],
            relationships: faction.relationships || [],
            retired: faction.retired ?? false,
          });
        }
      }
    };
    loadFactionData();
  }, [factionName]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Faction name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Faction name must be at least 2 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Sorry, we need camera roll permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      const newImageUri = result.assets[0].uri;
      const currentImages = formData.imageUris || [];
      setFormData({
        ...formData,
        imageUris: [...currentImages, newImageUri],
      });
    }
  };

  const removeImage = (index: number) => {
    const currentImages = formData.imageUris || [];
    const newImages = currentImages.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      imageUris: newImages,
    });
  };

  const handleAddRelationship = () => {
    if (!selectedFactionForRelationship) {
      Alert.alert('Error', 'Please select a faction');
      return;
    }

    // Check if relationship already exists
    const existingRelationshipIndex = (formData.relationships || []).findIndex(
      r => r.factionName === selectedFactionForRelationship
    );

    if (existingRelationshipIndex !== -1) {
      Alert.alert(
        'Relationship Exists',
        `A relationship with ${selectedFactionForRelationship} already exists. Would you like to update it?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Update',
            onPress: () => {
              const updatedRelationships = [...(formData.relationships || [])];
              updatedRelationships[existingRelationshipIndex] = {
                factionName: selectedFactionForRelationship,
                relationshipType: selectedRelationshipType,
              };
              setFormData({
                ...formData,
                relationships: updatedRelationships,
              });
              setSelectedFactionForRelationship('');
              setSelectedRelationshipType(RelationshipStanding.Neutral);
              setShowRelationshipModal(false);
            },
          },
        ]
      );
      return;
    }

    const newRelationship: FactionRelationship = {
      factionName: selectedFactionForRelationship,
      relationshipType: selectedRelationshipType,
    };

    setFormData({
      ...formData,
      relationships: [...(formData.relationships || []), newRelationship],
    });

    // Reset modal state
    setSelectedFactionForRelationship('');
    setSelectedRelationshipType(RelationshipStanding.Neutral);
    setShowRelationshipModal(false);
  };

  const handleRemoveRelationship = (factionName: string) => {
    Alert.alert(
      'Remove Relationship',
      `Remove relationship with ${factionName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setFormData({
              ...formData,
              relationships: (formData.relationships || []).filter(
                r => r.factionName !== factionName
              ),
            });
          },
        },
      ]
    );
  };

  const getStandingStyle = (standing: RelationshipStanding) => {
    switch (standing) {
      case RelationshipStanding.Ally:
        return styles.standingAllied;
      case RelationshipStanding.Friend:
        return styles.standingFriendly;
      case RelationshipStanding.Neutral:
        return styles.standingNeutral;
      case RelationshipStanding.Hostile:
        return styles.standingHostile;
      case RelationshipStanding.Enemy:
        return styles.standingEnemy;
      default:
        return styles.standingNeutral;
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (factionName) {
        // Update existing faction
        const updated = await updateFaction(factionName, {
          name: formData.name.trim(),
          description: formData.description.trim(),
          imageUris: formData.imageUris,
          relationships: formData.relationships || [],
          retired: formData.retired,
        });

        if (updated) {
          Alert.alert('Success', 'Faction updated successfully!', [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]);
        } else {
          Alert.alert(
            'Error',
            'Failed to update faction. The name may already exist.',
            [{ text: 'OK' }]
          );
        }
      } else {
        // Create new faction
        const success = await createFaction({
          name: formData.name.trim(),
          description: formData.description.trim(),
          imageUris: formData.imageUris,
          relationships: formData.relationships || [],
          retired: formData.retired,
        });

        if (success) {
          Alert.alert('Success', 'Faction created successfully!', [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]);
        } else {
          Alert.alert(
            'Error',
            'A faction with this name already exists. Please choose a different name.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch {
      Alert.alert(
        'Error',
        `Failed to ${factionName ? 'update' : 'create'} faction. Please try again.`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Discard Changes',
      'Are you sure you want to discard your changes?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  return (
    <BaseFormScreen>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Faction Information</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            Faction Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.textInput, errors.name && styles.inputError]}
            value={formData.name}
            onChangeText={text => {
              setFormData({ ...formData, name: text });
              if (errors.name) {
                setErrors({ ...errors, name: '' });
              }
            }}
            placeholder="Enter faction name"
            placeholderTextColor={themeColors.text.muted}
            maxLength={50}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Faction Images</Text>
          <View style={styles.imageGalleryContainer}>
            {formData.imageUris && formData.imageUris.length > 0 ? (
              <View style={styles.imageGrid}>
                {formData.imageUris.map((uri, index) => (
                  <View key={index} style={styles.imageItemContainer}>
                    <Image
                      source={{ uri }}
                      style={styles.factionImageThumbnail}
                    />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
                    >
                      <Text style={styles.removeImageButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.placeholderImage}>
                <Text style={styles.placeholderText}>No images selected</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.imagePickerButton}
              onPress={pickImage}
            >
              <Text style={styles.imagePickerButtonText}>
                {formData.imageUris && formData.imageUris.length > 0
                  ? 'Add Another Image'
                  : 'Add Image'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Description</Text>
          <Text style={styles.helperText}>
            Supports Markdown formatting (bold, italic, lists, etc.)
          </Text>
          <TextInput
            style={[styles.textArea]}
            value={formData.description}
            onChangeText={text =>
              setFormData({ ...formData, description: text })
            }
            placeholder={
              'Enter faction description, goals, or background\n\n' +
              '**Markdown** supported - use *italic*, **bold**, lists, etc.'
            }
            placeholderTextColor={themeColors.text.muted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.characterCount}>
            {formData.description.length}/500 characters
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Faction Relationships</Text>
          <Text style={styles.helperText}>
            Define relationships with other factions (allies, enemies, etc.)
          </Text>

          {formData.relationships && formData.relationships.length > 0 ? (
            <View style={styles.relationshipsList}>
              {formData.relationships.map((relationship, index) => (
                <View
                  key={index}
                  style={[
                    styles.relationshipCard,
                    getStandingStyle(relationship.relationshipType),
                  ]}
                >
                  <View style={styles.relationshipCardContent}>
                    <Text style={styles.relationshipFactionName}>
                      {relationship.factionName}
                    </Text>
                    <Text style={styles.relationshipType}>
                      {relationship.relationshipType}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeRelationshipButton}
                    onPress={() =>
                      handleRemoveRelationship(relationship.factionName)
                    }
                  >
                    <Text style={styles.removeRelationshipButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyRelationships}>
              <Text style={styles.emptyRelationshipsText}>
                No relationships defined yet
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.addRelationshipButton}
            onPress={() => setShowRelationshipModal(true)}
          >
            <Text style={styles.addRelationshipButtonText}>
              + Add Relationship
            </Text>
          </TouchableOpacity>
        </View>

        {factionName && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Status</Text>
            <TouchableOpacity
              style={[
                styles.statusButton,
                formData.retired && styles.statusButtonRetired,
              ]}
              onPress={() =>
                setFormData({ ...formData, retired: !formData.retired })
              }
            >
              <Text
                style={[
                  styles.statusButtonText,
                  formData.retired && styles.statusButtonTextRetired,
                ]}
              >
                {formData.retired ? '🔒 Retired' : '✓ Active'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Relationship Modal */}
      <Modal
        visible={showRelationshipModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRelationshipModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Faction Relationship</Text>

            <Text style={styles.modalLabel}>Select Faction</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedFactionForRelationship}
                onValueChange={itemValue =>
                  setSelectedFactionForRelationship(itemValue)
                }
                style={styles.picker}
                dropdownIconColor={themeColors.text.primary}
              >
                <Picker.Item label="Choose a faction..." value="" />
                {availableFactions
                  .filter(
                    faction =>
                      !(formData.relationships || []).some(
                        r => r.factionName === faction
                      )
                  )
                  .map(faction => (
                    <Picker.Item
                      key={faction}
                      label={faction}
                      value={faction}
                    />
                  ))}
              </Picker>
            </View>

            <Text style={styles.modalLabel}>Relationship Type</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedRelationshipType}
                onValueChange={itemValue =>
                  setSelectedRelationshipType(itemValue)
                }
                style={styles.picker}
                dropdownIconColor={themeColors.text.primary}
              >
                {Object.values(RelationshipStanding).map(standing => (
                  <Picker.Item
                    key={standing}
                    label={standing}
                    value={standing}
                  />
                ))}
              </Picker>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowRelationshipModal(false);
                  setSelectedFactionForRelationship('');
                  setSelectedRelationshipType(RelationshipStanding.Neutral);
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalAddButton,
                  !selectedFactionForRelationship && styles.modalButtonDisabled,
                ]}
                onPress={handleAddRelationship}
                disabled={!selectedFactionForRelationship}
              >
                <Text style={styles.modalAddButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={handleCancel}
          disabled={isSubmitting}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.submitButton,
            isSubmitting && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting
              ? factionName
                ? 'Updating...'
                : 'Creating...'
              : factionName
                ? 'Update Faction'
                : 'Create Faction'}
          </Text>
        </TouchableOpacity>
      </View>
    </BaseFormScreen>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    ...commonStyles.text.h1,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    ...commonStyles.text.label,
    marginBottom: 8,
  },
  required: {
    color: themeColors.accent.danger,
  },
  textInput: {
    ...commonStyles.input.base,
    minHeight: 52,
  },
  textArea: {
    ...commonStyles.input.base,
    minHeight: 120,
  },
  inputError: {
    borderColor: themeColors.accent.danger,
  },
  errorText: {
    ...commonStyles.text.danger,
    marginTop: 6,
  },
  helperText: {
    fontSize: 12,
    color: themeColors.accent.info,
    marginBottom: 6,
    fontStyle: 'italic',
  },
  characterCount: {
    fontSize: 12,
    color: themeColors.text.muted,
    textAlign: 'right',
    marginTop: 6,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    backgroundColor: themeColors.primary,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  cancelButton: {
    ...commonStyles.button.secondary,
  },
  submitButton: {
    ...commonStyles.button.primary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.text.primary,
    letterSpacing: 0.2,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.text.primary,
    letterSpacing: 0.2,
  },
  imageGalleryContainer: {
    ...commonStyles.image.container,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  imageItemContainer: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  factionImageThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: themeColors.surface,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: themeColors.status.error,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageButtonText: {
    color: themeColors.text.primary,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  placeholderImage: commonStyles.image.placeholder,
  placeholderText: {
    ...commonStyles.text.body,
    fontWeight: '500',
  },
  imagePickerButton: commonStyles.image.pickerButton,
  imagePickerButtonText: {
    ...commonStyles.button.text,
    textAlign: 'center',
  },
  relationshipsList: {
    gap: 8,
    marginBottom: 12,
  },
  relationshipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  relationshipCardContent: {
    flex: 1,
  },
  relationshipFactionName: {
    fontSize: 15,
    fontWeight: '600',
    color: themeColors.text.primary,
    marginBottom: 4,
  },
  relationshipType: {
    fontSize: 12,
    fontWeight: '500',
    color: themeColors.text.primary,
    opacity: 0.9,
  },
  removeRelationshipButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: themeColors.accent.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  removeRelationshipButtonText: {
    color: themeColors.text.primary,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 20,
  },
  emptyRelationships: {
    padding: 20,
    backgroundColor: themeColors.elevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: themeColors.border,
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyRelationshipsText: {
    fontSize: 14,
    color: themeColors.text.muted,
    fontStyle: 'italic',
  },
  addRelationshipButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: themeColors.accent.primary,
    alignItems: 'center',
  },
  addRelationshipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.text.primary,
  },
  standingAllied: {
    backgroundColor: themeColors.standing.allied,
  },
  standingFriendly: {
    backgroundColor: themeColors.standing.friendly,
  },
  standingNeutral: {
    backgroundColor: themeColors.standing.neutral,
  },
  standingHostile: {
    backgroundColor: themeColors.standing.hostile,
  },
  standingEnemy: {
    backgroundColor: themeColors.standing.enemy,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: themeColors.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: themeColors.text.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.text.primary,
    marginTop: 12,
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: themeColors.elevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: themeColors.border,
    overflow: 'hidden',
  },
  picker: {
    color: themeColors.text.primary,
    height: 50,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: themeColors.elevated,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  modalAddButton: {
    backgroundColor: themeColors.accent.primary,
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.text.primary,
  },
  modalAddButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.text.primary,
  },
  statusButton: {
    ...commonStyles.button.base,
    ...commonStyles.button.success,
  },
  statusButtonRetired: {
    backgroundColor: themeColors.status.error,
    borderColor: themeColors.status.error,
  },
  statusButtonText: commonStyles.button.text,
  statusButtonTextRetired: commonStyles.button.text,
});
