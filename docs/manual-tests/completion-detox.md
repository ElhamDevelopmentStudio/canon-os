# Completion Detox Manual Test

## Happy path: evaluate and drop

1. Log in and open **Library**.
   - Expected: The Library page loads.
2. Add a TV show with status **Consuming**, episode count **12**, and rating **4**.
   - Expected: The show appears in the library.
3. Open **Completion Detox**.
   - Expected: A compact time-saved summary strip, focused evaluator, and quiet rule policy rows appear without nested cards or oversized repeated actions.
4. Select the show, enter progress **2**, motivation **2**, and click **Evaluate Drop/Pause**.
   - Expected: A drop recommendation appears as a clear decision section with a neutral reason and estimated time saved.
5. Click **Mark As Dropped**.
   - Expected: A success message appears and the media item status changes to dropped.

## Error path

1. Turn off the API or disconnect the dev server.
   - Expected: Completion Detox shows an unavailable/error state with retry guidance.

## Edge case: disabled rule

1. Open Completion Detox and disable **TV two episode sample**.
   - Expected: The compact rule row changes to an enable action without disrupting the evaluator layout.
2. Evaluate another consuming TV show at progress **2** and motivation **2**.
   - Expected: The result is **Continue** because the matching sample rule is disabled.
