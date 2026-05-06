# Manual Test: Taste Scores and Taste Profile

## Taste scoring happy path

1. Sign in and open Library.
   - Expected: The Library page loads without an error.
2. Select Add Media.
   - Expected: The Add Media dialog opens and shows a Taste scorecard.
3. Enter a title, select a media type, and add scores for Story depth, Memorability, Genericness, and Regret score.
   - Expected: Each score accepts values from 0 to 10 and optional notes.
4. Save the media item.
   - Expected: The item is saved and appears in Library.
5. Open the item detail page.
   - Expected: The Taste scorecard shows the saved scores and notes.
6. Change one score and select Save scores.
   - Expected: The updated score remains visible after refresh.

## Taste Profile happy path

1. Create at least one completed media item with a personal rating and several taste scores.
   - Expected: The item appears in Library with its scorecard saved.
2. Add an Aftertaste Log entry for that media item.
   - Expected: The entry appears in Aftertaste Log and on the media detail page.
3. Open **Taste Profile** from the sidebar.
   - Expected: The page shows a compact signal strip for strongest signal, red flag, strongest medium, and confidence.
   - Expected: The generated summary, strongest dimensions, weakest dimensions, medium preference, red flags, and recently influential works are visible as flat ranked sections without nested panels.
4. Select **Refresh Profile**.
   - Expected: The profile request runs again and the visible data remains consistent.
5. Select a work in **Recently influential works**.
   - Expected: The app opens that work's media detail page.

## Error path

1. Open Add Media or a media detail scorecard.
2. Enter `10.5` in any score field.
   - Expected: The page shows a validation message and does not save the invalid score.

## Empty profile edge case

1. Register a new account.
2. Open **Taste Profile** before adding scores or aftertaste entries.
   - Expected: The page shows a helpful empty state asking for scored media and reflections.
   - Expected: The signal strip still explains that the profile needs data instead of showing misleading metrics.

## Score removal edge case

1. Clear a previously saved score and save the scorecard.
   - Expected: The score is removed from that media item while other scores remain unchanged.
2. Reopen **Taste Profile**.
   - Expected: The profile recalculates from the remaining saved scores and aftertaste entries.
