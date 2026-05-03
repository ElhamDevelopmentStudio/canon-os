# Settings and Portability Manual Test

## Happy path: save advanced settings

1. Log in and open **Settings**.
   - Expected: The Settings page shows Profile settings, Display settings, Advanced Recommendation Settings, Import and export, and Privacy and security.
2. Change **Display name** to a new value.
   - Expected: The Save Settings button becomes enabled.
3. Change **Theme preference** to Dark.
   - Expected: No error appears before saving.
4. Change **Default risk tolerance** to High and set **Genericness sensitivity** to 9.
   - Expected: The controls show the new values.
5. In **Default Tonight Mode**, set **Default Tonight minutes** to 45, **Default Tonight energy** to Low, **Default Tonight focus** to Deep, and **Default Tonight desired effect** to Light.
   - Expected: The controls show the new defaults.
6. Set **Recommendation strictness** to 7, **Burnout sensitivity** to 8, **Completion detox strictness** to 9, **Personal fit** to 36, and **Quality signal** to 24.
   - Expected: Each slider/input shows the selected value and nearby copy explains how it affects recommendations.
7. Turn off **Allow modern exceptions** and turn on **Browser notifications**.
   - Expected: The toggles show the selected states.
8. Click **Save Settings**.
   - Expected: A “Settings saved.” confirmation appears and the app shell switches to dark mode.
9. Refresh the browser.
   - Expected: The saved display name, risk tolerance, Tonight defaults, strictness sliders, formula weights, and notification toggle values are still shown.

## Happy path: reset advanced recommendation defaults

1. Open **Settings** and change several Advanced Recommendation Settings without saving.
   - Expected: Save Settings and Reset Changes become enabled.
2. Click **Reset To Recommended Defaults**.
   - Expected: Formula weights, Tonight defaults, strictness sliders, modern exception behavior, and notification preferences return to CanonOS defaults.
3. Click **Save Settings**.
   - Expected: A success confirmation appears and a refresh keeps the recommended defaults.

## Settings influence checks

1. After saving Default risk tolerance as High and Default Tonight Mode as 45 minutes, Low energy, Deep focus, and Light desired effect, open **Tonight Mode**.
   - Expected: Tonight Mode defaults to High risk tolerance, 45 minutes, Low energy, Deep focus, and Light desired effect.
2. Open **Candidate Evaluator**.
   - Expected: The page shows the saved genericness sensitivity, modern media skepticism, recommendation strictness, and whether modern exceptions are allowed.
3. Evaluate a modern candidate after turning **Allow modern exceptions** off.
   - Expected: The explanation warns that a modern-work exception was detected but modern exceptions are disabled.
4. Open **Completion Detox** and evaluate a borderline completion decision after raising **Completion detox strictness**.
   - Expected: The decision is at least as strict as before; borderline items are more likely to be paused or dropped.

## Error path: settings validation

1. Open **Settings** and clear the Display name field.
   - Expected: Save Settings remains available because changes are local.
2. Click **Save Settings**.
   - Expected: The page shows “Display name is required.” and does not save.

## Edge case: reset unsaved changes

1. Change several settings but do not save.
   - Expected: Reset Changes is enabled.
2. Click **Reset Changes**.
   - Expected: All controls return to the last saved values and Save Settings becomes disabled.

## Import/export happy path

1. Open **Settings** and find **Import and export**.
   - Expected: Import preview, confirm import, import history, export request, restore validation, and download controls are visible.
2. Preview a valid CSV import with at least one media row.
   - Expected: Valid, invalid, duplicate, warning counts, and Import job progress are shown before any data is saved.
3. Click **Confirm Import**.
   - Expected: A success message says how many records were created, progress reaches 100%, and the imported media appears in Library.
4. Request a JSON export.
   - Expected: Export job progress reaches 100%, a retained-until date appears, and Download Export becomes available.
5. Download the JSON export.
   - Expected: The preview includes the imported media title.
6. Request and download the CSV export.
   - Expected: The CSV contains media fields and score columns.

## Rollback path

1. In Settings, confirm a small valid import.
   - Expected: The Import history list shows the import as Confirmed.
2. Click **Roll Back Import** for that confirmed batch.
   - Expected: A success message says records were removed, the batch status changes to Rolled back, and the rollback count is shown.
3. Open Library and search for the imported title.
   - Expected: The imported records from that batch are no longer visible.
4. Return to Settings and try to roll back the same batch again.
   - Expected: The rollback button is disabled for the rolled-back batch.

## Restore dry-run path

1. Open Settings and choose a CanonOS JSON export in **Restore file**.
   - Expected: The file is accepted for validation.
2. Click **Validate Restore**.
   - Expected: The restore dry-run result shows total, valid, invalid, duplicate, warning, media, candidate, and queue counts.
3. Use a backup containing a media title already in the Library.
   - Expected: Duplicate count or warnings explain that the restore would skip existing records.

## Error path: invalid import file

1. Select **CSV media list** as import source type.
2. Choose a `.txt` file and click **Preview Import**.
   - Expected: The page clearly states that CSV imports must use `.csv` files and does not create a preview.
3. Choose a file larger than the documented 2 MB import limit.
   - Expected: The page clearly states that import files must be 2 MB or smaller.

## Edge case: large import

1. Prepare a CSV with 500 media rows and a valid header.
2. Preview the import.
   - Expected: The preview reports 500 valid rows and shows progress metadata.
3. Confirm the import.
   - Expected: The job finishes at 100% and 500 records appear in Library.
4. Roll back the import.
   - Expected: The rollback removes all 500 records from that batch.
