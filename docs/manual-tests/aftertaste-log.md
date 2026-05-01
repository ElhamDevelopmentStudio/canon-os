# Aftertaste Log Manual Test

## Happy path: create and review an aftertaste entry

1. Log in and add a Library item with status **Completed**.
   - Expected: The item appears in Library and can be opened from the title link.
2. Open **Aftertaste Log** from the sidebar.
   - Expected: The page shows the Aftertaste Log title, New Reflection button, default reflection prompts, and either entries or an empty state.
3. Select **New Reflection**.
   - Expected: A modal opens with media item, worth time, stayed with me score, felt alive, felt generic, completion reason, worked/failed/final thoughts, appetite effect, save, and cancel controls.
4. Choose the completed media item, enter a stayed score, fill worked/failed/final thoughts, and save.
   - Expected: The entry appears as a card with media title, worth-time value, stayed score, genericness value, appetite effect, and final thoughts.
5. Open the same media item detail page.
   - Expected: The Aftertaste section shows the latest reflection and final thoughts.

## Edit path: refine a reflection

1. Open **Aftertaste Log** with at least one entry.
   - Expected: Existing entries are visible.
2. Select the edit button for an entry.
   - Expected: The modal opens with the existing values filled in.
3. Change the stayed score and final thoughts, then save.
   - Expected: The card updates and Media Detail shows the updated latest reflection.

## Error path: missing media item

1. Use a new account with no library media.
   - Expected: Library is empty.
2. Open **Aftertaste Log** and select **New Reflection**.
   - Expected: The modal explains that a media item must be added first.
3. Select **Save reflection** without choosing media.
   - Expected: The save button is unavailable or an error asks you to choose a media item.

## Edge case: delete a reflection only

1. Create an aftertaste entry for a media item.
   - Expected: The reflection appears in Aftertaste Log and on Media Detail.
2. Delete the reflection from **Aftertaste Log** and confirm.
   - Expected: The reflection disappears from Aftertaste Log, but the media item remains in Library.
3. Reopen the media detail page.
   - Expected: The Aftertaste section prompts you to log a new reflection.
