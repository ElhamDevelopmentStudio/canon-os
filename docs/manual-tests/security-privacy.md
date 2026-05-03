# Security and Privacy Manual Test

## Goal

Confirm that users can export private data, delete CanonOS product data, delete their account, and cannot trigger destructive privacy actions by accident.

## Preconditions

- User is logged in.
- User has at least one media item in Library.

## Happy path: export private data

1. Open **Settings** and go to **Privacy and security**.
   - Expected: The panel explains private CanonOS data, external metadata use, and shows personal data counts.
2. Click **Export My Data**.
   - Expected: A success message appears and a latest export entry is shown.
3. Open **Background Jobs**.
   - Expected: The export job appears with a completed or running status.

## Happy path: delete CanonOS data only

1. In **Settings > Privacy and security**, click **Delete All CanonOS Data**.
   - Expected: A confirmation dialog opens and the delete button is disabled.
2. Type anything except `DELETE MY DATA`.
   - Expected: The delete button stays disabled.
3. Type `DELETE MY DATA` exactly.
   - Expected: The delete button becomes enabled.
4. Confirm deletion.
   - Expected: A success message appears and the personal data counts refresh.
5. Open **Library**.
   - Expected: The deleted media item is no longer visible and the account is still signed in.

## Happy path: delete account

1. Create or log in with a disposable test account.
   - Expected: The account can access Dashboard and Settings.
2. Open **Settings > Privacy and security** and click **Delete Account**.
   - Expected: A confirmation dialog opens and the delete button is disabled.
3. Type `DELETE MY ACCOUNT` exactly and confirm deletion.
   - Expected: The session ends and the browser redirects to Register.
4. Try to open **Dashboard**.
   - Expected: The app redirects to Login or Register instead of showing private data.

## Error path: unsafe confirmation is not accepted

1. Open either destructive privacy dialog.
   - Expected: The required confirmation phrase is shown.
2. Leave the confirmation blank or mistype the phrase.
   - Expected: The destructive button remains disabled and no data is deleted.
3. Close the dialog.
   - Expected: The Settings page remains usable and data counts are unchanged.

## Edge case: empty account data

1. Register a new account and open **Settings > Privacy and security** before adding media.
   - Expected: Data counts show zero or default-only values with helpful copy.
2. Request a JSON export.
   - Expected: Export succeeds even when the account has little data.
3. Delete all CanonOS data with `DELETE MY DATA`.
   - Expected: The action succeeds, the account remains signed in, and default taste dimensions are still available.

## Notes

- Use disposable test accounts for account deletion checks.
- Export before destructive deletion when testing with data you want to keep.
