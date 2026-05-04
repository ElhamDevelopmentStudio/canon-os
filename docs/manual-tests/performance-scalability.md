# Performance And Scalability Manual Test

## Goal

Confirm large owner-owned datasets stay usable because list pages are paginated, searchable, and show clear loading states.

## Preconditions

- User is logged in.
- At least 1,000 media items exist for the user, or the backend performance test data has been seeded locally.

## Happy Path

1. Go to `/library`.
   - Expected: The Library page opens and shows only the first page of media items.
2. Use the Next and Previous pagination buttons.
   - Expected: The URL page changes and the table updates without freezing.
3. Search for a known title.
   - Expected: Search waits briefly while typing, then results update to matching items.
4. Go to `/candidates`, `/aftertaste-log`, and `/jobs`.
   - Expected: Each list shows pagination copy or pagination buttons and only renders a bounded page.

## Error Path

1. Stop the API server while the frontend is open.
   - Expected: API-backed pages show a clear error state instead of a blank page.
2. Restart the API server and click a retry/refresh action where available.
   - Expected: The page recovers and shows data again.

## Edge Case

1. Open `/library` with no media items or filters that match nothing.
   - Expected: A friendly empty state appears with an Add Media action.
2. Open a high page number after deleting or filtering data.
   - Expected: The page remains usable and does not render an unbounded list.

## Notes

- New large list pages should use the shared pagination controls and list skeletons.
- Mocked component tests are helpful, but browser e2e must still prove real API-backed behavior for user flows.
