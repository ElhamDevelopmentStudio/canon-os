# Manual Test: Dashboard

## Happy path

1. Sign in with an account that has media items and taste scores.
   - Expected: The Dashboard loads without an error.
2. Check the metric cards.
   - Expected: Total Library, Completed, Planned, and Dropped counts match the Library data.
3. Review Media type breakdown.
   - Expected: Counts are grouped by media type.
4. Review Recent activity and Highest rated recent items.
   - Expected: Recent items link to their media detail pages and ratings are visible where present.
5. Review Top taste signals.
   - Expected: Scored dimensions appear with average score and score count.

## Error path

1. Stop or misconfigure the API, then refresh the Dashboard.
   - Expected: The Dashboard shows a clear error state with retry behavior.

## Edge case

1. Sign in with a new account that has no media.
   - Expected: The Dashboard shows zero metric values and an empty state prompting Add Media.
2. Select Add Media from the Dashboard.
   - Expected: The Add Media modal opens and saving an item updates the dashboard after refresh/revalidation.
3. Select Evaluate Candidate or Tonight Mode.
   - Expected: Each quick action navigates to its matching page or placeholder for its future milestone.
