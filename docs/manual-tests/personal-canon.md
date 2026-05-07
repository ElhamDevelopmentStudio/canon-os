# Personal Canon Manual Test

## Happy path: create and complete a season

1. Log in and open **Personal Canon**.
   - Expected: The Personal Canon page loads with either existing seasons or an empty state.
2. Click **Create Season**, enter a title, choose **Atmosphere over plot**, add a description, and save.
   - Expected: The season appears as a compact row with **0%** progress and an **Open Season** action.
3. Open the season and click **Add Item**.
   - Expected: The Add Season Item dialog appears.
4. Add one custom item, one library media item, and one candidate item with reason and attention notes.
   - Expected: Three ordered ledger rows appear with notes, status badges, and compact actions.
5. Move the third item up.
   - Expected: The order updates and a success message appears.
6. Mark one item complete.
   - Expected: The item shows **Completed** and the season progress increases.
7. Change an item canon status to **Near-canon** or **Personal canon**.
   - Expected: The item row shows the selected canon status.
8. Add summary notes in **Season reflection** and click **Save Reflection**.
   - Expected: A success message appears and notes remain after refresh.

## Error path

1. Turn off the API or disconnect the dev server.
   - Expected: Personal Canon shows an unavailable/error state with retry guidance.

## Edge case: empty season

1. Create a new season and do not add any items.
   - Expected: The detail page shows **No season items yet**, reflection prompts still appear, and progress remains **0%**.
