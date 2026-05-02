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
   - Expected: The Add media dialog opens with title, media type, release year, creator, status, rating, and notes fields.
3. Enter a title, choose a media type and status, add a rating and notes, then click `Save media`.
   - Expected: The dialog closes and the new item appears in the Library table.
4. Click the item title.
   - Expected: The Media Detail page opens and shows metadata plus notes.
5. Click `Edit`, enter the item title in `Metadata search title`, and click `Search metadata`.
   - Expected: Provider match cards appear and clearly label the provider source.
6. Click `Attach metadata`, then save the media item.
   - Expected: The detail page shows an External metadata section with source, description, image area, rating/popularity hints, and refresh button.
7. Click `Refresh metadata`.
   - Expected: The refresh succeeds and the External metadata section remains visible.

## Error Path

1. Go to `/library` and click `Add Media`.
   - Expected: The Add media dialog opens.
2. Leave the required title empty and click `Save media`.
   - Expected: The browser prevents submission or the API returns a clear validation error.
3. Enter a valid title and click `Save media` again.
   - Expected: The item saves successfully.
4. Search metadata with an empty query and no title.
   - Expected: A clear validation message asks for a title before contacting providers.

## Edge Case

1. Use the search box to search for a title that does not exist.
   - Expected: A friendly empty state appears.
2. Clear the search, then filter by a media type and status that match an item.
   - Expected: Matching items remain visible.
3. Open a media item with no attached provider snapshot.
   - Expected: The External metadata section shows a friendly missing-metadata empty state.
4. Click Delete for an item and confirm.
   - Expected: The item disappears from the Library list and cannot be opened from its old detail URL.
