# Manual Test — Import And Export

## Happy path: import a CSV

1. Log in and open **Settings**.
   - Expected: The Import and export section is visible.
2. Choose **CSV media list** as the import source type.
   - Expected: The file picker accepts CSV files.
3. Upload a CSV with `title,media_type,status,personal_rating` and one valid row.
   - Expected: **Preview Import** shows 1 valid row and 0 invalid rows.
4. Select **Confirm Import**.
   - Expected: The page says the import completed and shows the number of created records.
5. Open **Library**.
   - Expected: The imported media item appears.

## Error path: invalid CSV

1. Upload a CSV row with a blank title or unknown media type.
   - Expected: Preview shows row errors in clear language.
2. Look at **Confirm Import**.
   - Expected: The button is disabled while invalid rows exist.
3. Open **Library**.
   - Expected: No invalid row was added.

## Edge case: duplicate row

1. Import a CSV row for a media item that already exists with the same title and media type.
   - Expected: Preview marks the row as duplicate with a warning.
2. Confirm the import if no invalid rows exist.
   - Expected: Duplicate rows are skipped and are not added twice.

## Export JSON backup

1. Open **Settings** and choose **Full JSON backup**.
   - Expected: **Request Export** prepares an export.
2. Select **Download Export**.
   - Expected: The export downloads and includes profile/settings, media, scores, candidates, queue items, and Tonight Mode sessions where present.

## Export media CSV

1. Open **Settings** and choose **Media and ratings CSV**.
   - Expected: **Request Export** prepares an export.
2. Select **Download Export**.
   - Expected: The CSV includes media fields and `score_<dimension>` columns.
