import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/navigation/types';
import {
  createEvent,
  updateEvent,
  loadCharacters,
  loadLocations,
  loadFactions,
  loadQuests,
} from '@utils/characterStorage';
import { colors as themeColors } from '@/styles/theme';
import { Picker } from '@react-native-picker/picker';
import {
  GameCharacter,
  GameLocation,
  GameQuest,
  CertaintyLevel,
} from '@models/types';
import { BaseFormScreen } from '@/components';

type EventsFormNavigationProp = StackNavigationProp<
  RootStackParamList,
  'EventsForm'
>;

type EventsFormRouteProp = RouteProp<RootStackParamList, 'EventsForm'>;

interface EventFormData {
  title: string;
  description: string;
  date: string;
  time: string;
  locationId: string;
  characterIds: string[];
  factionNames: string[];
  questIds: string[];
  notes: string;
  imageUri?: string;
  imageUris?: string[];
  certaintyLevel: CertaintyLevel;
}

export const EventsFormScreen: React.FC = () => {
  const navigation = useNavigation<EventsFormNavigationProp>();
  const route = useRoute<EventsFormRouteProp>();
  const { event } = route.params || {};

  // Calculate default date (30 years in the future)
  const getDefaultDate = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 30);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  };

  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    date: getDefaultDate(),
    time: '12:00',
    locationId: '',
    characterIds: [],
    factionNames: [],
    questIds: [],
    notes: '',
    imageUri: undefined,
    imageUris: [],
    certaintyLevel: 'confirmed',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [characters, setCharacters] = useState<GameCharacter[]>([]);
  const [locations, setLocations] = useState<GameLocation[]>([]);
  const [factions, setFactions] = useState<string[]>([]);
  const [quests, setQuests] = useState<GameQuest[]>([]);

  // Load characters, locations, factions, and quests
  useEffect(() => {
    const loadData = async () => {
      const [loadedCharacters, loadedLocations, loadedFactions, loadedQuests] =
        await Promise.all([
          loadCharacters(),
          loadLocations(),
          loadFactions(),
          loadQuests(),
        ]);
      setCharacters(
        loadedCharacters.sort((a, b) => a.name.localeCompare(b.name))
      );
      setLocations(
        loadedLocations.sort((a, b) => a.name.localeCompare(b.name))
      );
      // Exclude retired factions from events
      setFactions(
        loadedFactions
          .filter(f => !f.retired)
          .map(f => f.name)
          .sort()
      );
      setQuests(loadedQuests.sort((a, b) => a.name.localeCompare(b.name)));
    };
    loadData();
  }, []);

  // Load existing event data if editing
  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        description: event.description || '',
        date: event.date,
        time: event.time || '',
        locationId: event.locationId || '',
        characterIds: event.characterIds || [],
        factionNames: event.factionNames || [],
        questIds: event.questIds || [],
        notes: event.notes || '',
        imageUri: event.imageUri,
        imageUris: event.imageUris || (event.imageUri ? [event.imageUri] : []),
        certaintyLevel: event.certaintyLevel || 'confirmed',
      });
    }
  }, [event]);

  const pickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        'Permission Required',
        'Permission to access camera roll is required!',
        [{ text: 'OK' }]
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const newImageUri = result.assets[0].uri;
      const currentImages = formData.imageUris || [];
      const newImages = [...currentImages, newImageUri];
      setFormData({
        ...formData,
        imageUris: newImages,
        imageUri: newImages[0], // Keep first image for backward compatibility
      });
    }
  };

  const removeImage = (index: number) => {
    const currentImages = formData.imageUris || [];
    const newImages = currentImages.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      imageUris: newImages,
      imageUri: newImages.length > 0 ? newImages[0] : undefined,
    });
  };

  const addCharacter = (characterId: string) => {
    if (characterId && !formData.characterIds.includes(characterId)) {
      setFormData({
        ...formData,
        characterIds: [...formData.characterIds, characterId],
      });
    }
  };

  const removeCharacter = (characterId: string) => {
    setFormData({
      ...formData,
      characterIds: formData.characterIds.filter(id => id !== characterId),
    });
  };

  const addFaction = (factionName: string) => {
    if (factionName && !formData.factionNames.includes(factionName)) {
      setFormData({
        ...formData,
        factionNames: [...formData.factionNames, factionName],
      });
    }
  };

  const removeFaction = (faction: string) => {
    setFormData({
      ...formData,
      factionNames: formData.factionNames.filter(f => f !== faction),
    });
  };

  const addQuest = (questId: string) => {
    if (questId && !formData.questIds.includes(questId)) {
      setFormData({
        ...formData,
        questIds: [...formData.questIds, questId],
      });
    }
  };

  const removeQuest = (questId: string) => {
    setFormData({
      ...formData,
      questIds: formData.questIds.filter(id => id !== questId),
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (event) {
        // Update existing event
        await updateEvent(event.id, formData);
        Alert.alert('Success', 'Event updated successfully', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        // Create new event
        await createEvent(formData);
        Alert.alert('Success', 'Event created successfully', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      }
    } catch {
      Alert.alert('Error', 'Failed to save event. Please try again.', [
        { text: 'OK' },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseFormScreen contentContainerStyle={styles.content}>
      {/* Title */}
      <View style={styles.section}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={[styles.input, errors.title && styles.inputError]}
          placeholder="Event title"
          placeholderTextColor={themeColors.text.muted}
          value={formData.title}
          onChangeText={title => setFormData({ ...formData, title })}
        />
        {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Event description"
          placeholderTextColor={themeColors.text.muted}
          value={formData.description}
          onChangeText={description =>
            setFormData({ ...formData, description })
          }
          multiline
          numberOfLines={4}
        />
      </View>

      {/* Date and Time */}
      <View style={styles.section}>
        <Text style={styles.label}>Date *</Text>
        <TextInput
          style={[styles.input, errors.date && styles.inputError]}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={themeColors.text.muted}
          value={formData.date}
          onChangeText={date => setFormData({ ...formData, date })}
        />
        {errors.date && <Text style={styles.errorText}>{errors.date}</Text>}

        <Text style={[styles.label, styles.labelMargin]}>Time *</Text>
        <TextInput
          style={styles.input}
          placeholder="HH:MM (e.g., 14:30)"
          placeholderTextColor={themeColors.text.muted}
          value={formData.time}
          onChangeText={time => setFormData({ ...formData, time })}
        />
      </View>

      {/* Certainty Level */}
      <View style={styles.section}>
        <Text style={styles.label}>Certainty Level</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formData.certaintyLevel}
            onValueChange={certaintyLevel =>
              setFormData({ ...formData, certaintyLevel })
            }
            style={styles.picker}
            dropdownIconColor={themeColors.text.secondary}
          >
            <Picker.Item label="Confirmed" value="confirmed" />
            <Picker.Item label="Unconfirmed" value="unconfirmed" />
            <Picker.Item label="Disputed" value="disputed" />
          </Picker>
        </View>
      </View>

      {/* Location */}
      <View style={styles.section}>
        <Text style={styles.label}>Location</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formData.locationId}
            onValueChange={locationId =>
              setFormData({ ...formData, locationId })
            }
            style={styles.picker}
            dropdownIconColor={themeColors.text.secondary}
          >
            <Picker.Item label="Select location..." value="" />
            {locations.map(location => (
              <Picker.Item
                key={location.id}
                label={location.name}
                value={location.id}
              />
            ))}
          </Picker>
        </View>
      </View>

      {/* Characters */}
      <View style={styles.section}>
        <Text style={styles.label}>Characters Involved</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue=""
            onValueChange={addCharacter}
            style={styles.picker}
            dropdownIconColor={themeColors.text.secondary}
          >
            <Picker.Item label="Select character to add..." value="" />
            {characters
              .filter(c => !formData.characterIds.includes(c.id))
              .map(character => (
                <Picker.Item
                  key={character.id}
                  label={character.name}
                  value={character.id}
                />
              ))}
          </Picker>
        </View>
        <View style={styles.selectedList}>
          {formData.characterIds.map(characterId => {
            const character = characters.find(c => c.id === characterId);
            return character ? (
              <View key={characterId} style={styles.selectedChip}>
                <Text style={styles.selectedChipText}>{character.name}</Text>
                <TouchableOpacity onPress={() => removeCharacter(characterId)}>
                  <Text style={styles.removeButton}>×</Text>
                </TouchableOpacity>
              </View>
            ) : null;
          })}
        </View>
      </View>

      {/* Factions */}
      <View style={styles.section}>
        <Text style={styles.label}>Factions Involved</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue=""
            onValueChange={addFaction}
            style={styles.picker}
            dropdownIconColor={themeColors.text.secondary}
          >
            <Picker.Item label="Select faction to add..." value="" />
            {factions
              .filter(f => !formData.factionNames.includes(f))
              .map(faction => (
                <Picker.Item key={faction} label={faction} value={faction} />
              ))}
          </Picker>
        </View>
        <View style={styles.selectedList}>
          {formData.factionNames.map((faction, index) => (
            <View key={index} style={styles.selectedChip}>
              <Text style={styles.selectedChipText}>{faction}</Text>
              <TouchableOpacity onPress={() => removeFaction(faction)}>
                <Text style={styles.removeButton}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>

      {/* Quests */}
      <View style={styles.section}>
        <Text style={styles.label}>Related Quests</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue=""
            onValueChange={addQuest}
            style={styles.picker}
            dropdownIconColor={themeColors.text.secondary}
          >
            <Picker.Item label="Select quest to add..." value="" />
            {quests
              .filter(q => !formData.questIds.includes(q.id))
              .map(quest => (
                <Picker.Item
                  key={quest.id}
                  label={quest.name}
                  value={quest.id}
                />
              ))}
          </Picker>
        </View>
        <View style={styles.selectedList}>
          {formData.questIds.map(questId => {
            const quest = quests.find(q => q.id === questId);
            return (
              <View key={questId} style={styles.selectedChip}>
                <Text style={styles.selectedChipText}>
                  {quest?.name ?? 'Unknown'}
                </Text>
                <TouchableOpacity onPress={() => removeQuest(questId)}>
                  <Text style={styles.removeButton}>×</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Additional notes about the event"
          placeholderTextColor={themeColors.text.muted}
          value={formData.notes}
          onChangeText={notes => setFormData({ ...formData, notes })}
          multiline
          numberOfLines={4}
        />
      </View>

      {/* Images */}
      <View style={styles.section}>
        <Text style={styles.label}>Event Photos</Text>
        {formData.imageUris && formData.imageUris.length > 0 ? (
          <View style={styles.imageGalleryContainer}>
            <View style={styles.imageGrid}>
              {formData.imageUris.map((uri, index) => (
                <View key={index} style={styles.imageItemContainer}>
                  <Image source={{ uri }} style={styles.imageThumbnail} />
                  <TouchableOpacity
                    style={styles.removeImageIconButton}
                    onPress={() => removeImage(index)}
                  >
                    <Text style={styles.removeImageIconText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
              <Text style={styles.addImageButtonText}>Add Another Photo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
            <Text style={styles.uploadButtonText}>Choose Photo</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[
          styles.submitButton,
          isSubmitting && styles.submitButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        <Text style={styles.submitButtonText}>
          {isSubmitting ? 'Saving...' : event ? 'Update Event' : 'Create Event'}
        </Text>
      </TouchableOpacity>

      <View style={styles.footer} />
    </BaseFormScreen>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.text.primary,
    marginBottom: 8,
  },
  labelMargin: {
    marginTop: 16,
  },
  input: {
    backgroundColor: themeColors.elevated,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 8,
    padding: 12,
    color: themeColors.text.primary,
    fontSize: 16,
  },
  inputError: {
    borderColor: themeColors.accent.danger,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    color: themeColors.accent.danger,
    fontSize: 12,
    marginTop: 4,
  },
  pickerContainer: {
    backgroundColor: themeColors.elevated,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    color: themeColors.text.primary,
  },
  selectedList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 8,
    backgroundColor: themeColors.accent.secondary,
    borderRadius: 16,
    gap: 6,
  },
  selectedChipText: {
    fontSize: 14,
    color: themeColors.text.primary,
  },
  removeButton: {
    fontSize: 20,
    color: themeColors.text.primary,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  imageGalleryContainer: {
    gap: 12,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imageItemContainer: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  imageThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: themeColors.elevated,
  },
  uploadButton: {
    backgroundColor: themeColors.elevated,
    borderWidth: 2,
    borderColor: themeColors.border,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
  },
  uploadButtonText: {
    fontSize: 16,
    color: themeColors.text.secondary,
    fontWeight: '600',
  },
  addImageButton: {
    backgroundColor: themeColors.elevated,
    borderWidth: 2,
    borderColor: themeColors.border,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  addImageButtonText: {
    fontSize: 14,
    color: themeColors.text.secondary,
    fontWeight: '600',
  },
  removeImageIconButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: themeColors.accent.danger,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageIconText: {
    color: themeColors.text.primary,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: themeColors.accent.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: themeColors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    height: 50,
  },
});
