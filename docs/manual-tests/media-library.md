# Media Library Manual Test

## Goal

Confirm the user can create, find, edit, view, and delete private media records.

## Preconditions

- Docker Postgres and Redis are running with `corepack pnpm compose:dev`.
- Django migrations have been applied.
- The API and web app are running.
- User is registered and logged in.

## Happy Path

1. Go to `/library`.
   - Expected: The Library page opens inside the CanonOS app shell.
2. Click `Add Media`.
   - Expected: A dedicated Add media page opens.
3. Choose one category, such as `Movie`.
   - Expected: The page labels the batch category and clears selections from any previous category.
4. Search for a title.
   - Expected: Provider result cards appear with poster, year, provider, creator, description, and confidence.
5. Click a result card.
   - Expected: A details modal opens with provider description, rating/popularity, source link, and provider details.
6. Click `Add this title`.
   - Expected: The title appears in the selected titles panel.
7. Open the selected title three-dot actions menu and click `Configure`.
   - Expected: A configuration modal opens with status, rating presets, rating slider, notes, and taste score controls.
8. Adjust status, choose a rating preset, set a taste score, and click `Apply configuration`.
   - Expected: The selected title summary reflects the configured status/rating.
9. Search for and select another title in the same category, then click `Save titles`.
   - Expected: The selected titles save and the Library page opens.
10. Click one saved item title.
   - Expected: The Media Detail page opens and shows metadata plus notes.
11. Click `Edit`, enter the item title in `Metadata search title`, and click `Search metadata`.
   - Expected: Provider match cards appear and clearly label the provider source.
12. Click `Attach metadata`, then save the media item.
   - Expected: The detail page shows an External metadata section with source, description, image area, rating/popularity hints, and refresh button.
13. Click `Refresh metadata`.
   - Expected: The refresh succeeds and the External metadata section remains visible.

## Error Path

1. Go to `/library`, click `Add Media`, and click `Save titles` without selecting anything.
   - Expected: A clear validation message asks for at least one title.
2. Search metadata with an empty query.
   - Expected: A clear validation message asks for a title before contacting providers.
3. Search while the provider API is unavailable or credentials are missing.
   - Expected: A recoverable error appears and the typed query remains in place.
4. Use `Advanced options`, add a manual title, and click `Save titles`.
   - Expected: The manual item saves successfully without provider metadata.

## Edge Case

1. Use the search box to search for a title that does not exist.
   - Expected: A friendly empty state appears.
2. Clear the search, then filter by a media type and status that match an item.
   - Expected: Matching items remain visible.
3. Open a media item with no attached provider snapshot.
   - Expected: The External metadata section shows a friendly missing-metadata empty state.
4. On the Add media page, select a movie, then switch the category to Anime.
   - Expected: The selected movie is cleared and the selected titles panel changes to Anime.
5. Click Delete for an item and confirm.
   - Expected: The item disappears from the Library list and cannot be opened from its old detail URL.
