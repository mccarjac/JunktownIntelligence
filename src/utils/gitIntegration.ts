import { Octokit } from '@octokit/rest';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert } from 'react-native';
import { Buffer } from 'buffer';
import { exportDataset } from './characterStorage';
import { sortDatasetDeterministically } from './datasetSorting';

/**
 * Configuration for the data library repository
 */
const DATA_REPO_OWNER = 'mccarjac';
const DATA_REPO_NAME = 'AWInvestigationsDataLibrary';
const DATA_REPO_BRANCH = 'main';

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
 * GitHub configuration storage keys
 */
const GITHUB_CONFIG_KEY = '@github_config';

interface GitHubConfig {
  token?: string;
  lastSync?: string;
}

/**
 * Get stored GitHub configuration
 */
export const getGitHubConfig = async (): Promise<GitHubConfig> => {
  try {
    const configStr = await FileSystem.readAsStringAsync(
      FileSystem.documentDirectory + GITHUB_CONFIG_KEY
    );
    return JSON.parse(configStr);
  } catch {
    return {};
  }
};

/**
 * Save GitHub configuration
 */
export const saveGitHubConfig = async (config: GitHubConfig): Promise<void> => {
  try {
    await FileSystem.writeAsStringAsync(
      FileSystem.documentDirectory + GITHUB_CONFIG_KEY,
      JSON.stringify(config)
    );
  } catch (error) {
    console.error('Failed to save GitHub config:', error);
  }
};

/**
 * Initialize Octokit with token
 */
const getOctokit = async (): Promise<Octokit | null> => {
  const config = await getGitHubConfig();
  if (!config.token) {
    return null;
  }
  return new Octokit({ auth: config.token });
};

/**
 * Verify GitHub token is valid
 */
export const verifyGitHubToken = async (token: string): Promise<boolean> => {
  try {
    const octokit = new Octokit({ auth: token });
    await octokit.rest.users.getAuthenticated();
    return true;
  } catch {
    return false;
  }
};

/**
 * Check if the data repository exists and is accessible
 */
const verifyRepository = async (
  octokit: Octokit
): Promise<{ exists: boolean; error?: string }> => {
  try {
    await octokit.rest.repos.get({
      owner: DATA_REPO_OWNER,
      repo: DATA_REPO_NAME,
    });
    return { exists: true };
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as { status: number }).status;
      if (status === 404) {
        return {
          exists: false,
          error: `Repository ${DATA_REPO_OWNER}/${DATA_REPO_NAME} not found. Please ensure the repository exists and your token has access to it.`,
        };
      }
      if (status === 403) {
        return {
          exists: false,
          error: 'Access denied. Please check your token permissions.',
        };
      }
    }
    return {
      exists: false,
      error: 'Failed to verify repository access.',
    };
  }
};

/**
 * Export data to GitHub repository by creating a Pull Request
 */
