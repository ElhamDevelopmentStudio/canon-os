# Media Archaeologist Manual Test

## Goal

Confirm Media Archaeologist generates explainable deep-cut trails, saves them, and can send results to the queue.

## Preconditions

- User is logged in.
- Backend and frontend are running.

## Happy Path

1. Go to `/discover`.
   - Expected: The page opens with the `Media Archaeologist` heading.
2. Click `Generate Discovery Trail` without entering filters.
   - Expected: A success message appears and result cards are shown.
3. Enter `memory and identity` in Theme and choose `Novel` as Preferred medium.
   - Expected: The form accepts the filter values.
4. Click `Generate Discovery Trail` again.
   - Expected: Results are regenerated, and each visible result explains `Why this expands your taste` and `Why it may fail`.
5. Click `Save Trail`.
   - Expected: `Discovery trail saved.` appears and the trail shows under `Saved discovery trails`.
6. Click `Add To Queue` on a result.
   - Expected: A success message confirms the result was added to the queue.
7. Go to `/queue`.
   - Expected: The added discovery result appears as a queue item.

## Error Path

1. Log out.
   - Expected: The app redirects to the login page.
2. Open `/discover` while logged out.
   - Expected: The login page appears instead of discovery data.
3. Log back in and return to `/discover`.
   - Expected: The discovery page loads without losing access to saved trails.

## Edge Case

1. Use only a narrow Preferred medium filter, such as `Audiobook`, with no theme.
   - Expected: A trail still generates or a friendly empty/error state explains what happened.
2. Save the trail if results appear.
   - Expected: The saved trail records the generated result list.
3. Delete the saved trail from `Saved discovery trails`.
   - Expected: The trail disappears and the page remains usable.
