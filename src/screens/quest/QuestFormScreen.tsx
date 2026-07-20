import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/navigation/types';
import {
  createQuest,
  updateQuest,
  loadCharacters,
  loadLocations,
  loadFactions,
  loadEvents,
} from '@utils/characterStorage';
import { colors as themeColors } from '@/styles/theme';
import { commonStyles } from '@/styles/commonStyles';
import { Picker } from '@react-native-picker/picker';
import {
  GameCharacter,
  GameLocation,
  GameEvent,
  QuestStatus,
  QuestMaterial,
  PerkId,
  DistinctionId,
} from '@models/types';
import {
  PerkTag,
  AVAILABLE_PERKS,
  AVAILABLE_DISTINCTIONS,
} from '@models/gameData';
import { SPECIES_BASE_STATS, Species } from '@models/speciesTypes';
import { BaseFormScreen, CollapsibleSection } from '@/components';

type QuestsFormNavigationProp = StackNavigationProp<
  RootStackParamList,
  'QuestsForm'
>;

type QuestsFormRouteProp = RouteProp<RootStackParamList, 'QuestsForm'>;

const STATUS_LABELS: Record<QuestStatus, string> = {
  [QuestStatus.NotStarted]: 'Not Started',
  [QuestStatus.Assigned]: 'Assigned',
  [QuestStatus.InProgress]: 'In Progress',
  [QuestStatus.Successful]: 'Successful',
  [QuestStatus.Failure]: 'Failure',
};

interface PreferenceLists {
  tags: PerkTag[];
  species: Species[];
  distinctionIds: DistinctionId[];
  perkIds: PerkId[];
}

const emptyPreferenceLists = (): PreferenceLists => ({
  tags: [],
  species: [],
  distinctionIds: [],
  perkIds: [],
});

interface QuestFormData {
  name: string;
  details: string;
  date: string;
  time: string;
  status: QuestStatus;
  assignedCharacterIds: string[];
  desirable: PreferenceLists;
  undesirable: PreferenceLists;
  locationId: string;
  factionNames: string[];
  eventIds: string[];
  junktownOffice: string;
  requiredMaterials: QuestMaterial[];
  teamSize: string;
  notes: string;
}

const emptyFormData = (): QuestFormData => ({
  name: '',
  details: '',
  date: '',
  time: '',
  status: QuestStatus.NotStarted,
  assignedCharacterIds: [],
  desirable: emptyPreferenceLists(),
  undesirable: emptyPreferenceLists(),
  locationId: '',
  factionNames: [],
  eventIds: [],
  junktownOffice: '',
  requiredMaterials: [],
  teamSize: '',
  notes: '',
});

interface Option<T extends string> {
  value: T;
  label: string;
}

interface MultiSelectFieldProps<T extends string> {
  label: string;
  placeholder: string;
  options: Option<T>[];
  selected: T[];
  onAdd: (value: T) => void;
  onRemove: (value: T) => void;
}

