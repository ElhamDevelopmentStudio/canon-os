# <Feature Name> Manual Test

## Goal

Short sentence describing what this feature should do for a user.

## Preconditions

- User is logged in.
- Required data exists (if needed).

## Happy Path

1. Go to `<route/page>`.
   - Expected: Page opens with correct heading.
2. Click `<button/control>`.
   - Expected: Correct form/panel opens.
3. Enter `<input data>`.
   - Expected: Input is accepted without errors.
4. Submit by clicking `<action button>`.
   - Expected: Success message appears and data is saved.

## Error Path

1. Go to `<route/page>`.
   - Expected: Page opens.
2. Submit without required input.
   - Expected: Clear validation message is shown.
3. Fix input and submit again.
   - Expected: Error clears and submission succeeds.

## Edge Case

1. Open feature with minimal/empty data.
   - Expected: Friendly empty state appears.
2. Use the suggested action from empty state.
   - Expected: User can continue without confusion.

## Notes

- Keep steps short and clear.
- Avoid technical wording.
- Update this file when behavior changes.
