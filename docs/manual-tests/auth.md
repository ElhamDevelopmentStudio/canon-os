# Auth Manual Test

## Goal

Confirm a user can register, log in, stay signed in after refresh, and log out safely.

## Preconditions

- Docker Postgres and Redis are running with `corepack pnpm compose:dev`.
- Django migrations have been applied.
- The API and web app are running.

## Happy Path

1. Go to `/register`.
   - Expected: The Create account page opens with display name, email, and password fields.
2. Enter a display name, a new email, and a password with at least 8 characters, then submit.
   - Expected: You are redirected to the dashboard and your display name appears in the header.
3. Click `Log out` in the header.
   - Expected: You return to the login page.
4. Enter the same email and password on `/login`, then submit.
   - Expected: You return to the dashboard and can see the app sidebar.

## Error Path

1. Go to `/login`.
   - Expected: The login form opens.
2. Enter a valid-looking email with the wrong password, then submit.
   - Expected: A clear login error appears and you stay on the login page.
3. Enter the correct password and submit again.
   - Expected: The error clears and the dashboard opens.

## Edge Case

1. While logged out, go directly to `/library`.
   - Expected: CanonOS redirects you to `/login` instead of showing the app shell.
2. While logged in, refresh the dashboard.
   - Expected: CanonOS checks the current session and keeps you inside the app.
3. While logged in, go to `/login` or `/register`.
   - Expected: CanonOS redirects you back to the dashboard.
