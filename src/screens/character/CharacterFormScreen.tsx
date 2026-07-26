import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Button,
  Alert,
  Image,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import {
  RouteProp,
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import { RootStackParamList } from '@/navigation/types';
import {
  CharacterFormData,
  GameCharacter,
  GameLocation,
  Relationship,
  RelationshipStanding,
} from '@models/types';
import { Species, SPECIES_BASE_STATS } from '@models/speciesTypes';
import {
  addCharacter,
  updateCharacter,
  loadCharacters,
  saveCharacters,
  loadFactions,
  loadLocations,
} from '@utils/characterStorage';
import {
  AVAILABLE_PERKS,
  AVAILABLE_DISTINCTIONS,
  PerkTag,
} from '@models/gameData';
import { colors as themeColors } from '@/styles/theme';
import { commonStyles } from '@/styles/commonStyles';
import { BaseFormScreen } from '@/components';
import { useLabels, useRuleset } from '@/ruleset';

type CharacterFormRouteProp = RouteProp<RootStackParamList, 'CharacterForm'>;

export const CharacterFormScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<CharacterFormRouteProp>();
  const label = useLabels();
  const { ruleset } = useRuleset();
  const maxQualities = ruleset.limits?.maxQualities ?? 3;
  const editingCharacter = route.params?.character;
  const [selectedPerkTag, setSelectedPerkTag] = useState<string>('');
  const [allCharacters, setAllCharacters] = useState<GameCharacter[]>([]);
  const [availableFactions, setAvailableFactions] = useState<string[]>([]);
  const [availableLocations, setAvailableLocations] = useState<GameLocation[]>(
    []
  );
  const [showCustomFactionInput, setShowCustomFactionInput] = useState<{
    [key: number]: boolean;
  }>({});
  const [perksExpanded, setPerksExpanded] = useState<boolean>(false);
  const [distinctionsExpanded, setDistinctionsExpanded] =
    useState<boolean>(false);

  const [form, setForm] = useState<CharacterFormData>(
    editingCharacter
      ? {
          name: editingCharacter.name,
          species: editingCharacter.species,
          perkIds: [...editingCharacter.perkIds],
          distinctionIds: [...editingCharacter.distinctionIds],
          factions: [...editingCharacter.factions],
          relationships: [...(editingCharacter.relationships || [])],
          notes: editingCharacter.notes || '',
          occupation: editingCharacter.occupation || '',
          imageUris: editingCharacter.imageUris || [],
          locationId: editingCharacter.locationId,
          retired: editingCharacter.retired,
          cyberware: [...(editingCharacter.cyberware || [])],
        }
      : {
          name: '',
          species: 'Human',
          perkIds: [],
          distinctionIds: [],
          factions: [],
          relationships: [],
          notes: '',
          occupation: '',
          imageUris: [],
          locationId: undefined,
          retired: false,
          cyberware: [],
        }
  );

  const loadAllCharacters = useCallback(async () => {
    try {
      const characters = await loadCharacters();
      setAllCharacters(characters);

      // Extract unique faction names from all characters
      const factionNames = new Set<string>();
      characters.forEach(character => {
        character.factions.forEach(faction => {
          factionNames.add(faction.name);
        });
      });

      // Also load factions from centralized storage (exclude retired)
      const storedFactions = await loadFactions();
      storedFactions.forEach(faction => {
        // Only add non-retired factions to available list
        if (!faction.retired) {
          factionNames.add(faction.name);
        }
      });

      setAvailableFactions(Array.from(factionNames).sort());

      // Load available locations
      const locations = await loadLocations();
      setAvailableLocations(
        locations.sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch (error) {
      console.error('Failed to load characters:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAllCharacters();
    }, [loadAllCharacters])
  );

  // Get available character names for relationship picker
  const getAvailableCharacterNames = () => {
    return allCharacters
      .filter(char => char.id !== editingCharacter?.id) // Exclude the current character
      .map(char => char.name)
      .sort();
  };

  const handleChange = (field: keyof CharacterFormData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Function to update bidirectional relationships
  const updateBidirectionalRelationships = async (
    currentCharacter: GameCharacter,
    previousRelationships: Relationship[] = []
  ): Promise<void> => {
    try {
      const allChars = await loadCharacters();
      const updatedCharacters = [...allChars];

      // Find the current character in the list and update it
      const currentCharIndex = updatedCharacters.findIndex(
        char => char.id === currentCharacter.id
      );
      if (currentCharIndex !== -1) {
        updatedCharacters[currentCharIndex] = currentCharacter;
      }

      // Remove old relationships that no longer exist
      for (const oldRel of previousRelationships) {
        const targetChar = updatedCharacters.find(
          char => char.name === oldRel.characterName
        );
        if (targetChar) {
          targetChar.relationships = (targetChar.relationships || []).filter(
            rel => rel.characterName !== currentCharacter.name
          );
        }
      }

      // Add new bidirectional relationships
      for (const relationship of currentCharacter.relationships) {
        const targetChar = updatedCharacters.find(
          char => char.name === relationship.characterName
        );
        if (targetChar && targetChar.id !== currentCharacter.id) {
          // Remove any existing relationship to avoid duplicates
          targetChar.relationships = (targetChar.relationships || []).filter(
            rel => rel.characterName !== currentCharacter.name
          );

          // Add the reciprocal relationship
          const reciprocalRelationship: Relationship = {
            characterName: currentCharacter.name,
            relationshipType: relationship.relationshipType,
            description: relationship.description || '',
          };

          targetChar.relationships.push(reciprocalRelationship);
          targetChar.updatedAt = new Date().toISOString();
        }
      }

      await saveCharacters(updatedCharacters);
    } catch (error) {
      console.error('Failed to update bidirectional relationships:', error);
    }
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
      const currentImages = form.imageUris || [];
      handleChange('imageUris', [...currentImages, newImageUri]);
    }
  };

  const removeImage = (index: number) => {
    const currentImages = form.imageUris || [];
    const newImages = currentImages.filter((_, i) => i !== index);
    handleChange('imageUris', newImages);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    // Process relationships to use custom names when applicable
    const processedRelationships = form.relationships.map(rel => ({
      ...rel,
      characterName:
        rel.characterName === '__CUSTOM__'
          ? rel.customName || ''
          : rel.characterName,
      customName: undefined, // Remove the customName field before saving
    }));

    const formToSubmit = {
      ...form,
      relationships: processedRelationships,
    };

    try {
      let savedCharacter: GameCharacter;
      const previousRelationships = editingCharacter?.relationships || [];

      if (editingCharacter) {
        const result = await updateCharacter(editingCharacter.id, formToSubmit);
        if (!result) throw new Error('Failed to update character');
        savedCharacter = result;
      } else {
        savedCharacter = await addCharacter(formToSubmit);
      }

      // Update bidirectional relationships
      await updateBidirectionalRelationships(
        savedCharacter,
        previousRelationships
      );

      if (route.params?.onSubmit) {
        route.params.onSubmit(savedCharacter);
      }
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to save character');
    }
  };

  return (
    <BaseFormScreen>
      <View style={styles.formSection}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={form.name}
          onChangeText={value => handleChange('name', value)}
          placeholder="Character Name"
        />
      </View>

      <View style={styles.formSection}>
        <Text style={styles.label}>Character Images</Text>
        <View style={styles.imageGalleryContainer}>
          {form.imageUris && form.imageUris.length > 0 ? (
            <View style={styles.imageGrid}>
              {form.imageUris.map((uri, index) => (
                <View key={index} style={styles.imageItemContainer}>
                  <Image
                    source={{ uri }}
                    style={styles.characterImageThumbnail}
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
              {form.imageUris && form.imageUris.length > 0
                ? 'Add Another Image'
                : 'Add Image'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.label}>{label('archetype.singular')}</Text>
        <Picker
          selectedValue={form.species}
          style={[styles.picker, { flex: 1 }]}
          onValueChange={(value: Species) => handleChange('species', value)}
        >
          {Object.keys(SPECIES_BASE_STATS).map(species => (
            <Picker.Item key={species} label={species} value={species} />
          ))}
        </Picker>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.label}>Location</Text>
        <Picker
          selectedValue={form.locationId}
          style={[styles.picker, { flex: 1 }]}
          onValueChange={(value: string) =>
            handleChange('locationId', value || undefined)
          }
        >
          <Picker.Item label="(No Location)" value="" />
          {availableLocations.map(location => (
            <Picker.Item
              key={location.id}
              label={location.name}
              value={location.id}
            />
          ))}
        </Picker>
      </View>

      <View style={styles.formSection}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => setPerksExpanded(!perksExpanded)}
        >
          <Text style={styles.label}>{label('trait.plural')}</Text>
          <Text style={styles.expandIcon}>{perksExpanded ? '▼' : '▶'}</Text>
        </TouchableOpacity>
        {perksExpanded && (
          <>
            <View style={styles.filterContainer}>
              <Text style={styles.filterLabel}>
                Filter by {label('traitCategory.singular')}:
              </Text>
              <Picker
                selectedValue={selectedPerkTag}
                style={[styles.picker, { flex: 1 }]}
                onValueChange={setSelectedPerkTag}
              >
                <Picker.Item
                  label={`All ${label('traitCategory.plural')}`}
                  value=""
                />
                {Array.from(new Set(AVAILABLE_PERKS.map(perk => perk.tag)))
                  .sort()
                  .map(tag => (
                    <Picker.Item key={tag} label={tag} value={tag} />
                  ))}
              </Picker>
            </View>
            {AVAILABLE_PERKS.filter(
              perk =>
                (!selectedPerkTag || perk.tag === selectedPerkTag) &&
                (!perk.allowedSpecies ||
                  perk.allowedSpecies.includes(form.species))
            ).map(perk => (
              <TouchableOpacity
                key={perk.id}
                style={[
                  styles.selectionItem,
                  form.perkIds.includes(perk.id) && styles.selectedItem,
                  perk.allowedSpecies && styles.speciesSpecificItem,
                ]}
                onPress={() => {
                  const newPerkIds = form.perkIds.includes(perk.id)
                    ? form.perkIds.filter(id => id !== perk.id)
                    : [...form.perkIds, perk.id];
                  handleChange('perkIds', newPerkIds);
                }}
              >
                <View style={styles.perkContainer}>
                  <View style={styles.perkHeaderContainer}>
                    <Text style={styles.itemName}>{perk.name}</Text>
                    <View style={styles.perkBadgeContainer}>
                      {perk.allowedSpecies &&
                        perk.allowedSpecies.length > 0 && (
                          <Text style={styles.speciesText}>
                            {perk.allowedSpecies.length === 1
                              ? perk.allowedSpecies[0]
                              : `${perk.allowedSpecies.length} ${label('archetype.plural')}`}
                          </Text>
                        )}
                      <Text style={styles.tagText}>{perk.tag}</Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.descriptionText}>{perk.description}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}
      </View>

      <View style={styles.formSection}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => setDistinctionsExpanded(!distinctionsExpanded)}
        >
          <Text style={styles.label}>{label('quality.plural')}</Text>
          <Text style={styles.expandIcon}>
            {distinctionsExpanded ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>
        {distinctionsExpanded && (
          <>
            {AVAILABLE_DISTINCTIONS.map(distinction => (
              <TouchableOpacity
                key={distinction.id}
                style={[
                  styles.selectionItem,
                  form.distinctionIds.includes(distinction.id) &&
                    styles.selectedItem,
                ]}
                onPress={() => {
                  const isSelected = form.distinctionIds.includes(
                    distinction.id
                  );

                  if (isSelected) {
                    // Allow deselection
                    const newDistinctionIds = form.distinctionIds.filter(
                      id => id !== distinction.id
                    );
                    handleChange('distinctionIds', newDistinctionIds);
                  } else if (form.distinctionIds.length < maxQualities) {
                    // Allow selection if under limit
                    const newDistinctionIds = [
                      ...form.distinctionIds,
                      distinction.id,
                    ];
                    handleChange('distinctionIds', newDistinctionIds);
                  } else {
                    // Show alert when limit reached
                    Alert.alert(
                      'Maximum Reached',
                      `You can only select up to ${maxQualities} ${label(
                        'quality.plural',
                        'lower'
                      )}.`
                    );
                  }
                }}
              >
                <Text style={styles.itemName}>{distinction.name}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}
      </View>

      <View style={styles.formSection}>
        <Text style={styles.label}>{label('modification.plural')}</Text>
        {form.cyberware &&
          form.cyberware.map((cyber, index) => (
            <View key={index} style={styles.cyberwareContainer}>
              <View style={styles.cyberwareHeaderRow}>
                <TextInput
                  style={styles.cyberwareName}
                  value={cyber.name}
                  onChangeText={value => {
                    const newCyberware = [...(form.cyberware || [])];
                    newCyberware[index] = { ...cyber, name: value };
                    handleChange('cyberware', newCyberware);
                  }}
                  placeholder={`${label('modification.singular')} name`}
                />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => {
                    const newCyberware = (form.cyberware || []).filter(
                      (_, i) => i !== index
                    );
                    handleChange('cyberware', newCyberware);
                  }}
                >
                  <Text style={styles.removeButtonText}>×</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.cyberwareDescription}
                value={cyber.description}
                onChangeText={value => {
                  const newCyberware = [...(form.cyberware || [])];
                  newCyberware[index] = { ...cyber, description: value };
                  handleChange('cyberware', newCyberware);
                }}
                placeholder="Description"
                multiline
              />
              <View style={styles.cyberwareModifiersSection}>
                <Text style={styles.cyberwareModifiersLabel}>
                  Stat Modifiers (optional):
                </Text>
                <View style={styles.modifierRow}>
                  <View style={styles.modifierInput}>
                    <Text style={styles.modifierLabel}>Health:</Text>
                    <TextInput
                      style={styles.modifierField}
                      value={cyber.statModifiers?.health?.toString() || ''}
                      onChangeText={value => {
                        const newCyberware = [...(form.cyberware || [])];
                        const numValue =
                          value === '' ? undefined : parseInt(value) || 0;
                        newCyberware[index] = {
                          ...cyber,
                          statModifiers: {
                            ...cyber.statModifiers,
                            health: numValue,
                          },
                        };
                        handleChange('cyberware', newCyberware);
                      }}
                      placeholder="0"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.modifierInput}>
                    <Text style={styles.modifierLabel}>Limit:</Text>
                    <TextInput
                      style={styles.modifierField}
                      value={cyber.statModifiers?.limit?.toString() || ''}
                      onChangeText={value => {
                        const newCyberware = [...(form.cyberware || [])];
                        const numValue =
                          value === '' ? undefined : parseInt(value) || 0;
                        newCyberware[index] = {
                          ...cyber,
                          statModifiers: {
                            ...cyber.statModifiers,
                            limit: numValue,
                          },
                        };
                        handleChange('cyberware', newCyberware);
                      }}
                      placeholder="0"
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                <View style={styles.modifierRow}>
                  <View style={styles.modifierInput}>
                    <Text style={styles.modifierLabel}>Health Cap:</Text>
                    <TextInput
                      style={styles.modifierField}
                      value={cyber.statModifiers?.healthCap?.toString() || ''}
                      onChangeText={value => {
                        const newCyberware = [...(form.cyberware || [])];
                        const numValue =
                          value === '' ? undefined : parseInt(value) || 0;
                        newCyberware[index] = {
                          ...cyber,
                          statModifiers: {
                            ...cyber.statModifiers,
                            healthCap: numValue,
                          },
                        };
                        handleChange('cyberware', newCyberware);
                      }}
                      placeholder="0"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.modifierInput}>
                    <Text style={styles.modifierLabel}>Limit Cap:</Text>
                    <TextInput
                      style={styles.modifierField}
                      value={cyber.statModifiers?.limitCap?.toString() || ''}
                      onChangeText={value => {
                        const newCyberware = [...(form.cyberware || [])];
                        const numValue =
                          value === '' ? undefined : parseInt(value) || 0;
                        newCyberware[index] = {
                          ...cyber,
                          statModifiers: {
                            ...cyber.statModifiers,
                            limitCap: numValue,
                          },
                        };
                        handleChange('cyberware', newCyberware);
                      }}
                      placeholder="0"
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                <View style={styles.tagModifiersSection}>
                  <Text style={styles.tagModifiersLabel}>
                    {label('traitCategory.singular')} Score Modifiers
                    (optional):
                  </Text>
                  <View style={styles.tagModifiersList}>
                    {Object.values(PerkTag).map(tag => {
                      const currentValue =
                        cyber.statModifiers?.tagModifiers?.[tag];
                      if (currentValue === undefined && !cyber.statModifiers)
                        return null;

                      return (
                        <View key={tag} style={styles.tagModifierRow}>
                          <Text style={styles.tagModifierName}>{tag}:</Text>
                          <TextInput
                            style={styles.tagModifierField}
                            value={currentValue?.toString() || ''}
                            onChangeText={value => {
                              const newCyberware = [...(form.cyberware || [])];
                              const numValue =
                                value === '' ? undefined : parseInt(value) || 0;

                              const currentTagModifiers = {
                                ...(cyber.statModifiers?.tagModifiers || {}),
                              };

                              if (numValue === undefined) {
                                delete currentTagModifiers[tag];
                              } else {
                                currentTagModifiers[tag] = numValue;
                              }

                              newCyberware[index] = {
                                ...cyber,
                                statModifiers: {
                                  ...cyber.statModifiers,
                                  tagModifiers:
                                    Object.keys(currentTagModifiers).length > 0
                                      ? (currentTagModifiers as Record<
                                          PerkTag,
                                          number
                                        >)
                                      : undefined,
                                },
                              };
                              handleChange('cyberware', newCyberware);
                            }}
                            placeholder="0"
                            keyboardType="numeric"
                          />
                          {currentValue !== undefined && (
                            <TouchableOpacity
                              style={styles.tagModifierRemove}
                              onPress={() => {
                                const newCyberware = [
                                  ...(form.cyberware || []),
                                ];
                                const currentTagModifiers = {
                                  ...(cyber.statModifiers?.tagModifiers || {}),
                                };
                                delete currentTagModifiers[tag];

                                newCyberware[index] = {
                                  ...cyber,
                                  statModifiers: {
                                    ...cyber.statModifiers,
                                    tagModifiers:
                                      Object.keys(currentTagModifiers).length >
                                      0
                                        ? (currentTagModifiers as Record<
                                            PerkTag,
                                            number
                                          >)
                                        : undefined,
                                  },
                                };
                                handleChange('cyberware', newCyberware);
                              }}
                            >
                              <Text style={styles.tagModifierRemoveText}>
                                ×
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                  </View>
                  <TouchableOpacity
                    style={styles.addTagModifierButton}
                    onPress={() => {
                      // Find first tag that doesn't have a modifier
                      const currentTagModifiers =
                        cyber.statModifiers?.tagModifiers || {};
                      const availableTags = Object.values(PerkTag).filter(
                        tag => !(tag in currentTagModifiers)
                      );

                      if (availableTags.length > 0) {
                        const newCyberware = [...(form.cyberware || [])];
                        const newTagModifiers = {
                          ...currentTagModifiers,
                          [availableTags[0]]: 1,
                        } as Record<PerkTag, number>;

                        newCyberware[index] = {
                          ...cyber,
                          statModifiers: {
                            ...cyber.statModifiers,
                            tagModifiers: newTagModifiers,
                          },
                        };
                        handleChange('cyberware', newCyberware);
                      } else {
                        Alert.alert(
                          `All ${label('traitCategory.plural')} Added`,
                          `All available ${label(
                            'traitCategory.plural',
                            'lower'
                          )} already have modifiers.`
                        );
                      }
                    }}
                  >
                    <Text style={styles.addTagModifierButtonText}>
                      + Add {label('traitCategory.singular')} Modifier
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            handleChange('cyberware', [
              ...(form.cyberware || []),
              {
                name: '',
                description: '',
                statModifiers: {},
              },
            ]);
          }}
        >
          <Text style={styles.addButtonText}>
            Add {label('modification.singular')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.label}>Factions</Text>
        {form.factions.map((faction, index) => (
          <View key={index} style={styles.factionContainer}>
            {showCustomFactionInput[index] ? (
              <View style={styles.customFactionContainer}>
                <TextInput
                  style={styles.factionInput}
                  value={faction.name}
                  onChangeText={value => {
                    const newFactions = [...form.factions];
                    newFactions[index] = { ...faction, name: value };
                    handleChange('factions', newFactions);

                    // Add new faction to available list if it doesn't exist
                    if (
                      value.trim() &&
                      !availableFactions.includes(value.trim())
                    ) {
                      setAvailableFactions(prev =>
                        [...prev, value.trim()].sort()
                      );
                    }
                  }}
                  placeholder="Enter new faction name"
                  autoFocus={true}
                  onBlur={() => {
                    // Switch back to dropdown if input is empty
                    if (!faction.name.trim()) {
                      setShowCustomFactionInput(prev => ({
                        ...prev,
                        [index]: false,
                      }));
                    }
                  }}
                />
                <TouchableOpacity
                  style={styles.backToDropdownButton}
                  onPress={() => {
                    setShowCustomFactionInput(prev => ({
                      ...prev,
                      [index]: false,
                    }));
                  }}
                >
                  <Text style={styles.backToDropdownText}>↩</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Picker
                selectedValue={faction.name || ''}
                style={styles.factionInput}
                onValueChange={value => {
                  if (value === '__ADD_NEW__') {
                    setShowCustomFactionInput(prev => ({
                      ...prev,
                      [index]: true,
                    }));
                    const newFactions = [...form.factions];
                    newFactions[index] = { ...faction, name: '' };
                    handleChange('factions', newFactions);
                  } else if (value && value !== faction.name) {
                    const newFactions = [...form.factions];
                    newFactions[index] = { ...faction, name: value };
                    handleChange('factions', newFactions);
                  }
                }}
              >
                <Picker.Item label="Select a faction..." value="" />
                {availableFactions.map(factionName => (
                  <Picker.Item
                    key={factionName}
                    label={factionName}
                    value={factionName}
                  />
                ))}
                <Picker.Item label="Add New Faction..." value="__ADD_NEW__" />
              </Picker>
            )}
            <Picker
              selectedValue={faction.standing}
              style={styles.factionStanding}
              onValueChange={value => {
                const newFactions = [...form.factions];
                newFactions[index] = { ...faction, standing: value };
                handleChange('factions', newFactions);
              }}
            >
              {Object.values(RelationshipStanding).map(standing => (
                <Picker.Item key={standing} label={standing} value={standing} />
              ))}
            </Picker>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => {
                const newFactions = form.factions.filter((_, i) => i !== index);
                handleChange('factions', newFactions);
              }}
            >
              <Text style={styles.removeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            handleChange('factions', [
              ...form.factions,
              { name: '', standing: 'Neutral' },
            ]);
          }}
        >
          <Text style={styles.addButtonText}>Add Faction</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.label}>Relationships</Text>
        {form.relationships.map((relationship, index) => (
          <View key={index} style={styles.relationshipGroup}>
            <View style={styles.relationshipContainer}>
              <View style={styles.relationshipPickerContainer}>
                <Picker
                  selectedValue={relationship.characterName}
                  style={styles.relationshipNamePicker}
                  onValueChange={value => {
                    const newRelationships = [...form.relationships];
                    newRelationships[index] = {
                      ...relationship,
                      characterName: value,
                    };
                    handleChange('relationships', newRelationships);
                  }}
                >
                  <Picker.Item label="Select Character..." value="" />
                  {getAvailableCharacterNames().map(name => (
                    <Picker.Item key={name} label={name} value={name} />
                  ))}
                  <Picker.Item label="Other (Custom Name)" value="__CUSTOM__" />
                </Picker>
              </View>
              <Picker
                selectedValue={relationship.relationshipType}
                style={styles.relationshipType}
                onValueChange={value => {
                  const newRelationships = [...form.relationships];
                  newRelationships[index] = {
                    ...relationship,
                    relationshipType: value,
                  };
                  handleChange('relationships', newRelationships);
                }}
              >
                {Object.values(RelationshipStanding).map(type => (
                  <Picker.Item key={type} label={type} value={type} />
                ))}
              </Picker>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => {
                  const newRelationships = form.relationships.filter(
                    (_, i) => i !== index
                  );
                  handleChange('relationships', newRelationships);
                }}
              >
                <Text style={styles.removeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            {relationship.characterName === '__CUSTOM__' && (
              <View style={styles.customNameContainer}>
                <TextInput
                  style={styles.customNameInput}
                  value={relationship.customName || ''}
                  onChangeText={value => {
                    const newRelationships = [...form.relationships];
                    newRelationships[index] = {
                      ...relationship,
                      customName: value,
                    };
                    handleChange('relationships', newRelationships);
                  }}
                  placeholder="Enter custom character name"
                />
              </View>
            )}
            <View style={styles.relationshipDescContainer}>
              <TextInput
                style={styles.relationshipDescInput}
                value={relationship.description || ''}
                onChangeText={value => {
                  const newRelationships = [...form.relationships];
                  newRelationships[index] = {
                    ...relationship,
                    description: value,
                  };
                  handleChange('relationships', newRelationships);
                }}
                placeholder={`Description of relationship with ${relationship.characterName || 'character'}`}
                multiline
              />
            </View>
          </View>
        ))}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            handleChange('relationships', [
              ...form.relationships,
              {
                characterName: '',
                relationshipType: RelationshipStanding.Friend,
                description: '',
              },
            ]);
          }}
        >
          <Text style={styles.addButtonText}>Add Relationship</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.label}>Status</Text>
        <TouchableOpacity
          style={[
            styles.statusButton,
            form.retired && styles.statusButtonRetired,
          ]}
          onPress={() => handleChange('retired', !form.retired)}
        >
          <Text
            style={[
              styles.statusButtonText,
              form.retired && styles.statusButtonTextRetired,
            ]}
          >
            {form.retired ? '🔒 Retired' : '✓ Active'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.label}>Occupation</Text>
        <TextInput
          style={styles.input}
          value={form.occupation}
          onChangeText={value => handleChange('occupation', value)}
          placeholder="Character Occupation"
        />
      </View>

      <View style={styles.formSection}>
        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={form.notes}
          onChangeText={value => handleChange('notes', value)}
          placeholder="Character Notes"
          multiline
        />
      </View>

      <View style={styles.submitContainer}>
        <Button
          title={editingCharacter ? 'Update Character' : 'Create Character'}
          onPress={handleSubmit}
        />
      </View>
    </BaseFormScreen>
  );
};

const styles = StyleSheet.create({
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
  characterImageThumbnail: {
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  placeholderImage: commonStyles.image.placeholder,
  imagePickerButton: commonStyles.image.pickerButton,
  imagePickerButtonText: {
    ...commonStyles.button.text,
    textAlign: 'center',
  },
  filterContainer: {
    ...commonStyles.layout.section,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 16,
  },
  filterLabel: {
    ...commonStyles.text.label,
    marginRight: 12,
    marginBottom: 0,
  },
  picker: commonStyles.input.picker,
  perkContainer: {
    flexDirection: 'column',
    marginBottom: 4,
  },
  perkHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  perkBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tagText: {
    ...commonStyles.badge.text,
    ...commonStyles.badge.tag,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  speciesText: {
    ...commonStyles.badge.text,
    ...commonStyles.badge.species,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  speciesSpecificItem: {
    borderLeftWidth: 4,
    borderLeftColor: themeColors.status.info,
    backgroundColor: themeColors.elevated,
  },
  descriptionText: {
    ...commonStyles.text.description,
    marginTop: 6,
    lineHeight: 20,
  },
  formSection: commonStyles.layout.formSection,
  label: commonStyles.text.label,
  input: commonStyles.input.base,
  notesInput: {
    ...commonStyles.input.base,
    ...commonStyles.input.multiline,
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
  selectionItem: {
    backgroundColor: themeColors.elevated,
    padding: 16,
    borderRadius: 12,
    marginVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  selectedItem: {
    backgroundColor: themeColors.interactive.hover,
    borderColor: themeColors.accent.primary,
  },
  itemName: {
    fontSize: 16,
    color: themeColors.text.primary,
    fontWeight: '500',
  },
  factionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  factionInput: {
    ...commonStyles.input.base,
    padding: 12,
    borderRadius: 8,
    flex: 1,
  },
  customFactionContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backToDropdownButton: {
    backgroundColor: themeColors.interactive.hover,
    padding: 8,
    borderRadius: 6,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backToDropdownText: {
    color: themeColors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  factionStanding: {
    width: '35%',
  },
  relationshipGroup: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: themeColors.elevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  relationshipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  relationshipPickerContainer: {
    flex: 1,
  },
  relationshipNamePicker: {
    ...commonStyles.input.picker,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  relationshipType: {
    width: '35%',
  },
  customNameContainer: {
    marginBottom: 12,
    marginTop: -8,
  },
  customNameInput: {
    ...commonStyles.input.base,
    padding: 12,
    borderRadius: 8,
  },
  relationshipDescContainer: {
    marginBottom: 12,
  },
  relationshipDescInput: {
    ...commonStyles.input.base,
    padding: 12,
    borderRadius: 8,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  removeButton: {
    ...commonStyles.button.small,
    backgroundColor: themeColors.status.error,
  },
  removeButtonText: commonStyles.button.textSmall,
  addButton: {
    ...commonStyles.button.base,
    ...commonStyles.button.primary,
    marginTop: 12,
  },
  addButtonText: commonStyles.button.text,
  submitContainer: {
    marginTop: 32,
    marginBottom: 40,
    paddingHorizontal: 16,
  },
  placeholderText: {
    ...commonStyles.text.body,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  expandIcon: {
    color: themeColors.text.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  cyberwareContainer: {
    backgroundColor: themeColors.elevated,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  cyberwareHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cyberwareName: {
    ...commonStyles.input.base,
    flex: 1,
    padding: 12,
    borderRadius: 8,
    fontWeight: '600',
  },
  cyberwareDescription: {
    ...commonStyles.input.base,
    padding: 12,
    borderRadius: 8,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  cyberwareModifiersSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  cyberwareModifiersLabel: {
    ...commonStyles.text.label,
    fontSize: 14,
    marginBottom: 12,
    color: themeColors.accent.primary,
  },
  modifierRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  modifierInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modifierLabel: {
    ...commonStyles.text.label,
    fontSize: 13,
    marginBottom: 0,
    minWidth: 80,
  },
  modifierField: {
    ...commonStyles.input.base,
    flex: 1,
    padding: 8,
    borderRadius: 6,
    textAlign: 'center',
  },
  tagModifiersSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  tagModifiersLabel: {
    ...commonStyles.text.label,
    fontSize: 14,
    marginBottom: 12,
    color: themeColors.accent.secondary,
  },
  tagModifiersList: {
    gap: 8,
    marginBottom: 12,
  },
  tagModifierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: themeColors.surface,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  tagModifierName: {
    ...commonStyles.text.label,
    fontSize: 13,
    marginBottom: 0,
    minWidth: 90,
    color: themeColors.text.primary,
  },
  tagModifierField: {
    ...commonStyles.input.base,
    flex: 1,
    padding: 8,
    borderRadius: 6,
    textAlign: 'center',
    minWidth: 60,
  },
  tagModifierRemove: {
    backgroundColor: themeColors.status.error,
    borderRadius: 4,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagModifierRemoveText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  addTagModifierButton: {
    backgroundColor: themeColors.surface,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: themeColors.accent.secondary,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addTagModifierButtonText: {
    ...commonStyles.text.label,
    fontSize: 13,
    marginBottom: 0,
    color: themeColors.accent.secondary,
  },
});
