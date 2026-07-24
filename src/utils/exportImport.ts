import 'react-native-get-random-values';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';
import { zip, unzip } from 'react-native-zip-archive';
import {
  exportDataset,
  importDataset,
  mergeDatasetWithConflictResolution,
  MergeConflict,
  updateCharacter,
} from './characterStorage';
import { sortDatasetDeterministically } from './datasetSorting';

/**
 * Extract image data from a data URI
 */
const extractImageData = (
  dataUri: string
): { mimeType: string; base64Data: string; extension: string } | null => {
  const matches = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) return null;

  const mimeType = matches[1];
  const base64Data = matches[2];
  const extension = mimeType.split('/')[1] || 'jpg';

  return { mimeType, base64Data, extension };
};

/**
 * Handle conflicts by asking the user for each conflicting property
 */
const handleMergeConflicts = async (
  conflicts: MergeConflict[]
): Promise<void> => {
  for (const conflict of conflicts) {
    for (const property of conflict.conflicts) {
      const existingValue = (conflict.existing as any)[property];
      const importedValue = (conflict.imported as any)[property];

      await new Promise<void>(resolve => {
        Alert.alert(
          'Merge Conflict',
          `Character "${conflict.existing.name}" has conflicting ${property}:\n\nExisting: ${existingValue}\nImported: ${importedValue}\n\nWhich value would you like to keep?`,
          [
            {
              text: 'Keep Existing',
              onPress: () => resolve(), // Do nothing, keep existing
            },
            {
              text: 'Use Imported',
              onPress: async () => {
                // Update the character with the imported value
                const updates = { [property]: importedValue };
                await updateCharacter(conflict.id, updates);
                resolve();
              },
            },
            {
              text: 'Skip This Property',
              style: 'cancel',
              onPress: () => resolve(),
            },
          ]
        );
      });
    }
  }
};

/**
 * Export game data for native platforms (creates zip with images)
 */
