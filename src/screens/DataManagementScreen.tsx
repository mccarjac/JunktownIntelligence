import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
  Text,
  Modal,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { clearStorage, importDataset } from '@utils/characterStorage';
import {
  exportCharacterData,
  importCharacterData,
  mergeCharacterData,
} from '@utils/exportImport';
import {
  applyGitHubSyncPlan,
  computeGitHubSyncPlan,
  exportToGitHub,
  importFromGitHub,
  verifyGitHubToken,
  saveGitHubConfig,
  getGitHubConfig,
} from '@utils/gitIntegration';
import type { ConflictResolution, SyncPlan } from '@utils/syncMerge';
import { clearDiscordData } from '@/utils/discordStorage';
import { colors as themeColors } from '@/styles/theme';
import { commonStyles } from '@/styles/commonStyles';
import { SyncConflictModal } from '@components/common/SyncConflictModal';

type ProgressOperation =
  | 'export'
  | 'import'
  | 'merge'
  | 'git-export'
  | 'git-import'
  | 'git-merge';

interface ProgressState {
  visible: boolean;
  message: string;
  operation: ProgressOperation | null;
}

interface PendingSyncPlan {
  plan: SyncPlan;
  remoteCommitSha: string;
}

export const DataManagementScreen: React.FC = () => {
  const [progress, setProgress] = useState<ProgressState>({
    visible: false,
    message: '',
    operation: null,
  });
  const [gitHubConfigured, setGitHubConfigured] = useState<boolean>(false);
  const [lastSync, setLastSync] = useState<string | undefined>(undefined);
  const [tokenDialogVisible, setTokenDialogVisible] = useState<boolean>(false);
  const [tokenInput, setTokenInput] = useState<string>('');
  const [tokenValidating, setTokenValidating] = useState<boolean>(false);
  const [pendingSyncPlan, setPendingSyncPlan] =
    useState<PendingSyncPlan | null>(null);

  // Check GitHub configuration on mount
  React.useEffect(() => {
    const checkConfig = async () => {
      const config = await getGitHubConfig();
      setGitHubConfigured(!!config.token);
      setLastSync(config.sync?.pulledAt || config.lastSync);
    };
    checkConfig();
  }, []);

  const showProgress = (operation: ProgressOperation, message: string) => {
    setProgress({ visible: true, message, operation });
  };

  const hideProgress = () => {
    setProgress({ visible: false, message: '', operation: null });
  };
  const handleClearAll = async () => {
    const confirmClear = () => {
      if (Platform.OS === 'web') {
        return window.confirm(
          'Are you sure you want to delete all game data? This action cannot be undone.'
        );
      } else {
        return new Promise<boolean>(resolve => {
          Alert.alert(
            'Clear All Data',
            'Are you sure you want to delete all game data? This action cannot be undone.',
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => resolve(false),
              },
              {
                text: 'Delete All',
                style: 'destructive',
                onPress: () => resolve(true),
              },
            ]
          );
        });
      }
    };

    const shouldClear = await confirmClear();
    if (shouldClear) {
      await clearStorage();
      await clearDiscordData();
      Alert.alert('Success', 'All game data has been deleted.', [
        { text: 'OK' },
      ]);
    }
  };

  const handleExport = async () => {
    showProgress('export', 'Exporting data...');
    try {
      await exportCharacterData();
    } finally {
      hideProgress();
    }
  };

  const handleImport = async () => {
    showProgress('import', 'Importing data...');
    try {
      const success = await importCharacterData();
      hideProgress();
      if (success) {
        Alert.alert('Success', 'Game data imported successfully.', [
          { text: 'OK' },
        ]);
      }
    } catch {
      hideProgress();
      Alert.alert(
        'Import Failed',
        'An unexpected error occurred during import.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleMerge = async () => {
    showProgress('merge', 'Merging data...');
    try {
      const success = await mergeCharacterData();
      hideProgress();
      if (success) {
        Alert.alert('Success', 'Game data merged successfully.', [
          { text: 'OK' },
        ]);
      }
    } catch {
      hideProgress();
      Alert.alert(
        'Merge Failed',
        'An unexpected error occurred during merge.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleGitHubSetup = () => {
    setTokenInput('');
    setTokenDialogVisible(true);
  };

  const handleTokenSave = async () => {
    if (!tokenInput.trim()) {
      Alert.alert('Error', 'Please enter a valid token.', [{ text: 'OK' }]);
      return;
    }

    setTokenValidating(true);
    const { valid, error } = await verifyGitHubToken(tokenInput.trim());

    if (valid) {
      const config = await getGitHubConfig();
      await saveGitHubConfig({ ...config, token: tokenInput.trim() });
      setTokenValidating(false);
      setTokenDialogVisible(false);
      setGitHubConfigured(true);
      Alert.alert('Success', 'GitHub token saved successfully!', [
        { text: 'OK' },
      ]);
    } else {
      setTokenValidating(false);
      Alert.alert(
        error?.kind === 'offline' ? 'Offline' : 'Invalid Token',
        error?.message ||
          'The token you entered is invalid. Please check and try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleTokenCancel = () => {
    setTokenInput('');
    setTokenDialogVisible(false);
  };

  const applyResolvedSync = async (
    plan: SyncPlan,
    resolutions: Record<string, ConflictResolution>,
    remoteCommitSha: string
  ) => {
    showProgress('git-merge', 'Applying merge...');
    const applied = await applyGitHubSyncPlan(
      plan,
      resolutions,
      remoteCommitSha
    );
    hideProgress();

    if (applied.success) {
      const config = await getGitHubConfig();
      setLastSync(config.sync?.pulledAt || config.lastSync);
      Alert.alert(
        'Sync Successful',
        'Your local data has been merged with the GitHub repository.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Sync Failed',
        applied.error || 'An unexpected error occurred',
        [{ text: 'OK' }]
      );
    }
  };

  const handleGitHubMerge = async () => {
    if (!gitHubConfigured) {
      Alert.alert(
        'GitHub Not Configured',
        'Please set up your GitHub token first.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Set Up', onPress: handleGitHubSetup },
        ]
      );
      return;
    }

    showProgress('git-merge', 'Syncing from GitHub...');
    const result = await computeGitHubSyncPlan();
    hideProgress();

    if (!result.success || !result.plan || !result.remoteCommitSha) {
      Alert.alert(
        'Sync Failed',
        result.error || 'An unexpected error occurred',
        [{ text: 'OK' }]
      );
      return;
    }

    if (result.plan.conflicts.length === 0) {
      await applyResolvedSync(result.plan, {}, result.remoteCommitSha);
      return;
    }

    setPendingSyncPlan({
      plan: result.plan,
      remoteCommitSha: result.remoteCommitSha,
    });
  };

  const handleResolveConflicts = async (
    resolutions: Record<string, ConflictResolution>
  ) => {
    if (!pendingSyncPlan) return;
    const { plan, remoteCommitSha } = pendingSyncPlan;
    setPendingSyncPlan(null);
    await applyResolvedSync(plan, resolutions, remoteCommitSha);
  };

  const handleCancelConflicts = () => {
    setPendingSyncPlan(null);
  };

  const runGitHubExport = async (force: boolean) => {
    showProgress('git-export', 'Exporting to GitHub...');
    try {
      const result = await exportToGitHub({ force });
      hideProgress();

      if (result.success && result.prUrl) {
        Alert.alert(
          'Export Successful',
          `A pull request has been created with your data. You can review it at:\n\n${result.prUrl}`,
          [{ text: 'OK' }]
        );
      } else if (result.remoteMoved) {
        Alert.alert(
          'Repository Has Changed',
          result.error || 'The repository has changed since your last sync.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sync First', onPress: () => handleGitHubMerge() },
            {
              text: 'Export Anyway',
              onPress: () => runGitHubExport(true),
            },
          ]
        );
      } else {
        Alert.alert(
          'Export Failed',
          result.error || 'An unexpected error occurred',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      hideProgress();
      Alert.alert(
        'Export Failed',
        `An unexpected error occurred during export: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleGitHubExport = async () => {
    if (!gitHubConfigured) {
      Alert.alert(
        'GitHub Not Configured',
        'Please set up your GitHub token first.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Set Up', onPress: handleGitHubSetup },
        ]
      );
      return;
    }

    await runGitHubExport(false);
  };

  const performGitHubImport = async () => {
    showProgress('git-import', 'Importing from GitHub...');
    try {
      const result = await importFromGitHub();

      if (result.success && result.data) {
        // Import the data
        const importSuccess = await importDataset(result.data);
        hideProgress();

        if (importSuccess) {
          Alert.alert(
            'Import Successful',
            'Data has been imported from the GitHub repository.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Import Failed',
            'Failed to import the data. Please check the file format.',
            [{ text: 'OK' }]
          );
        }
      } else {
        hideProgress();
        Alert.alert(
          'Import Failed',
          result.error || 'An unexpected error occurred',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      hideProgress();
      Alert.alert(
        'Import Failed',
        `An unexpected error occurred during import: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleGitHubImport = () => {
    if (!gitHubConfigured) {
      Alert.alert(
        'GitHub Not Configured',
        'Please set up your GitHub token first.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Set Up', onPress: handleGitHubSetup },
        ]
      );
      return;
    }

    Alert.alert(
      'Replace Local Data?',
      'This overwrites your local characters, factions, events, and quests with the version from GitHub. Any local edits not yet exported will be lost. Use "Sync from GitHub (Merge)" instead to keep your local changes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Replace',
          style: 'destructive',
          onPress: () => performGitHubImport(),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
      >
        <Text style={styles.header}>Data Management</Text>
        <Text style={styles.description}>
          Manage your game data with import, export, merge, and backup options.
        </Text>

        {/* JSON Data Management Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>JSON Data Management</Text>
          <Text style={styles.sectionDescription}>
            Export, import, or merge your game data using JSON files for backup
            or sharing.
          </Text>

          <TouchableOpacity
            style={[styles.actionButton, styles.exportButton]}
            onPress={handleExport}
          >
            <Text style={styles.buttonText}>Export Game Data</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.importButton]}
            onPress={handleImport}
          >
            <Text style={styles.buttonText}>Import & Replace</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.mergeButton]}
            onPress={handleMerge}
          >
            <Text style={styles.buttonText}>Merge Data</Text>
          </TouchableOpacity>
        </View>

        {/* GitHub Integration Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>GitHub Repository Sync</Text>
          <Text style={styles.sectionDescription}>
            Share data with other users through the AWInvestigationsDataLibrary
            GitHub repository. Exports create pull requests for review.
          </Text>
          {gitHubConfigured && (
            <Text style={styles.syncStatusText}>
              {lastSync
                ? `Last synced: ${new Date(lastSync).toLocaleString()}`
                : 'Never synced'}
            </Text>
          )}

          {!gitHubConfigured && (
            <TouchableOpacity
              style={[styles.actionButton, styles.setupButton]}
              onPress={handleGitHubSetup}
            >
              <Text style={styles.buttonText}>Set Up GitHub Token</Text>
            </TouchableOpacity>
          )}

          {gitHubConfigured && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.gitMergeButton]}
                onPress={handleGitHubMerge}
              >
                <Text style={styles.buttonText}>Sync from GitHub (Merge)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.gitExportButton]}
                onPress={handleGitHubExport}
              >
                <Text style={styles.buttonText}>
                  Export to GitHub (Create PR)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.gitImportButton]}
                onPress={handleGitHubImport}
              >
                <Text style={styles.buttonText}>
                  Import from GitHub (Replace)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.setupButton]}
                onPress={handleGitHubSetup}
              >
                <Text style={styles.buttonText}>Update GitHub Token</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Danger Zone */}
        <View style={[styles.section, styles.dangerSection]}>
          <Text style={[styles.sectionTitle, styles.dangerTitle]}>
            Danger Zone
          </Text>
          <Text style={styles.sectionDescription}>
            Irreversible actions that will permanently delete your data.
          </Text>
          <TouchableOpacity
            style={[styles.actionButton, styles.clearButton]}
            onPress={handleClearAll}
          >
            <Text style={styles.buttonText}>Clear All Data</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Progress Modal */}
      <Modal
        visible={progress.visible}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ActivityIndicator
              size="large"
              color={themeColors.accent.primary}
            />
            <Text style={styles.modalText}>{progress.message}</Text>
            <Text style={styles.modalSubText}>Please wait...</Text>
          </View>
        </View>
      </Modal>

      {/* GitHub Token Input Modal */}
      <Modal
        visible={tokenDialogVisible}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.tokenModalContent}>
            <Text style={styles.modalTitle}>GitHub Personal Access Token</Text>
            <Text style={styles.tokenModalDescription}>
              Enter your GitHub Personal Access Token with repo permissions. You
              can create one at:
            </Text>
            <Text style={styles.tokenModalLink}>
              https://github.com/settings/tokens
            </Text>

            <TextInput
              style={styles.tokenInput}
              value={tokenInput}
              onChangeText={setTokenInput}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              placeholderTextColor={themeColors.text.muted}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={true}
              editable={!tokenValidating}
            />

            {tokenValidating && (
              <ActivityIndicator
                size="small"
                color={themeColors.accent.primary}
                style={styles.tokenValidatingSpinner}
              />
            )}

            <View style={styles.tokenModalButtons}>
              <TouchableOpacity
                style={[styles.tokenModalButton, styles.tokenModalCancelButton]}
                onPress={handleTokenCancel}
                disabled={tokenValidating}
              >
                <Text style={styles.tokenModalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tokenModalButton, styles.tokenModalSaveButton]}
                onPress={handleTokenSave}
                disabled={tokenValidating}
              >
                <Text style={styles.tokenModalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <SyncConflictModal
        visible={!!pendingSyncPlan}
        conflicts={pendingSyncPlan?.plan.conflicts || []}
        onResolve={handleResolveConflicts}
        onCancel={handleCancelConflicts}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: commonStyles.layout.container,
  scrollView: commonStyles.layout.scrollView,
  contentContainer: commonStyles.layout.contentContainer,
  header: commonStyles.text.h1,
  description: {
    ...commonStyles.text.bodyLarge,
    marginBottom: 32,
    lineHeight: 24,
  },
  section: commonStyles.layout.section,
  dangerSection: commonStyles.layout.sectionDanger,
  sectionTitle: commonStyles.text.h2,
  dangerTitle: {
    ...commonStyles.text.h2,
    color: themeColors.accent.danger,
  },
  sectionDescription: {
    ...commonStyles.text.description,
    marginBottom: 16,
    lineHeight: 20,
  },
  syncStatusText: {
    ...commonStyles.text.body,
    color: themeColors.text.muted,
    marginBottom: 12,
  },
  actionButton: commonStyles.button.base,
  exportButton: {
    ...commonStyles.button.warning,
    marginBottom: 12,
  },
  importButton: {
    ...commonStyles.button.secondary,
    marginBottom: 12,
  },
  mergeButton: commonStyles.button.primary,
  setupButton: {
    backgroundColor: themeColors.elevated,
    borderColor: themeColors.accent.secondary,
    marginBottom: 12,
  },
  gitMergeButton: {
    backgroundColor: themeColors.accent.primary,
    marginBottom: 12,
  },
  gitExportButton: {
    backgroundColor: themeColors.accent.success,
    marginBottom: 12,
  },
  gitImportButton: {
    backgroundColor: themeColors.accent.info,
    marginBottom: 12,
  },
  clearButton: commonStyles.button.danger,
  buttonText: commonStyles.button.text,
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: themeColors.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 280,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  modalText: {
    ...commonStyles.text.h3,
    marginTop: 16,
    textAlign: 'center',
  },
  modalSubText: {
    ...commonStyles.text.body,
    marginTop: 8,
    textAlign: 'center',
    color: themeColors.text.muted,
  },
  tokenModalContent: {
    backgroundColor: themeColors.surface,
    borderRadius: 16,
    padding: 24,
    minWidth: 320,
    maxWidth: 400,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  modalTitle: {
    ...commonStyles.text.h3,
    marginBottom: 12,
    textAlign: 'center',
  },
  tokenModalDescription: {
    ...commonStyles.text.body,
    marginBottom: 8,
    textAlign: 'center',
    color: themeColors.text.secondary,
    lineHeight: 20,
  },
  tokenModalLink: {
    ...commonStyles.text.body,
    marginBottom: 20,
    textAlign: 'center',
    color: themeColors.accent.info,
    fontSize: 12,
  },
  tokenInput: {
    backgroundColor: themeColors.elevated,
    borderColor: themeColors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: themeColors.text.primary,
    marginBottom: 16,
    width: '100%',
  },
  tokenValidatingSpinner: {
    marginBottom: 16,
  },
  tokenModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  tokenModalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenModalCancelButton: {
    backgroundColor: themeColors.elevated,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  tokenModalSaveButton: {
    backgroundColor: themeColors.accent.primary,
  },
  tokenModalButtonText: {
    ...commonStyles.text.body,
    fontWeight: '600',
    color: themeColors.text.primary,
  },
});