function MultiSelectField<T extends string>({
  label,
  placeholder,
  options,
  selected,
  onAdd,
  onRemove,
}: MultiSelectFieldProps<T>) {
  const availableOptions = options.filter(
    option => !selected.includes(option.value)
  );

  return (
    <View style={styles.subField}>
      <Text style={styles.sublabel}>{label}</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue=""
          onValueChange={(value: string) => {
            if (value) onAdd(value as T);
          }}
          style={styles.picker}
          dropdownIconColor={themeColors.text.secondary}
        >
          <Picker.Item label={placeholder} value="" />
          {availableOptions.map(option => (
            <Picker.Item
              key={option.value}
              label={option.label}
              value={option.value}
            />
          ))}
        </Picker>
      </View>
      {selected.length > 0 && (
        <View style={styles.selectedList}>
          {selected.map(value => {
            const option = options.find(o => o.value === value);
            return (
              <View key={value} style={styles.selectedChip}>
                <Text style={styles.selectedChipText}>
                  {option?.label ?? value}
                </Text>
                <TouchableOpacity onPress={() => onRemove(value)}>
                  <Text style={styles.removeButton}>×</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const TAG_OPTIONS: Option<PerkTag>[] = Object.values(PerkTag).map(tag => ({
  value: tag,
  label: tag,
}));

const SPECIES_OPTIONS: Option<Species>[] = Object.keys(SPECIES_BASE_STATS).map(
  species => ({
    value: species as Species,
    label: species,
  })
);

const PERK_OPTIONS: Option<PerkId>[] = AVAILABLE_PERKS.map(perk => ({
  value: perk.id as PerkId,
  label: `${perk.name} (${perk.tag})`,
}));

const DISTINCTION_OPTIONS: Option<DistinctionId>[] = AVAILABLE_DISTINCTIONS.map(
  distinction => ({
    value: distinction.id as DistinctionId,
    label: distinction.name,
  })
);

export const QuestFormScreen: React.FC = () => {
  const navigation = useNavigation<QuestsFormNavigationProp>();
  const route = useRoute<QuestsFormRouteProp>();
  const { quest } = route.params || {};

  const [formData, setFormData] = useState<QuestFormData>(emptyFormData());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [characters, setCharacters] = useState<GameCharacter[]>([]);
  const [locations, setLocations] = useState<GameLocation[]>([]);
  const [factions, setFactions] = useState<string[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const [loadedCharacters, loadedLocations, loadedFactions, loadedEvents] =
        await Promise.all([
          loadCharacters(),
          loadLocations(),
          loadFactions(),
          loadEvents(),
        ]);
      setCharacters(
        loadedCharacters.sort((a, b) => a.name.localeCompare(b.name))
      );
      setLocations(
        loadedLocations.sort((a, b) => a.name.localeCompare(b.name))
      );
      setFactions(
        loadedFactions
          .filter(f => !f.retired)
          .map(f => f.name)
          .sort()
      );
      setEvents(
        [...loadedEvents].sort((a, b) => a.title.localeCompare(b.title))
      );
    };
    loadData();
  }, []);

  useEffect(() => {
    if (quest) {
      setFormData({
        name: quest.name,
        details: quest.details || '',
        date: quest.date || '',
        time: quest.time || '',
        status: quest.status,
        assignedCharacterIds: quest.assignedCharacterIds || [],
        desirable: {
          tags: quest.desirable?.tags || [],
          species: quest.desirable?.species || [],
          distinctionIds: quest.desirable?.distinctionIds || [],
          perkIds: quest.desirable?.perkIds || [],
        },
        undesirable: {
          tags: quest.undesirable?.tags || [],
          species: quest.undesirable?.species || [],
          distinctionIds: quest.undesirable?.distinctionIds || [],
          perkIds: quest.undesirable?.perkIds || [],
        },
        locationId: quest.locationId || '',
        factionNames: quest.factionNames || [],
        eventIds: quest.eventIds || [],
        junktownOffice: quest.junktownOffice || '',
        requiredMaterials: quest.requiredMaterials || [],
        teamSize: quest.teamSize !== undefined ? String(quest.teamSize) : '',
        notes: quest.notes || '',
      });
    }
  }, [quest]);

  const addCharacter = (characterId: string) => {
    if (!formData.assignedCharacterIds.includes(characterId)) {
      setFormData({
        ...formData,
        assignedCharacterIds: [...formData.assignedCharacterIds, characterId],
      });
    }
  };

  const removeCharacter = (characterId: string) => {
    setFormData({
      ...formData,
      assignedCharacterIds: formData.assignedCharacterIds.filter(
        id => id !== characterId
      ),
    });
  };

  const addFaction = (factionName: string) => {
    if (!formData.factionNames.includes(factionName)) {
      setFormData({
        ...formData,
        factionNames: [...formData.factionNames, factionName],
      });
    }
  };

  const removeFaction = (factionName: string) => {
    setFormData({
      ...formData,
      factionNames: formData.factionNames.filter(f => f !== factionName),
    });
  };

  const addEvent = (eventId: string) => {
    if (!formData.eventIds.includes(eventId)) {
      setFormData({ ...formData, eventIds: [...formData.eventIds, eventId] });
    }
  };

  const removeEvent = (eventId: string) => {
    setFormData({
      ...formData,
      eventIds: formData.eventIds.filter(id => id !== eventId),
    });
  };

  const updatePreferenceList = <K extends keyof PreferenceLists>(
    which: 'desirable' | 'undesirable',
    key: K,
    updater: (list: PreferenceLists[K]) => PreferenceLists[K]
  ): void => {
    setFormData(prev => ({
      ...prev,
      [which]: {
        ...prev[which],
        [key]: updater(prev[which][key]),
      },
    }));
  };

  const addPreference = <K extends keyof PreferenceLists>(
    which: 'desirable' | 'undesirable',
    key: K,
    value: PreferenceLists[K][number]
  ) => {
    updatePreferenceList(which, key, list => {
      const stringList = list as unknown as string[];
      return stringList.includes(value as string)
        ? list
        : ([...stringList, value] as unknown as PreferenceLists[K]);
    });
  };

  const removePreference = <K extends keyof PreferenceLists>(
    which: 'desirable' | 'undesirable',
    key: K,
    value: PreferenceLists[K][number]
  ) => {
    updatePreferenceList(which, key, list => {
      const stringList = list as unknown as string[];
      return stringList.filter(
        item => item !== value
      ) as unknown as PreferenceLists[K];
    });
  };

  const addMaterial = () => {
    setFormData(prev => ({
      ...prev,
      requiredMaterials: [
        ...prev.requiredMaterials,
        { id: uuidv4(), name: '', quantityRequired: 1, quantityProvided: 0 },
      ],
    }));
  };

  const updateMaterial = (id: string, updates: Partial<QuestMaterial>) => {
    setFormData(prev => ({
      ...prev,
      requiredMaterials: prev.requiredMaterials.map(material =>
        material.id === id ? { ...material, ...updates } : material
      ),
    }));
  };

  const removeMaterial = (id: string) => {
    setFormData(prev => ({
      ...prev,
      requiredMaterials: prev.requiredMaterials.filter(m => m.id !== id),
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Mission name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const parsedTeamSize = parseInt(formData.teamSize, 10);
      const payload = {
        name: formData.name.trim(),
        details: formData.details.trim() || undefined,
        date: formData.date || undefined,
        time: formData.time || undefined,
        status: formData.status,
        assignedCharacterIds: formData.assignedCharacterIds,
        desirable: formData.desirable,
        undesirable: formData.undesirable,
        locationId: formData.locationId || undefined,
        factionNames: formData.factionNames,
        eventIds: formData.eventIds,
        junktownOffice: formData.junktownOffice.trim() || undefined,
        requiredMaterials: formData.requiredMaterials,
        teamSize:
          formData.teamSize && !isNaN(parsedTeamSize)
            ? parsedTeamSize
            : undefined,
        notes: formData.notes.trim() || undefined,
      };

      if (quest) {
        await updateQuest(quest.id, payload);
        Alert.alert('Success', 'Quest updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await createQuest(payload);
        Alert.alert('Success', 'Quest created successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch {
      Alert.alert('Error', 'Failed to save quest. Please try again.', [
        { text: 'OK' },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const characterOptions: Option<string>[] = characters.map(character => ({
    value: character.id,
    label: character.name,
  }));
  const factionOptions: Option<string>[] = factions.map(faction => ({
    value: faction,
    label: faction,
  }));
  const eventOptions: Option<string>[] = events.map(event => ({
    value: event.id,
    label: event.title,
  }));

  return (
    <BaseFormScreen contentContainerStyle={styles.content}>
      {/* Name */}
      <View style={styles.section}>
        <Text style={styles.label}>Mission Name *</Text>
        <TextInput
          style={[styles.input, errors.name && styles.inputError]}
          placeholder="Mission name"
          placeholderTextColor={themeColors.text.muted}
          value={formData.name}
          onChangeText={name => setFormData({ ...formData, name })}
        />
        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
      </View>

      {/* Details */}
      <View style={styles.section}>
        <Text style={styles.label}>Details</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Mission details"
          placeholderTextColor={themeColors.text.muted}
          value={formData.details}
          onChangeText={details => setFormData({ ...formData, details })}
          multiline
          numberOfLines={4}
        />
      </View>

      {/* Date and Time */}
      <View style={styles.section}>
        <Text style={styles.label}>Time of Mission</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD (optional)"
          placeholderTextColor={themeColors.text.muted}
          value={formData.date}
          onChangeText={date => setFormData({ ...formData, date })}
        />
        <TextInput
          style={[styles.input, styles.labelMargin]}
          placeholder="HH:MM (optional)"
          placeholderTextColor={themeColors.text.muted}
          value={formData.time}
          onChangeText={time => setFormData({ ...formData, time })}
        />
      </View>

      {/* Status */}
      <View style={styles.section}>
        <Text style={styles.label}>Mission Status</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formData.status}
            onValueChange={status => setFormData({ ...formData, status })}
            style={styles.picker}
            dropdownIconColor={themeColors.text.secondary}
          >
            {Object.values(QuestStatus).map(status => (
              <Picker.Item
                key={status}
                label={STATUS_LABELS[status]}
                value={status}
              />
            ))}
          </Picker>
        </View>
      </View>

      {/* Team size */}
      <View style={styles.section}>
        <Text style={styles.label}>Desired Team Size</Text>
        <TextInput
          style={styles.input}
          placeholder="Default: 4"
          placeholderTextColor={themeColors.text.muted}
          value={formData.teamSize}
          onChangeText={teamSize => setFormData({ ...formData, teamSize })}
          keyboardType="numeric"
        />
      </View>

      {/* Assigned characters */}
      <View style={styles.section}>
        <MultiSelectField
          label="Assigned Characters"
          placeholder="Select character to add..."
          options={characterOptions}
          selected={formData.assignedCharacterIds}
          onAdd={addCharacter}
          onRemove={removeCharacter}
        />
      </View>

      {/* Team preferences */}
      <CollapsibleSection title="Team Preferences" defaultCollapsed>
        <Text style={styles.sublabel}>Desirable</Text>
        <MultiSelectField
          label="Tags"
          placeholder="Select tag to add..."
          options={TAG_OPTIONS}
          selected={formData.desirable.tags}
          onAdd={value => addPreference('desirable', 'tags', value)}
          onRemove={value => removePreference('desirable', 'tags', value)}
        />
        <MultiSelectField
          label="Species"
          placeholder="Select species to add..."
          options={SPECIES_OPTIONS}
          selected={formData.desirable.species}
          onAdd={value => addPreference('desirable', 'species', value)}
          onRemove={value => removePreference('desirable', 'species', value)}
        />
        <MultiSelectField
          label="Perks"
          placeholder="Select perk to add..."
          options={PERK_OPTIONS}
          selected={formData.desirable.perkIds}
          onAdd={value => addPreference('desirable', 'perkIds', value)}
          onRemove={value => removePreference('desirable', 'perkIds', value)}
        />
        <MultiSelectField
          label="Distinctions"
          placeholder="Select distinction to add..."
          options={DISTINCTION_OPTIONS}
          selected={formData.desirable.distinctionIds}
          onAdd={value => addPreference('desirable', 'distinctionIds', value)}
          onRemove={value =>
            removePreference('desirable', 'distinctionIds', value)
          }
        />

        <Text style={[styles.sublabel, styles.labelMargin]}>Undesirable</Text>
        <MultiSelectField
          label="Tags"
          placeholder="Select tag to add..."
          options={TAG_OPTIONS}
          selected={formData.undesirable.tags}
          onAdd={value => addPreference('undesirable', 'tags', value)}
          onRemove={value => removePreference('undesirable', 'tags', value)}
        />
        <MultiSelectField
          label="Species"
          placeholder="Select species to add..."
          options={SPECIES_OPTIONS}
          selected={formData.undesirable.species}
          onAdd={value => addPreference('undesirable', 'species', value)}
          onRemove={value => removePreference('undesirable', 'species', value)}
        />
        <MultiSelectField
          label="Perks"
          placeholder="Select perk to add..."
          options={PERK_OPTIONS}
          selected={formData.undesirable.perkIds}
          onAdd={value => addPreference('undesirable', 'perkIds', value)}
          onRemove={value => removePreference('undesirable', 'perkIds', value)}
        />
        <MultiSelectField
          label="Distinctions"
          placeholder="Select distinction to add..."
          options={DISTINCTION_OPTIONS}
          selected={formData.undesirable.distinctionIds}
          onAdd={value => addPreference('undesirable', 'distinctionIds', value)}
          onRemove={value =>
            removePreference('undesirable', 'distinctionIds', value)
          }
        />
      </CollapsibleSection>

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

      {/* Factions */}
      <View style={styles.section}>
        <MultiSelectField
          label="Related Factions"
          placeholder="Select faction to add..."
          options={factionOptions}
          selected={formData.factionNames}
          onAdd={addFaction}
          onRemove={removeFaction}
        />
      </View>

      {/* Events */}
      <View style={styles.section}>
        <MultiSelectField
          label="Related Events"
          placeholder="Select event to add..."
          options={eventOptions}
          selected={formData.eventIds}
          onAdd={addEvent}
          onRemove={removeEvent}
        />
      </View>

      {/* Junktown office */}
      <View style={styles.section}>
        <Text style={styles.label}>Related Junktown Office</Text>
        <TextInput
          style={styles.input}
          placeholder="Office name (optional)"
          placeholderTextColor={themeColors.text.muted}
          value={formData.junktownOffice}
          onChangeText={junktownOffice =>
            setFormData({ ...formData, junktownOffice })
          }
        />
      </View>

      {/* Required materials */}
      <View style={styles.section}>
        <Text style={styles.label}>Required Materials</Text>
        {formData.requiredMaterials.map(material => (
          <View key={material.id} style={styles.materialRow}>
            <TextInput
              style={[styles.input, styles.materialNameInput]}
              placeholder="Material name"
              placeholderTextColor={themeColors.text.muted}
              value={material.name}
              onChangeText={name => updateMaterial(material.id, { name })}
            />
            <TextInput
              style={[styles.input, styles.materialQtyInput]}
              placeholder="Req"
              placeholderTextColor={themeColors.text.muted}
              keyboardType="numeric"
              value={String(material.quantityRequired)}
              onChangeText={value =>
                updateMaterial(material.id, {
                  quantityRequired: parseInt(value, 10) || 0,
                })
              }
            />
            <TextInput
              style={[styles.input, styles.materialQtyInput]}
              placeholder="Have"
              placeholderTextColor={themeColors.text.muted}
              keyboardType="numeric"
              value={String(material.quantityProvided)}
              onChangeText={value =>
                updateMaterial(material.id, {
                  quantityProvided: parseInt(value, 10) || 0,
                })
              }
            />
            <TouchableOpacity onPress={() => removeMaterial(material.id)}>
              <Text style={styles.removeButton}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity
          style={styles.addMaterialButton}
          onPress={addMaterial}
        >
          <Text style={styles.addMaterialButtonText}>+ Add Material</Text>
        </TouchableOpacity>
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Additional notes about the quest"
          placeholderTextColor={themeColors.text.muted}
          value={formData.notes}
          onChangeText={notes => setFormData({ ...formData, notes })}
          multiline
          numberOfLines={4}
        />
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[
          styles.submitButton,
          isSubmitting && styles.submitButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        <Text style={styles.submitButtonText}>
          {isSubmitting ? 'Saving...' : quest ? 'Update Quest' : 'Create Quest'}
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
  subField: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.text.primary,
    marginBottom: 8,
  },
  sublabel: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.text.secondary,
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
  materialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  materialNameInput: {
    flex: 2,
  },
  materialQtyInput: {
    flex: 1,
  },
  addMaterialButton: {
    ...commonStyles.button.base,
    ...commonStyles.button.outline,
    marginTop: 4,
  },
  addMaterialButtonText: {
    ...commonStyles.text.body,
    fontWeight: '600',
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
