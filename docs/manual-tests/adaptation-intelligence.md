# Adaptation Intelligence Manual Test

## Goal

Confirm a user can link source material to an adaptation, get a recommended experience path, see the relation from both media detail pages, and remove it.

## Preconditions

- User is logged in.
- At least two media items exist in the Library, such as one novel and one anime/movie/TV adaptation.

## Happy Path

1. Go to `Library` and open the source media item.
   - Expected: The Media Detail page opens with the correct title.
2. Click the `Adaptations` tab.
   - Expected: The Adaptation Intelligence panel appears. If no links exist, a friendly empty state appears.
3. Click `Add adaptation relation`.
   - Expected: A modal opens with source, adaptation, relation type, completeness, score, recommended order, and notes fields.
4. Select the source item and the adaptation item, choose a relation type, enter scores, add comparison notes, and click `Save relation`.
   - Expected: The modal closes and the relation card appears with source/adaptation titles, scores, completeness, recommended order, and notes.
5. Click `Get Experience Path`.
   - Expected: A Best Experience Path card appears with a recommendation, rationale, confidence, and any risk signals.
6. Open the adaptation media detail page and click `Adaptations`.
   - Expected: The same relation appears from the adaptation side.

## Error Path

1. Open the `Add adaptation relation` modal.
   - Expected: The form is ready for input.
2. Select the same media item as both source and adaptation, then click `Save relation`.
   - Expected: A clear validation error explains that source and adaptation must be different items.
3. Select two different media items and submit again.
   - Expected: The error clears and the relation saves.

## Edge Case

1. Open `Adaptations` on an account with fewer than two media items.
   - Expected: The panel explains that no relation can be added yet and keeps the add button disabled.
2. Add a second media item to the Library and return to the tab.
   - Expected: `Add adaptation relation` becomes available.

## Cleanup

1. Click `Remove relation` on the relation card.
   - Expected: The relation disappears and no longer appears on either media detail page.