const exportCharacterDataNative = async (): Promise<void> => {
  try {
    // Get the game data as JSON string
    const jsonData = await exportDataset();
    const dataset = JSON.parse(jsonData);

    // Create a temporary directory for building the zip
    const timestamp = new Date()
      .toISOString()
      .replace(/:/g, '-')
      .replace(/\..+/, '');
    const tempDir =
      (FileSystem.cacheDirectory || FileSystem.documentDirectory || '') +
      `export_temp_${timestamp}/`;

    // Create directory structure
    await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
    await FileSystem.makeDirectoryAsync(tempDir + 'images/characters/', {
      intermediates: true,
    });
    await FileSystem.makeDirectoryAsync(tempDir + 'images/locations/', {
      intermediates: true,
    });
    await FileSystem.makeDirectoryAsync(tempDir + 'images/events/', {
      intermediates: true,
    });
    await FileSystem.makeDirectoryAsync(tempDir + 'images/factions/', {
      intermediates: true,
    });
    await FileSystem.makeDirectoryAsync(tempDir + 'images/discord/', {
      intermediates: true,
    });

    // Track image references and replace URIs with file paths
    let imageCounter = 0;

    // Process character images
    if (dataset.characters) {
      for (const character of dataset.characters) {
        // Handle multiple images
        if (character.imageUris && character.imageUris.length > 0) {
          const processedUris: string[] = [];
          for (let i = 0; i < character.imageUris.length; i++) {
            const uri = character.imageUris[i];
            if (uri) {
              if (uri.startsWith('data:')) {
                // Handle base64 data URI
                const imageData = extractImageData(uri);
                if (imageData) {
                  const filename = `images/characters/${character.id}_${i}.${imageData.extension}`;
                  const filePath = tempDir + filename;
                  await FileSystem.writeAsStringAsync(
                    filePath,
                    imageData.base64Data,
                    {
                      encoding: FileSystem.EncodingType.Base64,
                    }
                  );
                  processedUris.push(filename);
                  imageCounter++;
                }
              } else if (uri.startsWith('file://') || uri.startsWith('/')) {
                // Handle file URI - copy file directly
                try {
                  const extension =
                    uri.split('.').pop()?.toLowerCase() || 'jpg';
                  const filename = `images/characters/${character.id}_${i}.${extension}`;
                  const filePath = tempDir + filename;
                  await FileSystem.copyAsync({ from: uri, to: filePath });
                  processedUris.push(filename);
                  imageCounter++;
                } catch {
                  // Image file not accessible, skip
                }
              } else {
                processedUris.push(uri);
              }
            }
          }
          if (processedUris.length > 0) {
            character.imageUris = processedUris;
          }
        }
        // Handle a legacy single image from data that predates the
        // imageUris migration. Read-only tolerance: normalize onto
        // imageUris and never write the deprecated field back out.
        else if (character.imageUri) {
          const legacyUri = character.imageUri;
          if (legacyUri.startsWith('data:')) {
            const imageData = extractImageData(legacyUri);
            if (imageData) {
              const filename = `images/characters/${character.id}.${imageData.extension}`;
              const filePath = tempDir + filename;
              await FileSystem.writeAsStringAsync(
                filePath,
                imageData.base64Data,
                {
                  encoding: FileSystem.EncodingType.Base64,
                }
              );
              character.imageUris = [filename];
              imageCounter++;
            }
          } else if (
            legacyUri.startsWith('file://') ||
            legacyUri.startsWith('/')
          ) {
            // Handle file URI - copy file directly
            try {
              const extension =
                legacyUri.split('.').pop()?.toLowerCase() || 'jpg';
              const filename = `images/characters/${character.id}.${extension}`;
              const filePath = tempDir + filename;
              await FileSystem.copyAsync({
                from: legacyUri,
                to: filePath,
              });
              character.imageUris = [filename];
              imageCounter++;
            } catch {
              // Image file not accessible, skip
            }
          } else {
            // Already a relative/remote path - carry it over as-is.
            character.imageUris = [legacyUri];
          }
          delete character.imageUri;
        }
      }
    }

    // Process location images
    if (dataset.locations) {
      for (const location of dataset.locations) {
        // Handle multiple images
        if (location.imageUris && location.imageUris.length > 0) {
          const processedUris: string[] = [];
          for (let i = 0; i < location.imageUris.length; i++) {
            const uri = location.imageUris[i];
            if (uri) {
              if (uri.startsWith('data:')) {
                // Handle base64 data URI
                const imageData = extractImageData(uri);
                if (imageData) {
                  const filename = `images/locations/${location.id}_${i}.${imageData.extension}`;
                  const filePath = tempDir + filename;
                  await FileSystem.writeAsStringAsync(
                    filePath,
                    imageData.base64Data,
                    {
                      encoding: FileSystem.EncodingType.Base64,
                    }
                  );
                  processedUris.push(filename);
                  imageCounter++;
                }
              } else if (uri.startsWith('file://') || uri.startsWith('/')) {
                // Handle file URI - copy file directly
                try {
                  const extension =
                    uri.split('.').pop()?.toLowerCase() || 'jpg';
                  const filename = `images/locations/${location.id}_${i}.${extension}`;
                  const filePath = tempDir + filename;
                  await FileSystem.copyAsync({ from: uri, to: filePath });
                  processedUris.push(filename);
                  imageCounter++;
                } catch {
                  // Image file not accessible, skip
                }
              } else {
                processedUris.push(uri);
              }
            }
          }
          if (processedUris.length > 0) {
            location.imageUris = processedUris;
          }
        }
        // Handle a legacy single image from data that predates the
        // imageUris migration. Read-only tolerance: normalize onto
        // imageUris and never write the deprecated field back out.
        else if (location.imageUri) {
          const legacyUri = location.imageUri;
          if (legacyUri.startsWith('data:')) {
            const imageData = extractImageData(legacyUri);
            if (imageData) {
              const filename = `images/locations/${location.id}.${imageData.extension}`;
              const filePath = tempDir + filename;
              await FileSystem.writeAsStringAsync(
                filePath,
                imageData.base64Data,
                {
                  encoding: FileSystem.EncodingType.Base64,
                }
              );
              location.imageUris = [filename];
              imageCounter++;
            }
          } else if (
            legacyUri.startsWith('file://') ||
            legacyUri.startsWith('/')
          ) {
            // Handle file URI - copy file directly
            try {
              const extension =
                legacyUri.split('.').pop()?.toLowerCase() || 'jpg';
              const filename = `images/locations/${location.id}.${extension}`;
              const filePath = tempDir + filename;
              await FileSystem.copyAsync({
                from: legacyUri,
                to: filePath,
              });
              location.imageUris = [filename];
              imageCounter++;
            } catch {
              // Image file not accessible, skip
            }
          } else {
            // Already a relative/remote path - carry it over as-is.
            location.imageUris = [legacyUri];
          }
          delete location.imageUri;
        }
      }
    }

    // Process event images
    if (dataset.events) {
      for (const event of dataset.events) {
        // Handle multiple images
        if (event.imageUris && event.imageUris.length > 0) {
          const processedUris: string[] = [];
          for (let i = 0; i < event.imageUris.length; i++) {
            const uri = event.imageUris[i];
            if (uri) {
              if (uri.startsWith('data:')) {
                // Handle base64 data URI
                const imageData = extractImageData(uri);
                if (imageData) {
                  const filename = `images/events/${event.id}_${i}.${imageData.extension}`;
                  const filePath = tempDir + filename;
                  await FileSystem.writeAsStringAsync(
                    filePath,
                    imageData.base64Data,
                    {
                      encoding: FileSystem.EncodingType.Base64,
                    }
                  );
                  processedUris.push(filename);
                  imageCounter++;
                }
              } else if (uri.startsWith('file://') || uri.startsWith('/')) {
                // Handle file URI - copy file directly
                try {
                  const extension =
                    uri.split('.').pop()?.toLowerCase() || 'jpg';
                  const filename = `images/events/${event.id}_${i}.${extension}`;
                  const filePath = tempDir + filename;
                  await FileSystem.copyAsync({ from: uri, to: filePath });
                  processedUris.push(filename);
                  imageCounter++;
                } catch {
                  // Image file not accessible, skip
                }
              } else {
                processedUris.push(uri);
              }
            }
          }
          if (processedUris.length > 0) {
            event.imageUris = processedUris;
          }
        }
        // Handle a legacy single image from data that predates the
        // imageUris migration. Read-only tolerance: normalize onto
        // imageUris and never write the deprecated field back out.
        else if (event.imageUri) {
          const legacyUri = event.imageUri;
          if (legacyUri.startsWith('data:')) {
            const imageData = extractImageData(legacyUri);
            if (imageData) {
              const filename = `images/events/${event.id}.${imageData.extension}`;
              const filePath = tempDir + filename;
              await FileSystem.writeAsStringAsync(
                filePath,
                imageData.base64Data,
                {
                  encoding: FileSystem.EncodingType.Base64,
                }
              );
              event.imageUris = [filename];
              imageCounter++;
            }
          } else if (
            legacyUri.startsWith('file://') ||
            legacyUri.startsWith('/')
          ) {
            // Handle file URI - copy file directly
            try {
              const extension =
                legacyUri.split('.').pop()?.toLowerCase() || 'jpg';
              const filename = `images/events/${event.id}.${extension}`;
              const filePath = tempDir + filename;
              await FileSystem.copyAsync({
                from: legacyUri,
                to: filePath,
              });
              event.imageUris = [filename];
              imageCounter++;
            } catch {
              // Image file not accessible, skip
            }
          } else {
            // Already a relative/remote path - carry it over as-is.
            event.imageUris = [legacyUri];
          }
          delete event.imageUri;
        }
      }
    }

    // Process faction images
    if (dataset.factions) {
      for (const faction of dataset.factions) {
        // Handle multiple images
        if (faction.imageUris && faction.imageUris.length > 0) {
          const processedUris: string[] = [];
          for (let i = 0; i < faction.imageUris.length; i++) {
            const uri = faction.imageUris[i];
            if (uri) {
              if (uri.startsWith('data:')) {
                // Handle base64 data URI
                const imageData = extractImageData(uri);
                if (imageData) {
                  // Use faction name as identifier (sanitize for filename)
                  const safeName = faction.name.replace(/[^a-zA-Z0-9]/g, '_');
                  const filename = `images/factions/${safeName}_${i}.${imageData.extension}`;
                  const filePath = tempDir + filename;
                  await FileSystem.writeAsStringAsync(
                    filePath,
                    imageData.base64Data,
                    {
                      encoding: FileSystem.EncodingType.Base64,
                    }
                  );
                  processedUris.push(filename);
                  imageCounter++;
                }
              } else if (uri.startsWith('file://') || uri.startsWith('/')) {
                // Handle file URI - copy file directly
                try {
                  const extension =
                    uri.split('.').pop()?.toLowerCase() || 'jpg';
                  const safeName = faction.name.replace(/[^a-zA-Z0-9]/g, '_');
                  const filename = `images/factions/${safeName}_${i}.${extension}`;
                  const filePath = tempDir + filename;
                  await FileSystem.copyAsync({ from: uri, to: filePath });
                  processedUris.push(filename);
                  imageCounter++;
                } catch {
                  // Image file not accessible, skip
                }
              } else {
                processedUris.push(uri);
              }
            }
          }
          if (processedUris.length > 0) {
            faction.imageUris = processedUris;
          }
        }
        // Handle a legacy single image from data that predates the
        // imageUris migration. Read-only tolerance: normalize onto
        // imageUris and never write the deprecated field back out.
        else if (faction.imageUri) {
          const legacyUri = faction.imageUri;
          if (legacyUri.startsWith('data:')) {
            const imageData = extractImageData(legacyUri);
            if (imageData) {
              const safeName = faction.name.replace(/[^a-zA-Z0-9]/g, '_');
              const filename = `images/factions/${safeName}.${imageData.extension}`;
              const filePath = tempDir + filename;
              await FileSystem.writeAsStringAsync(
                filePath,
                imageData.base64Data,
                {
                  encoding: FileSystem.EncodingType.Base64,
                }
              );
              faction.imageUris = [filename];
              imageCounter++;
            }
          } else if (
            legacyUri.startsWith('file://') ||
            legacyUri.startsWith('/')
          ) {
            // Handle file URI - copy file directly
            try {
              const extension =
                legacyUri.split('.').pop()?.toLowerCase() || 'jpg';
              const safeName = faction.name.replace(/[^a-zA-Z0-9]/g, '_');
              const filename = `images/factions/${safeName}.${extension}`;
              const filePath = tempDir + filename;
              await FileSystem.copyAsync({
                from: legacyUri,
                to: filePath,
              });
              faction.imageUris = [filename];
              imageCounter++;
            } catch {
              // Image file not accessible, skip
            }
          } else {
            // Already a relative/remote path - carry it over as-is.
            faction.imageUris = [legacyUri];
          }
          delete faction.imageUri;
        }
      }
    }

    // Process Discord message images
    if (dataset.discord && dataset.discord.messages) {
      for (const message of dataset.discord.messages) {
        if (message.imageUris && message.imageUris.length > 0) {
          const processedUris: string[] = [];
          for (let i = 0; i < message.imageUris.length; i++) {
            const uri = message.imageUris[i];
            if (uri) {
              if (uri.startsWith('file://') || uri.startsWith('/')) {
                // Handle file URI - copy file directly
                try {
                  const extension =
                    uri.split('.').pop()?.toLowerCase() || 'jpg';
                  const filename = `images/discord/${message.id}_${i}.${extension}`;
                  const filePath = tempDir + filename;
                  await FileSystem.copyAsync({ from: uri, to: filePath });
                  processedUris.push(filename);
                  imageCounter++;
                } catch {
                  // Image file not accessible, skip
                }
              } else {
                processedUris.push(uri);
              }
            }
          }
          if (processedUris.length > 0) {
            message.imageUris = processedUris;
          }
        }
      }
    }

    // Sort the dataset deterministically to minimize diff noise
    const sortedDataset = sortDatasetDeterministically(dataset);

    // Write the modified JSON to the temp directory
    const dataJsonPath = tempDir + 'data.json';
    await FileSystem.writeAsStringAsync(
      dataJsonPath,
      JSON.stringify(sortedDataset, null, 2)
    );

    // Create the zip file from the directory
    const filename = `character-faction-data-${timestamp}.zip`;
    const zipPath =
      (FileSystem.cacheDirectory || FileSystem.documentDirectory || '') +
      filename;

    await zip(tempDir, zipPath);

    // Clean up temp directory
    await FileSystem.deleteAsync(tempDir, { idempotent: true });

    // Check if sharing is available
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(zipPath, {
        mimeType: 'application/zip',
        dialogTitle: 'Export Character Data',
      });
    } else {
      Alert.alert(
        'Export Complete',
        `Game data exported to: ${zipPath}${imageCounter > 0 ? ` (includes ${imageCounter} images)` : ''}`,
        [{ text: 'OK' }]
      );
    }
  } catch (error) {
    console.error('Export error:', error);
    Alert.alert(
      'Export Failed',
      'Failed to export game data. Please try again.',
      [{ text: 'OK' }]
    );
  }
};

