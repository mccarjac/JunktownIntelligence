# GitHub Sync Diff Enhancement - Implementation Guide

## Problem

When exporting data to GitHub for version control, the `data.json` file had entities in random order, making diffs very large and hard to review. For example, changing a single character's name could result in hundreds of lines of diff if the export order changed.

## Solution

Implemented deterministic sorting for all exported data to ensure consistent ordering across exports. This minimizes diff noise and makes GitHub Pull Requests much easier to review.

## Implementation Details

### New Sorting Utility: `src/utils/datasetSorting.ts`

Created a comprehensive sorting utility that handles:

1. **Character Sorting**:
   - Primary sort: By name (case-insensitive)
   - Tiebreaker: By id (alphabetically)
   - Nested arrays sorted: factions, relationships, perkIds, distinctionIds, cyberware, imageUris

2. **Faction Sorting**:
   - Sort by name (case-insensitive)
   - Nested arrays sorted: relationships, imageUris

3. **Location Sorting**:
   - Primary sort: By name (case-insensitive)
   - Tiebreaker: By id (alphabetically)
   - Nested arrays sorted: imageUris

4. **Event Sorting**:
   - Primary sort: By date (descending - most recent events first)
   - Tiebreaker: By id (alphabetically)
   - Nested arrays sorted: characterIds, factionNames, imageUris

### Integration Points

The sorting is applied in three key export functions:

1. **`exportDataset()` in `characterStorage.ts`**:
   - Used by all export operations
   - Ensures consistent JSON output

2. **`exportToGitHub()` in `gitIntegration.ts`**:
   - Used when syncing data to GitHub repository
   - Ensures PR diffs are minimal and meaningful

3. **`exportCharacterDataNative()` in `exportImport.ts`**:
   - Used when exporting ZIP files
   - Ensures consistent data.json within ZIP exports

## Testing

Created comprehensive test suite in `tst/utils/datasetSorting.test.ts` that covers:

- Sorting for each entity type
- Nested array sorting
- Case-insensitive sorting
- Tiebreaker logic (when primary sort values are equal)
- Edge cases (empty arrays, missing fields)
- Immutability (original dataset is not modified)

## Expected Benefits

### Before This Change

```diff
{
  "characters": [
-   {"id": "3", "name": "Charlie", ...},
-   {"id": "1", "name": "Alice", ...},
-   {"id": "2", "name": "Bob", ...}
+   {"id": "2", "name": "Bob", ...},
+   {"id": "1", "name": "Alice", ...},
+   {"id": "3", "name": "Charlie", ...}
  ]
}
```

_Changing order creates large, meaningless diffs_

### After This Change

```diff
{
  "characters": [
    {"id": "1", "name": "Alice", ...},
-   {"id": "2", "name": "Bob", "age": 25, ...},
+   {"id": "2", "name": "Bob", "age": 26, ...},
    {"id": "3", "name": "Charlie", ...}
  ]
}
```

_Only actual changes show in the diff_

## Usage

The sorting is applied automatically - no changes needed to existing code. All export operations now produce consistently sorted output.

### Example: Exporting to GitHub

1. User clicks "Export to GitHub (Create PR)" in Data Management screen
2. Data is collected from AsyncStorage
3. **Sorting is applied automatically** via `sortDatasetDeterministically()`
4. Sorted data is committed to GitHub
5. Pull Request shows only meaningful changes

## Performance Impact

Minimal performance impact:

- Sorting is O(n log n) for each entity type
- Runs only during export operations (not during normal app usage)
- Typically completes in milliseconds even with hundreds of entities

## Future Enhancements

Potential improvements for the future:

1. **Custom sort order**: Allow users to configure sort preferences
2. **Partial sorting**: Option to sort only specific entity types
3. **Sort on import**: Optionally sort imported data for consistency
4. **Diff preview**: Show user a preview of changes before creating PR

## Technical Notes

### Why Events Sort Descending (Most Recent First)

Events are sorted by date in descending order (most recent first) because:

- Timeline views typically show recent events first
- Makes it easier to see what changed in recent exports
- Matches common convention for time-based data

### Why Case-Insensitive Sorting

Names are sorted case-insensitively to:

- Match user expectations ("Alice" comes before "bob")
- Prevent sorting anomalies based on capitalization
- Provide consistent results regardless of user input style

### Why Nested Arrays Are Sorted

Sorting nested arrays (like relationships, perkIds, imageUris) ensures:

- Even adding/removing a single item produces minimal diff
- Order of array elements doesn't change randomly
- Easier to spot duplicates or missing items in PR reviews

## Maintenance

### Adding New Entity Types

When adding new entity types to the dataset:

1. Add sorting logic to `datasetSorting.ts`
2. Add tests to `datasetSorting.test.ts`
3. Ensure sorting is applied in export functions

### Adding New Nested Arrays

When adding new nested arrays to existing entities:

1. Add sorting logic to the appropriate `sort*NestedArrays` function
2. Add test cases to verify the sorting works

## Troubleshooting

### Data.json Still Shows Large Diffs

If you're still seeing large diffs after this change:

1. **Check that you're on the latest version** - The sorting only applies to new exports
2. **Wait for a clean sync** - First PR after this change may show a large diff as data is re-ordered
3. **Check for data corruption** - If data IDs or timestamps keep changing, investigate why

### Sorting Order Seems Wrong

If entities appear in unexpected order:

1. **Verify the sort key** - Characters sort by name, events by date
2. **Check for special characters** - Names with special chars may sort unexpectedly
3. **Review tiebreaker** - When primary keys match, secondary key (id) determines order

## See Also

- [GitHub Integration Guide](GITHUB_INTEGRATION.md) - How to set up GitHub sync
- [Data Repository Template](DATA_REPOSITORY_TEMPLATE.md) - Structure of data repository
- [CSV Import Format](CSV_Import_Format.md) - Format for importing data
