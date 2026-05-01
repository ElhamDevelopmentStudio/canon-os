# Manual Test: Taste Scores

## Happy path

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

## Error path

1. Open Add Media or a media detail scorecard.
2. Enter `10.5` in any score field.
   - Expected: The page shows a validation message and does not save the invalid score.

## Edge case

1. Clear a previously saved score and save the scorecard.
   - Expected: The score is removed from that media item while other scores remain unchanged.
2. Register a new account and open Add Media.
   - Expected: The default score dimensions are available for the new user.