/**
 * Export game data to a JSON file and share it
 */
export const exportCharacterData = async (): Promise<void> => {
  await exportCharacterDataNative();
};

/**
 * Import game data for native platforms (supports both JSON and ZIP files)
 */
const importCharacterDataNative = async (): Promise<boolean> => {
  try {
    // Pick a document
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'application/zip'],
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return false;
    }

    const fileUri = result.assets[0].uri;
    const fileName = result.assets[0].name;
    const isZip = fileName.endsWith('.zip');

    if (isZip) {
      console.log('[ZIP Import] Starting import from:', fileName);
      console.log('[ZIP Import] File URI:', fileUri);

      // Handle ZIP file - extract to temp directory
      const timestamp = new Date().getTime();
      const tempDir =
        (FileSystem.cacheDirectory || FileSystem.documentDirectory || '') +
        `import_temp_${timestamp}/`;

      console.log('[ZIP Import] Temp directory:', tempDir);

      try {
        console.log('[ZIP Import] Attempting to unzip...');
        await unzip(fileUri, tempDir);
        console.log('[ZIP Import] Unzip successful');
      } catch (unzipError) {
        console.error('[ZIP Import] Unzip failed:', unzipError);
        Alert.alert(
          'Import Failed',
          `Failed to extract zip file: ${unzipError instanceof Error ? unzipError.message : 'Unknown error'}`,
          [{ text: 'OK' }]
        );
        return false;
      }

      // Read data.json
      const dataJsonPath = tempDir + 'data.json';
      console.log('[ZIP Import] Checking for data.json at:', dataJsonPath);

      const dataJsonInfo = await FileSystem.getInfoAsync(dataJsonPath);
      console.log('[ZIP Import] data.json exists:', dataJsonInfo.exists);

      if (!dataJsonInfo.exists) {
        // List what files were extracted to help debug
        try {
          const extractedFiles = await FileSystem.readDirectoryAsync(tempDir);
          console.error('[ZIP Import] Files in temp dir:', extractedFiles);
        } catch (e) {
          console.error('[ZIP Import] Could not list temp dir:', e);
        }

        Alert.alert(
          'Import Failed',
          'Invalid zip file: data.json not found in the archive.',
          [{ text: 'OK' }]
        );
        await FileSystem.deleteAsync(tempDir, { idempotent: true });
        return false;
      }

      console.log('[ZIP Import] Reading data.json...');
      const jsonContent = await FileSystem.readAsStringAsync(dataJsonPath);
      console.log('[ZIP Import] JSON content length:', jsonContent.length);

      try {
        const dataset = JSON.parse(jsonContent);
        console.log('[ZIP Import] Parsed dataset:', {
          hasCharacters: !!dataset.characters,
          characterCount: dataset.characters?.length || 0,
          hasLocations: !!dataset.locations,
          locationCount: dataset.locations?.length || 0,
          hasEvents: !!dataset.events,
          eventCount: dataset.events?.length || 0,
        });
      } catch (parseError) {
        console.error('[ZIP Import] JSON parse error:', parseError);
        Alert.alert(
          'Import Failed',
          `Invalid JSON in data.json: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
          [{ text: 'OK' }]
        );
        await FileSystem.deleteAsync(tempDir, { idempotent: true });
        return false;
      }

      const dataset = JSON.parse(jsonContent);

      // Helper function to read directory recursively
      const readDirRecursive = async (
        dirPath: string
      ): Promise<{ path: string; isDirectory: boolean }[]> => {
        const items = await FileSystem.readDirectoryAsync(dirPath);
        const results: { path: string; isDirectory: boolean }[] = [];

        for (const item of items) {
          const itemPath = dirPath + item;
          const info = await FileSystem.getInfoAsync(itemPath);
          if (info.isDirectory) {
            results.push({ path: itemPath + '/', isDirectory: true });
            const subItems = await readDirRecursive(itemPath + '/');
            results.push(...subItems);
          } else {
            results.push({ path: itemPath, isDirectory: false });
          }
        }

        return results;
      };

      // Extract and restore images - save to permanent storage as files
      console.log('[ZIP Import] Processing images...');
      const allFiles = await readDirRecursive(tempDir);
      console.log(`[ZIP Import] Total files extracted: ${allFiles.length}`);
      const imageFiles = allFiles.filter(
        f => !f.isDirectory && f.path.includes('/images/')
      );
      console.log(`[ZIP Import] Found ${imageFiles.length} image files`);
      if (imageFiles.length > 0) {
        console.log(
          '[ZIP Import] Sample image paths:',
          imageFiles.slice(0, 3).map(f => f.path)
        );
      }

      // Create permanent image directories
      const permanentImageDir = FileSystem.documentDirectory + 'images/';
      await FileSystem.makeDirectoryAsync(permanentImageDir + 'characters/', {
        intermediates: true,
      });
      await FileSystem.makeDirectoryAsync(permanentImageDir + 'locations/', {
        intermediates: true,
      });
      await FileSystem.makeDirectoryAsync(permanentImageDir + 'events/', {
        intermediates: true,
      });
      await FileSystem.makeDirectoryAsync(permanentImageDir + 'factions/', {
        intermediates: true,
      });

      // Group images by entity ID as file URIs (NOT base64 data URIs)
      const imagesByEntity: Record<string, Record<number, string>> = {};

      for (const fileInfo of imageFiles) {
        const filePath = fileInfo.path;
        const filename = filePath.split('/').pop();

        if (filename) {
          // Match pattern: entityId_index.ext or entityId.ext
          // Use non-greedy match up to the last _digits before extension
          const match =
            filename.match(/^(.+?)_(\d+)\.[^.]+$/) ||
            filename.match(/^(.+)\.[^.]+$/);
          if (match) {
            const entityId = match[1];
            const imageIndex = match[2] ? parseInt(match[2]) : 0;

            const entityType = filePath.includes('/characters/')
              ? 'characters'
              : filePath.includes('/locations/')
                ? 'locations'
                : filePath.includes('/events/')
                  ? 'events'
                  : filePath.includes('/factions/')
                    ? 'factions'
                    : '';

            if (entityType) {
              // Copy image to permanent storage
              const permanentPath =
                permanentImageDir + entityType + '/' + filename;
              await FileSystem.copyAsync({
                from: filePath,
                to: permanentPath,
              });

              const entityKey = `${entityType.slice(0, -1)}_${entityId}`;
              if (!imagesByEntity[entityKey]) {
                imagesByEntity[entityKey] = {};
              }
              imagesByEntity[entityKey][imageIndex] = permanentPath;
            }
          }
        }
      }

      console.log(
        `[ZIP Import] Processed ${Object.keys(imagesByEntity).length} entities with images`
      );

      // Apply grouped images to entities
      console.log('[ZIP Import] Applying images to entities...');
      for (const [entityKey, images] of Object.entries(imagesByEntity)) {
        // Entity key format: "character_entityId" or "location_entityId" etc.
        // entityId may contain underscores, so only split on the first underscore
        const firstUnderscoreIndex = entityKey.indexOf('_');
        const entityType = entityKey.substring(0, firstUnderscoreIndex);
        const entityId = entityKey.substring(firstUnderscoreIndex + 1);
        const sortedImages = Object.keys(images)
          .map(k => parseInt(k))
          .sort((a, b) => a - b)
          .map(idx => images[idx]);

        console.log(
          `[ZIP Import] Processing ${entityType} ${entityId}: ${sortedImages.length} images`
        );
        console.log(`[ZIP Import] First image path: ${sortedImages[0]}`);

        if (entityType === 'character') {
          const character = dataset.characters?.find(
            (c: any) => c.id === entityId
          );
          if (character) {
            console.log(
              `[ZIP Import] Found character ${character.name}, setting imageUris to ${sortedImages.length} image(s)`
            );
            character.imageUris = sortedImages;
          } else {
            console.warn(
              `[ZIP Import] Character ${entityId} not found in dataset`
            );
          }
        } else if (entityType === 'location') {
          const location = dataset.locations?.find(
            (l: any) => l.id === entityId
          );
          if (location) {
            console.log(
              `[ZIP Import] Found location ${location.name}, updating imageUris`
            );
            location.imageUris = sortedImages;
          } else {
            console.warn(
              `[ZIP Import] Location ${entityId} not found in dataset`
            );
          }
        } else if (entityType === 'event') {
          const event = dataset.events?.find((e: any) => e.id === entityId);
          if (event) {
            console.log(
              `[ZIP Import] Found event ${event.title}, updating imageUris`
            );
            event.imageUris = sortedImages;
          } else {
            console.warn(`[ZIP Import] Event ${entityId} not found in dataset`);
          }
        } else if (entityType === 'faction') {
          // For factions, entityId is the sanitized faction name
          const faction = dataset.factions?.find(
            (f: any) => f.name.replace(/[^a-zA-Z0-9]/g, '_') === entityId
          );
          if (faction) {
            console.log(
              `[ZIP Import] Found faction ${faction.name}, updating imageUris`
            );
            faction.imageUris = sortedImages;
          } else {
            console.warn(
              `[ZIP Import] Faction ${entityId} not found in dataset`
            );
          }
        }
      }

      // Clean up temp directory
      console.log('[ZIP Import] Cleaning up temp directory...');
      await FileSystem.deleteAsync(tempDir, { idempotent: true });
      console.log('[ZIP Import] Temp directory cleaned up');

      // Import the dataset
      console.log('[ZIP Import] Calling importDataset...');
      const success = await importDataset(JSON.stringify(dataset));
      console.log('[ZIP Import] importDataset result:', success);

      if (success) {
        console.log('[ZIP Import] Import completed successfully');
        Alert.alert(
          'Import Successful',
          'Game data has been imported successfully. All existing data has been replaced.',
          [{ text: 'OK' }]
        );
        return true;
      } else {
        console.error('[ZIP Import] importDataset returned false');
        Alert.alert(
          'Import Failed',
          'The selected file is not a valid game data file.',
          [{ text: 'OK' }]
        );
        return false;
      }
    } else {
      // Handle JSON file (without images). This path explicitly skips
      // images, so a legacy single `imageUri` (often a data: URI or a
      // device-local file:// path) is dropped rather than backfilled into
      // imageUris - there is no image asset coming along with it.
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const dataset = JSON.parse(fileContent);

      // Strip imageUri from all characters
      if (dataset.characters) {
        dataset.characters.forEach((character: any) => {
          delete character.imageUri;
        });
      }

      // Strip imageUri from all locations
      if (dataset.locations) {
        dataset.locations.forEach((location: any) => {
          delete location.imageUri;
        });
      }

      // Strip imageUri from all events
      if (dataset.events) {
        dataset.events.forEach((event: any) => {
          delete event.imageUri;
        });
      }

      // Strip imageUri from all factions
      if (dataset.factions) {
        dataset.factions.forEach((faction: any) => {
          delete faction.imageUri;
        });
      }

      const success = await importDataset(JSON.stringify(dataset));

      if (success) {
        Alert.alert(
          'Import Successful',
          'Game data has been imported successfully (without images). All existing data has been replaced.',
          [{ text: 'OK' }]
        );
        return true;
      } else {
        Alert.alert(
          'Import Failed',
          'The selected file is not a valid game data file.',
          [{ text: 'OK' }]
        );
        return false;
      }
    }
  } catch (error) {
    console.error('[ZIP Import] Unexpected error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('[ZIP Import] Error details:', {
      message: errorMessage,
      stack: errorStack,
    });

    Alert.alert(
      'Import Failed',
      `Failed to import game data: ${errorMessage}\n\nPlease check the file format and try again.`,
      [{ text: 'OK' }]
    );
    return false;
  }
};

/**
 * Import game data from a JSON file (replaces existing data)
 */
export const importCharacterData = async (): Promise<boolean> => {
  return await importCharacterDataNative();
};

/**
 * Merge game data for native platforms (supports both JSON and ZIP files)
 */
const mergeCharacterDataNative = async (): Promise<boolean> => {
  try {
    // Pick a document
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'application/zip'],
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return false;
    }

    const fileUri = result.assets[0].uri;
    const fileName = result.assets[0].name;
    const isZip = fileName.endsWith('.zip');

    let fileContent: string;

    if (isZip) {
      // Handle ZIP file - extract to temp directory
      const timestamp = new Date().getTime();
      const tempDir =
        (FileSystem.cacheDirectory || FileSystem.documentDirectory || '') +
        `merge_temp_${timestamp}/`;

      await unzip(fileUri, tempDir);

      // Read data.json
      const dataJsonPath = tempDir + 'data.json';
      const dataJsonInfo = await FileSystem.getInfoAsync(dataJsonPath);
      if (!dataJsonInfo.exists) {
        Alert.alert('Merge Failed', 'Invalid zip file: data.json not found.', [
          { text: 'OK' },
        ]);
        await FileSystem.deleteAsync(tempDir, { idempotent: true });
        return false;
      }

      const jsonContent = await FileSystem.readAsStringAsync(dataJsonPath);
      const dataset = JSON.parse(jsonContent);

      // Helper function to read directory recursively
      const readDirRecursive = async (
        dirPath: string
      ): Promise<{ path: string; isDirectory: boolean }[]> => {
        const items = await FileSystem.readDirectoryAsync(dirPath);
        const results: { path: string; isDirectory: boolean }[] = [];

        for (const item of items) {
          const itemPath = dirPath + item;
          const info = await FileSystem.getInfoAsync(itemPath);
          if (info.isDirectory) {
            results.push({ path: itemPath + '/', isDirectory: true });
            const subItems = await readDirRecursive(itemPath + '/');
            results.push(...subItems);
          } else {
            results.push({ path: itemPath, isDirectory: false });
          }
        }

        return results;
      };

      // Extract and restore images - save to permanent storage as files
      const allFiles = await readDirRecursive(tempDir);
      const imageFiles = allFiles.filter(
        f => !f.isDirectory && f.path.includes('/images/')
      );

      // Create permanent image directories
      const permanentImageDir = FileSystem.documentDirectory + 'images/';
      await FileSystem.makeDirectoryAsync(permanentImageDir + 'characters/', {
        intermediates: true,
      });
      await FileSystem.makeDirectoryAsync(permanentImageDir + 'locations/', {
        intermediates: true,
      });
      await FileSystem.makeDirectoryAsync(permanentImageDir + 'events/', {
        intermediates: true,
      });
      await FileSystem.makeDirectoryAsync(permanentImageDir + 'factions/', {
        intermediates: true,
      });

      // Group images by entity ID as file URIs (NOT base64 data URIs)
      const imagesByEntity: Record<string, Record<number, string>> = {};

      for (const fileInfo of imageFiles) {
        const filePath = fileInfo.path;
        const filename = filePath.split('/').pop();

        if (filename) {
          // Match pattern: entityId_index.ext or entityId.ext
          // Use non-greedy match up to the last _digits before extension
          const match =
            filename.match(/^(.+?)_(\d+)\.[^.]+$/) ||
            filename.match(/^(.+)\.[^.]+$/);
          if (match) {
            const entityId = match[1];
            const imageIndex = match[2] ? parseInt(match[2]) : 0;

            const entityType = filePath.includes('/characters/')
              ? 'characters'
              : filePath.includes('/locations/')
                ? 'locations'
                : filePath.includes('/events/')
                  ? 'events'
                  : filePath.includes('/factions/')
                    ? 'factions'
                    : '';

            if (entityType) {
              // Copy image to permanent storage
              const permanentPath =
                permanentImageDir + entityType + '/' + filename;
              await FileSystem.copyAsync({
                from: filePath,
                to: permanentPath,
              });

              const entityKey = `${entityType.slice(0, -1)}_${entityId}`;
              if (!imagesByEntity[entityKey]) {
                imagesByEntity[entityKey] = {};
              }
              imagesByEntity[entityKey][imageIndex] = permanentPath;
            }
          }
        }
      }

      // Apply grouped images to entities
      for (const [entityKey, images] of Object.entries(imagesByEntity)) {
        // Entity key format: "character_entityId" or "location_entityId" etc.
        // entityId may contain underscores, so only split on the first underscore
        const firstUnderscoreIndex = entityKey.indexOf('_');
        const entityType = entityKey.substring(0, firstUnderscoreIndex);
        const entityId = entityKey.substring(firstUnderscoreIndex + 1);
        const sortedImages = Object.keys(images)
          .map(k => parseInt(k))
          .sort((a, b) => a - b)
          .map(idx => images[idx]);

        if (entityType === 'character') {
          const character = dataset.characters?.find(
            (c: any) => c.id === entityId
          );
          if (character) {
            character.imageUris = sortedImages;
          }
        } else if (entityType === 'location') {
          const location = dataset.locations?.find(
            (l: any) => l.id === entityId
          );
          if (location) {
            location.imageUris = sortedImages;
          }
        } else if (entityType === 'event') {
          const event = dataset.events?.find((e: any) => e.id === entityId);
          if (event) {
            event.imageUris = sortedImages;
          }
        } else if (entityType === 'faction') {
          // For factions, entityId is the sanitized faction name
          const faction = dataset.factions?.find(
            (f: any) => f.name.replace(/[^a-zA-Z0-9]/g, '_') === entityId
          );
          if (faction) {
            faction.imageUris = sortedImages;
          }
        }
      }

      // Clean up temp directory
      await FileSystem.deleteAsync(tempDir, { idempotent: true });

      fileContent = JSON.stringify(dataset);
    } else {
      // Handle JSON file (without images). This path explicitly skips
      // images, so a legacy single `imageUri` (often a data: URI or a
      // device-local file:// path) is dropped rather than backfilled into
      // imageUris - there is no image asset coming along with it.
      const jsonContent = await FileSystem.readAsStringAsync(fileUri);
      const dataset = JSON.parse(jsonContent);

      // Strip imageUri from all characters
      if (dataset.characters) {
        dataset.characters.forEach((character: any) => {
          delete character.imageUri;
        });
      }

      // Strip imageUri from all locations
      if (dataset.locations) {
        dataset.locations.forEach((location: any) => {
          delete location.imageUri;
        });
      }

      // Strip imageUri from all events
      if (dataset.events) {
        dataset.events.forEach((event: any) => {
          delete event.imageUri;
        });
      }

      // Strip imageUri from all factions
      if (dataset.factions) {
        dataset.factions.forEach((faction: any) => {
          delete faction.imageUri;
        });
      }

      fileContent = JSON.stringify(dataset);
    }

    // Merge the data with conflict resolution
    const result_merge = await mergeDatasetWithConflictResolution(fileContent);

    if (result_merge.success) {
      if (result_merge.conflicts.length > 0) {
        Alert.alert(
          'Conflicts Found',
          `Found ${result_merge.conflicts.length} item(s) with conflicts. You'll be asked to resolve each conflict.`,
          [
            {
              text: 'Resolve Conflicts',
              onPress: async () => {
                await handleMergeConflicts(result_merge.conflicts);
                Alert.alert(
                  'Merge Complete',
                  `Successfully merged ${result_merge.added.length} new items, and resolved conflicts for ${result_merge.conflicts.length} existing items.`,
                  [{ text: 'OK' }]
                );
              },
            },
            {
              text: 'Skip Conflicts',
              style: 'cancel',
              onPress: () => {
                Alert.alert(
                  'Merge Complete',
                  `Successfully merged ${result_merge.added.length} new items. Conflicts were resolved automatically by merging compatible properties.`,
                  [{ text: 'OK' }]
                );
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Merge Successful',
          `Successfully merged ${result_merge.added.length} new items with no conflicts.`,
          [{ text: 'OK' }]
        );
      }
      return true;
    } else {
      Alert.alert(
        'Merge Failed',
        'The selected file is not a valid game data file.',
        [{ text: 'OK' }]
      );
      return false;
    }
  } catch (error) {
    console.error('Merge error:', error);
    Alert.alert(
      'Merge Failed',
      'Failed to merge game data. Please check the file format and try again.',
      [{ text: 'OK' }]
    );
    return false;
  }
};

/**
 * Import and merge game data from a JSON file (keeps existing data)
 */
export const mergeCharacterData = async (): Promise<boolean> => {
  return await mergeCharacterDataNative();
};

/**
 * Show import options dialog
 */
export const showImportOptions = (): void => {
  console.log('showImportOptions called');
  Alert.alert('Import Options', 'Choose how to import game data:', [
    {
      text: 'Cancel',
      style: 'cancel',
      onPress: () => console.log('Import cancelled'),
    },
    {
      text: 'Replace All',
      onPress: async () => {
        console.log('Replace All selected');
        await importCharacterData();
      },
      style: 'destructive',
    },
    {
      text: 'Merge',
      onPress: async () => {
        console.log('Merge selected');
        await mergeCharacterData();
      },
    },
  ]);
};
