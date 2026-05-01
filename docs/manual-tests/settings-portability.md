# Settings and Portability Manual Test

## Happy path: save basic settings

1. Log in and open **Settings**.
   - Expected: The Settings page shows Profile settings, Display settings, and Recommendation settings.
2. Change **Display name** to a new value.
   - Expected: The Save Settings button becomes enabled.
3. Change **Theme preference** to Dark.
   - Expected: No error appears before saving.
4. Change **Default risk tolerance** to High and set **Genericness sensitivity** to 9.
   - Expected: The controls show the new values.
5. Click **Save Settings**.
   - Expected: A “Settings saved.” confirmation appears and the app shell switches to dark mode.
6. Refresh the browser.
   - Expected: The saved display name, risk tolerance, and slider values are still shown.

## Settings influence checks

1. After saving Default risk tolerance as High, open **Tonight Mode**.
   - Expected: Risk tolerance defaults to High.
2. Open **Candidate Evaluator**.
   - Expected: The page shows the saved genericness sensitivity and modern media skepticism values.

## Error path

1. Open **Settings** and clear the Display name field.
   - Expected: Save Settings remains available because changes are local.
2. Click **Save Settings**.
   - Expected: The page shows “Display name is required.” and does not save.

## Edge case: reset unsaved changes

1. Change several settings but do not save.
   - Expected: Reset Changes is enabled.
2. Click **Reset Changes**.
   - Expected: All controls return to the last saved values and Save Settings becomes disabled.