export const exportToGitHub = async (): Promise<{
  success: boolean;
  prUrl?: string;
  error?: string;
}> => {
  try {
    const octokit = await getOctokit();
    if (!octokit) {
      return {
        success: false,
        error: 'GitHub token not configured. Please set up your token first.',
      };
    }

    // Verify repository exists and is accessible
    const repoCheck = await verifyRepository(octokit);
    if (!repoCheck.exists) {
      return {
        success: false,
        error: repoCheck.error || 'Repository verification failed.',
      };
    }

    // Get the current user info
    const { data: user } = await octokit.rest.users.getAuthenticated();
    const branchName = `data-export-${Date.now()}`;

    // Get the default branch's latest commit SHA
    const { data: ref } = await octokit.rest.git.getRef({
      owner: DATA_REPO_OWNER,
      repo: DATA_REPO_NAME,
      ref: `heads/${DATA_REPO_BRANCH}`,
    });
    const baseSha = ref.object.sha;

    // Create a new branch from the base
    await octokit.rest.git.createRef({
      owner: DATA_REPO_OWNER,
      repo: DATA_REPO_NAME,
      ref: `refs/heads/${branchName}`,
      sha: baseSha,
    });

    // Export all data
    const jsonData = await exportDataset();
    const dataset = JSON.parse(jsonData);

    // Check if file exists
    let fileSha: string | undefined;
    try {
      const { data: existingFile } = await octokit.rest.repos.getContent({
        owner: DATA_REPO_OWNER,
        repo: DATA_REPO_NAME,
        path: 'data.json',
        ref: branchName,
      });
      if ('sha' in existingFile) {
        fileSha = existingFile.sha;
      }
    } catch {
      // File doesn't exist, that's fine
    }

    // Process and upload images
    const imageFiles: Array<{
      path: string;
      content: string;
      entityType: string;
      entityId: string;
    }> = [];

    // Helper function to process images for an entity
    const processEntityImages = async (
      entity: any,
      entityType: 'characters' | 'locations' | 'events' | 'factions',
      entityId: string
    ) => {
      const images: string[] = [];

      // Handle multiple images
      if (entity.imageUris && entity.imageUris.length > 0) {
        for (let i = 0; i < entity.imageUris.length; i++) {
          const uri = entity.imageUris[i];
          if (uri) {
            if (uri.startsWith('data:')) {
              // Handle base64 data URI
              const imageData = extractImageData(uri);
              if (imageData) {
                const filename = `images/${entityType}/${entityId}_${i}.${imageData.extension}`;
                imageFiles.push({
                  path: filename,
                  content: imageData.base64Data,
                  entityType,
                  entityId,
                });
                images.push(filename);
              }
            } else if (uri.startsWith('file://') || uri.startsWith('/')) {
              // Handle file URI - read file and convert to base64
              try {
                const fileUri = uri.startsWith('file://')
                  ? uri
                  : `file://${uri}`;
                const base64Data = await FileSystem.readAsStringAsync(fileUri, {
                  encoding: FileSystem.EncodingType.Base64,
                });
                const extension = uri.split('.').pop()?.toLowerCase() || 'jpg';
                const filename = `images/${entityType}/${entityId}_${i}.${extension}`;
                imageFiles.push({
                  path: filename,
                  content: base64Data,
                  entityType,
                  entityId,
                });
                images.push(filename);
              } catch (error) {
                console.error(`Failed to read image file: ${uri}`, error);
                // Skip this image if we can't read it
              }
            }
          }
        }
      }
      // Handle legacy single image
      else if (entity.imageUri) {
        const uri = entity.imageUri;
        if (uri.startsWith('data:')) {
          const imageData = extractImageData(uri);
          if (imageData) {
            const filename = `images/${entityType}/${entityId}.${imageData.extension}`;
            imageFiles.push({
              path: filename,
              content: imageData.base64Data,
              entityType,
              entityId,
            });
            images.push(filename);
          }
        } else if (uri.startsWith('file://') || uri.startsWith('/')) {
          try {
            const fileUri = uri.startsWith('file://') ? uri : `file://${uri}`;
            const base64Data = await FileSystem.readAsStringAsync(fileUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            const extension = uri.split('.').pop()?.toLowerCase() || 'jpg';
            const filename = `images/${entityType}/${entityId}.${extension}`;
            imageFiles.push({
              path: filename,
              content: base64Data,
              entityType,
              entityId,
            });
            images.push(filename);
          } catch (error) {
            console.error(`Failed to read image file: ${uri}`, error);
          }
        }
      }

      return images;
    };

    // Process images for all entities
    let totalImages = 0;
    console.log('[GitHub Export] Processing images for export...');
    if (dataset.characters) {
      for (const character of dataset.characters) {
        const images = await processEntityImages(
          character,
          'characters',
          character.id
        );
        if (images.length > 0) {
          character.imageUris = images;
          totalImages += images.length;
          console.log(
            `[GitHub Export] Processed ${images.length} images for character: ${character.name}`
          );
        }
      }
    }

    if (dataset.locations) {
      for (const location of dataset.locations) {
        const images = await processEntityImages(
          location,
          'locations',
          location.id
        );
        if (images.length > 0) {
          location.imageUris = images;
          totalImages += images.length;
          console.log(
            `[GitHub Export] Processed ${images.length} images for location: ${location.name}`
          );
        }
      }
    }

    if (dataset.events) {
      for (const event of dataset.events) {
        const images = await processEntityImages(event, 'events', event.id);
        if (images.length > 0) {
          event.imageUris = images;
          totalImages += images.length;
          console.log(
            `[GitHub Export] Processed ${images.length} images for event: ${event.title}`
          );
        }
      }
    }

    if (dataset.factions) {
      for (const faction of dataset.factions) {
        const safeName = faction.name.replace(/[^a-zA-Z0-9]/g, '_');
        const images = await processEntityImages(faction, 'factions', safeName);
        if (images.length > 0) {
          faction.imageUris = images;
          totalImages += images.length;
          console.log(
            `[GitHub Export] Processed ${images.length} images for faction: ${faction.name}`
          );
        }
      }
    }

    console.log(`[GitHub Export] Total images to upload: ${totalImages}`);

    // Sort the dataset deterministically to minimize diff noise
    const sortedDataset = sortDatasetDeterministically(dataset);

    // Update data.json with modified paths
    // Note: This happens AFTER image processing because we need to update
    // the imageUris fields in the dataset to point to the relative paths in
    // the repository (e.g., "images/characters/id_0.jpg")
    const updatedDataContent = Buffer.from(
      JSON.stringify(sortedDataset, null, 2)
    ).toString('base64');

    // Create or update the data.json file
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: DATA_REPO_OWNER,
      repo: DATA_REPO_NAME,
      path: 'data.json',
      message: `Data export by ${user.login} on ${new Date().toISOString()}`,
      content: updatedDataContent,
      branch: branchName,
      sha: fileSha,
    });

    // Upload all image files to the repository
    // Note: The branch is created from the base branch, so files that exist in the base
    // will also exist in the new branch and we need to provide their SHA when updating
    console.log(
      `[GitHub Export] Uploading ${imageFiles.length} images to GitHub...`
    );
    let uploadedCount = 0;
    // Get the latest commit for the branch to build on
    const { data: refData } = await octokit.rest.git.getRef({
      owner: DATA_REPO_OWNER,
      repo: DATA_REPO_NAME,
      ref: `heads/${branchName}`,
    });
    const latestCommitSha = refData.object.sha;

    // Get the tree for the latest commit
    const { data: latestCommit } = await octokit.rest.git.getCommit({
      owner: DATA_REPO_OWNER,
      repo: DATA_REPO_NAME,
      commit_sha: latestCommitSha,
    });
    const baseTreeSha = latestCommit.tree.sha;

    // Create blobs for all images
    const treeItems: Array<{
      path: string;
      mode: '100644';
      type: 'blob';
      sha: string;
    }> = [];

    for (const imageFile of imageFiles) {
      try {
        // Clean base64 content - remove any whitespace that might have been added during encoding
        const cleanBase64 = imageFile.content.replace(/[\r\n\s]/g, '');

        // Create a blob for the image
        const { data: blob } = await octokit.rest.git.createBlob({
          owner: DATA_REPO_OWNER,
          repo: DATA_REPO_NAME,
          content: cleanBase64,
          encoding: 'base64',
        });

        treeItems.push({
          path: imageFile.path,
          mode: '100644',
          type: 'blob',
          sha: blob.sha,
        });

        uploadedCount++;
        console.log(
          `[GitHub Export] Created blob for image ${uploadedCount}/${imageFiles.length}: ${imageFile.path}`
        );
      } catch (error) {
        console.error(
          `[GitHub Export] Failed to create blob for image ${imageFile.path}:`,
          error
        );
        // Continue with other images even if one fails
      }
    }

    // Create a new tree with all the image blobs
    const { data: newTree } = await octokit.rest.git.createTree({
      owner: DATA_REPO_OWNER,
      repo: DATA_REPO_NAME,
      base_tree: baseTreeSha,
      tree: treeItems,
    });

    // Create a commit with the new tree
    const { data: newCommit } = await octokit.rest.git.createCommit({
      owner: DATA_REPO_OWNER,
      repo: DATA_REPO_NAME,
      message: `Upload ${treeItems.length} images`,
      tree: newTree.sha,
      parents: [latestCommitSha],
    });

    // Update the branch reference to point to the new commit
    await octokit.rest.git.updateRef({
      owner: DATA_REPO_OWNER,
      repo: DATA_REPO_NAME,
      ref: `heads/${branchName}`,
      sha: newCommit.sha,
    });
    console.log(
      `[GitHub Export] Successfully uploaded ${uploadedCount}/${imageFiles.length} images`
    );

    // Create Pull Request
    const { data: pr } = await octokit.rest.pulls.create({
      owner: DATA_REPO_OWNER,
      repo: DATA_REPO_NAME,
      title: `Data export by ${user.login}`,
      head: branchName,
      base: DATA_REPO_BRANCH,
      body: `Automated data export from Junktown Intelligence.

**Export Details:**
- User: ${user.login}
- Date: ${new Date().toLocaleString()}
- Characters: ${dataset.characters?.length || 0}
- Factions: ${dataset.factions?.length || 0}
- Locations: ${dataset.locations?.length || 0}
- Events: ${dataset.events?.length || 0}
- Images: ${totalImages}

Please review the changes before merging.`,
    });

    // Update last sync time
    const config = await getGitHubConfig();
    await saveGitHubConfig({
      ...config,
      lastSync: new Date().toISOString(),
    });

    return {
      success: true,
      prUrl: pr.html_url,
    };
  } catch (error) {
    console.error('Export to GitHub failed:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
};

/**
 * Import data from GitHub repository
 */
export const importFromGitHub = async (): Promise<{
  success: boolean;
  data?: string;
  error?: string;
}> => {
  try {
    const octokit = await getOctokit();
    if (!octokit) {
      return {
        success: false,
        error: 'GitHub token not configured. Please set up your token first.',
      };
    }

    // Verify repository exists and is accessible
    const repoCheck = await verifyRepository(octokit);
    if (!repoCheck.exists) {
      return {
        success: false,
        error: repoCheck.error || 'Repository verification failed.',
      };
    }

    // Fetch data.json from the main branch
    const { data: file } = await octokit.rest.repos.getContent({
      owner: DATA_REPO_OWNER,
      repo: DATA_REPO_NAME,
      path: 'data.json',
      ref: DATA_REPO_BRANCH,
    });

    if ('content' in file) {
      const content = Buffer.from(file.content, 'base64').toString('utf-8');
      const dataset = JSON.parse(content);

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

      // Helper function to download and save images
      const downloadImages = async (
        imagePaths: string[]
      ): Promise<string[]> => {
        const localPaths: string[] = [];

        for (const imagePath of imagePaths) {
          try {
            // First try to get the file metadata to get its blob SHA
            const { data: fileInfo } = await octokit.rest.repos.getContent({
              owner: DATA_REPO_OWNER,
              repo: DATA_REPO_NAME,
              path: imagePath,
              ref: DATA_REPO_BRANCH,
            });

            if (
              'sha' in fileInfo &&
              'size' in fileInfo &&
              typeof fileInfo.size === 'number'
            ) {
              // Determine local path for the image
              const filename = imagePath.split('/').pop() || 'image.jpg';
              const entityType = imagePath.split('/')[1]; // characters, locations, events, or factions
              const localPath = permanentImageDir + entityType + '/' + filename;

              // Check if image already exists locally
              const localFileInfo = await FileSystem.getInfoAsync(localPath);

              if (
                localFileInfo.exists &&
                typeof localFileInfo.size === 'number' &&
                localFileInfo.size === fileInfo.size
              ) {
                // Image already exists with the same size - skip download
                localPaths.push(localPath);
                console.log(
                  `[GitHub Import] Image already exists (${fileInfo.size} bytes): ${imagePath} -> ${localPath}`
                );
              } else {
                // Image doesn't exist, has different size, or size check failed - download it
                // Use Git Blob API to fetch the content directly (no size limit)
                const { data: blob } = await octokit.rest.git.getBlob({
                  owner: DATA_REPO_OWNER,
                  repo: DATA_REPO_NAME,
                  file_sha: fileInfo.sha,
                });

                // Git Blob API returns base64 content - remove any whitespace
                const cleanBase64 = blob.content.replace(/\s/g, '');

                await FileSystem.writeAsStringAsync(localPath, cleanBase64, {
                  encoding: FileSystem.EncodingType.Base64,
                });

                localPaths.push(localPath);
                console.log(
                  `[GitHub Import] Successfully downloaded image (${fileInfo.size} bytes): ${imagePath} -> ${localPath}`
                );
              }
            }
          } catch (error) {
            console.error(
              `[GitHub Import] Failed to download image ${imagePath}:`,
              error
            );
            // Continue with other images even if one fails
          }
        }

        return localPaths;
      };

      // Process images for characters
      let totalImagesDownloaded = 0;
      if (dataset.characters) {
        for (const character of dataset.characters) {
          if (character.imageUris && character.imageUris.length > 0) {
            console.log(
              `[GitHub Import] Processing ${character.imageUris.length} images for character: ${character.name}`
            );
            const localPaths = await downloadImages(character.imageUris);
            if (localPaths.length > 0) {
              character.imageUris = localPaths;
              totalImagesDownloaded += localPaths.length;
            } else {
              console.warn(
                `[GitHub Import] No images downloaded for character: ${character.name}`
              );
              // Clear image references if download failed
              delete character.imageUri;
              delete character.imageUris;
            }
          } else if (character.imageUri) {
            // Legacy single-image field from an older export/repo - download
            // it and normalize onto imageUris, dropping the deprecated field.
            console.log(
              `[GitHub Import] Processing single image for character: ${character.name}`
            );
            const localPaths = await downloadImages([character.imageUri]);
            delete character.imageUri;
            if (localPaths.length > 0) {
              character.imageUris = localPaths;
              totalImagesDownloaded += localPaths.length;
            } else {
              console.warn(
                `[GitHub Import] No image downloaded for character: ${character.name}`
              );
              // Clear image references if download failed
              delete character.imageUris;
            }
          }
        }
      }

      // Process images for locations
      if (dataset.locations) {
        for (const location of dataset.locations) {
          if (location.imageUris && location.imageUris.length > 0) {
            console.log(
              `[GitHub Import] Processing ${location.imageUris.length} images for location: ${location.name}`
            );
            const localPaths = await downloadImages(location.imageUris);
            if (localPaths.length > 0) {
              location.imageUris = localPaths;
              totalImagesDownloaded += localPaths.length;
            } else {
              console.warn(
                `[GitHub Import] No images downloaded for location: ${location.name}`
              );
              // Clear image references if download failed
              delete location.imageUri;
              delete location.imageUris;
            }
          } else if (location.imageUri) {
            // Legacy single-image field from an older export/repo - download
            // it and normalize onto imageUris, dropping the deprecated field.
            console.log(
              `[GitHub Import] Processing single image for location: ${location.name}`
            );
            const localPaths = await downloadImages([location.imageUri]);
            delete location.imageUri;
            if (localPaths.length > 0) {
              location.imageUris = localPaths;
              totalImagesDownloaded += localPaths.length;
            } else {
              console.warn(
                `[GitHub Import] No image downloaded for location: ${location.name}`
              );
              // Clear image references if download failed
              delete location.imageUris;
            }
          }
        }
      }

      // Process images for events
      if (dataset.events) {
        for (const event of dataset.events) {
          if (event.imageUris && event.imageUris.length > 0) {
            console.log(
              `[GitHub Import] Processing ${event.imageUris.length} images for event: ${event.title}`
            );
            const localPaths = await downloadImages(event.imageUris);
            if (localPaths.length > 0) {
              event.imageUris = localPaths;
              totalImagesDownloaded += localPaths.length;
            } else {
              console.warn(
                `[GitHub Import] No images downloaded for event: ${event.title}`
              );
              // Clear image references if download failed
              delete event.imageUri;
              delete event.imageUris;
            }
          } else if (event.imageUri) {
            // Legacy single-image field from an older export/repo - download
            // it and normalize onto imageUris, dropping the deprecated field.
            console.log(
              `[GitHub Import] Processing single image for event: ${event.title}`
            );
            const localPaths = await downloadImages([event.imageUri]);
            delete event.imageUri;
            if (localPaths.length > 0) {
              event.imageUris = localPaths;
              totalImagesDownloaded += localPaths.length;
            } else {
              console.warn(
                `[GitHub Import] No image downloaded for event: ${event.title}`
              );
              // Clear image references if download failed
              delete event.imageUris;
            }
          }
        }
      }

      // Process images for factions
      if (dataset.factions) {
        for (const faction of dataset.factions) {
          if (faction.imageUris && faction.imageUris.length > 0) {
            console.log(
              `[GitHub Import] Processing ${faction.imageUris.length} images for faction: ${faction.name}`
            );
            const localPaths = await downloadImages(faction.imageUris);
            if (localPaths.length > 0) {
              faction.imageUris = localPaths;
              totalImagesDownloaded += localPaths.length;
            } else {
              console.warn(
                `[GitHub Import] No images downloaded for faction: ${faction.name}`
              );
              // Clear image references if download failed
              delete faction.imageUri;
              delete faction.imageUris;
            }
          } else if (faction.imageUri) {
            // Legacy single-image field from an older export/repo - download
            // it and normalize onto imageUris, dropping the deprecated field.
            console.log(
              `[GitHub Import] Processing single image for faction: ${faction.name}`
            );
            const localPaths = await downloadImages([faction.imageUri]);
            delete faction.imageUri;
            if (localPaths.length > 0) {
              faction.imageUris = localPaths;
              totalImagesDownloaded += localPaths.length;
            } else {
              console.warn(
                `[GitHub Import] No image downloaded for faction: ${faction.name}`
              );
              // Clear image references if download failed
              delete faction.imageUris;
            }
          }
        }
      }

      console.log(
        `[GitHub Import] Total images downloaded: ${totalImagesDownloaded}`
      );

      // Update last sync time
      const config = await getGitHubConfig();
      await saveGitHubConfig({
        ...config,
        lastSync: new Date().toISOString(),
      });

      return {
        success: true,
        data: JSON.stringify(dataset),
      };
    } else {
      return {
        success: false,
        error: 'File not found or is a directory',
      };
    }
  } catch (error) {
    console.error('Import from GitHub failed:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
};

/**
 * Show GitHub token configuration dialog
 */
export const showGitHubTokenDialog = (): Promise<string | null> => {
  return new Promise(resolve => {
    Alert.prompt(
      'GitHub Personal Access Token',
      'Enter your GitHub Personal Access Token with repo permissions. You can create one at: https://github.com/settings/tokens',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(null),
        },
        {
          text: 'Save',
          onPress: async (token?: string) => {
            if (token && token.trim()) {
              const isValid = await verifyGitHubToken(token.trim());
              if (isValid) {
                const config = await getGitHubConfig();
                await saveGitHubConfig({ ...config, token: token.trim() });
                Alert.alert('Success', 'GitHub token saved successfully!', [
                  { text: 'OK' },
                ]);
                resolve(token.trim());
              } else {
                Alert.alert(
                  'Invalid Token',
                  'The token you entered is invalid. Please check and try again.',
                  [{ text: 'OK' }]
                );
                resolve(null);
              }
            } else {
              resolve(null);
            }
          },
        },
      ],
      'plain-text'
    );
  });
};

/**
 * Check if GitHub is configured
 */
export const isGitHubConfigured = async (): Promise<boolean> => {
  const config = await getGitHubConfig();
  return !!config.token;
};
