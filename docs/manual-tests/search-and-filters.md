# Search And Advanced Filters Manual Test

## Goal

Confirm that global search and Library filters help a logged-in user find records quickly.

## Preconditions

- User is logged in.
- At least one media item exists in Library.
- At least one candidate exists in Candidate Evaluator.

## Happy Path

1. Press `Ctrl+K` on Windows/Linux or `⌘K` on macOS.
   - Expected: The command palette opens and the cursor is in Global search.
2. Search for an existing media title.
   - Expected: A Media result appears with useful details.
3. Select the media result.
   - Expected: The app opens that media detail page.
4. Open the command palette again and search for an existing candidate title.
   - Expected: A Candidate result appears.
5. Select the candidate result.
   - Expected: Candidate Evaluator opens with that candidate loaded.
6. Go to Library and click **Advanced filters**.
   - Expected: Creator, rating, genericness, regret, and completed-date controls are visible.
7. Enter a creator and a minimum rating that match one known media item.
   - Expected: The Library list updates, active filter chips appear, and the URL contains the filters.
8. Click **Clear Filters**.
   - Expected: Filter chips disappear, the URL query clears, and the full Library list returns.

## Error Path

1. Open the command palette and search for a title that does not exist.
   - Expected: A friendly no-results message appears.
2. Disconnect or stop the API, then search again.
   - Expected: The command palette shows a clear search unavailable message.
3. Restart the API and search again.
   - Expected: The error clears after the next successful search.

## Edge Case

1. Open the command palette and type only one character.
   - Expected: Search does not run yet, and the palette asks for at least two characters.
2. Apply filters that match no media items.
   - Expected: Library shows the empty state without crashing.
3. Remove one active filter chip.
   - Expected: Only that filter is removed and the URL updates.

## Notes

- Use accessible labels and visible buttons when changing this flow.
- Mocked component tests do not replace the browser-to-backend e2e coverage for this feature.
