# App Shell Manual Test

## Goal

Confirm every main CanonOS page uses the same sidebar, top header, spacing, and basic feedback patterns.

## Preconditions

- The web app is running.
- The API may be running for the dashboard health card, but the shell should still render if the API is unavailable.

## Happy Path

1. Go to `/`.
   - Expected: The dashboard opens with the CanonOS sidebar, top header, and main dashboard heading.
2. Click each sidebar link: Library, Candidates, Tonight Mode, Taste Profile, Aftertaste Log, Queue, and Settings.
   - Expected: Each page opens inside the same app shell and the active sidebar item is highlighted.
3. Click the theme toggle in the header.
   - Expected: The app changes between light and dark mode without leaving the page.
4. Click the sidebar collapse button on a desktop-width screen.
   - Expected: The sidebar becomes icon-only and the main content stays readable.

## Error Path

1. Stop the API server, then open `/`.
   - Expected: The dashboard still renders and the API status card shows a clear backend error message.
2. Start the API server again and click `Recheck health`.
   - Expected: The API status card updates when the backend responds.

## Edge Case

1. Resize the browser to a narrow mobile width.
   - Expected: The sidebar is hidden behind a menu button and the header/content do not overlap.
2. Open the mobile navigation and choose a sidebar item.
   - Expected: The selected page opens and the mobile navigation closes.
