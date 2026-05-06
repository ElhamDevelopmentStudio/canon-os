# Provider Library Acquisition Manual Test

## Goal

Confirm a user can find media through provider search, attach provider metadata, and still use manual entry when a title is missing or providers are unavailable.

## Preconditions

- User is logged in.
- API and web app are running.
- `TMDB_READ_ACCESS_TOKEN`, `TMDB_API_KEY`, `OMDB_API_KEY`, or `GOOGLE_BOOKS_API_KEY` are configured when testing live provider lookup.
- At least one media item exists when testing metadata attach from the detail page.

## Happy Path

1. Go to `/library`.
   - Expected: Library opens with the Add media action available.
2. Open the Add media page.
   - Expected: A dedicated provider-first page opens with a single category selector, a search row, selected-title rail, and Advanced Options manual fallback.
3. Search for a known movie title with media type `movie`.
   - Expected: The URL contains the search title, category, and provider query parameters; results appear with title, provider, confidence, year, description, and poster when available.
4. Open a provider result.
   - Expected: A details modal shows parsed provider facts such as IDs, source, language, genres, rating, popularity, and source link without showing raw JSON.
5. Add the result, then open its three-dot `Configure` action.
   - Expected: A focused configuration modal opens with personal signals, title details, and taste scores in separate panels.
6. Set status, rating, notes, and at least one taste score, then apply the configuration.
   - Expected: The selected-title rail reflects the configured personal signals without leaving the page.
7. Save the selected titles.
   - Expected: The items appear in Library with the user's personal status and rating.
8. Open the media detail page and attach or refresh metadata if available.
   - Expected: Provider metadata appears as a snapshot without replacing personal notes or rating.

## Error Path

1. Open the Add media page.
   - Expected: The form opens.
2. Search with an empty query.
   - Expected: No provider request is made and no confusing error appears.
3. Search while provider credentials are missing or the provider is unavailable.
   - Expected: The user sees a recoverable empty or error state and the typed title stays available.
4. Fill the required fields manually and save.
   - Expected: Manual save still succeeds.

## Edge Case

1. Search for an obscure or missing title.
   - Expected: No-match state appears without blocking the form.
2. Open Advanced Options.
   - Expected: A missing title can be added manually for the currently selected batch category.
3. Configure the manually added title from the selected-title rail.
   - Expected: Title details, personal signals, and taste scores remain editable even without provider metadata.
4. Save the manually entered title.
   - Expected: The media item is created as a normal CanonOS-owned library item.
5. Later search metadata for the same item from its detail page.
   - Expected: Metadata can be attached if a provider match becomes available, and personal fields remain unchanged.

## Notes

- OMDb is lookup-only and should not appear as an account import option.
- Account imports and provider export uploads are planned for later CP-M23 tasks.
- Provider search must never send private notes, personal ratings, aftertaste, queue state, or taste scores to external providers.
