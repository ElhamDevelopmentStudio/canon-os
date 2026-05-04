# Accessibility And Responsive UI Manual Test

## Goal

Confirm CanonOS stays usable with keyboard navigation, clear labels, accessible dialogs, and common mobile widths.

## Preconditions

- Docker-backed PostgreSQL and Redis are running with `corepack pnpm compose:dev`.
- The API and web app are running through `corepack pnpm e2e` or local dev commands.
- A test user can register and sign in.

## Happy Path

1. Sign in and open the Dashboard.
   - Expected: The shared sidebar and header are visible, the page heading is clear, and the focused control has a visible focus ring when using the keyboard.
2. Press `Tab` through the sidebar, header actions, page cards, and primary page actions.
   - Expected: Focus moves in a logical order and every focused button or link has a clear name.
3. Press the command palette shortcut (`Control+K` on Windows/Linux or `Meta+K` on macOS).
   - Expected: A labelled search dialog opens, focus moves into the search field, and results can be reached with the keyboard.
4. Open Add Media from the Library or Dashboard.
   - Expected: A titled dialog opens, focus starts on the Title field, all fields have labels, `Tab` stays inside the dialog, and `Escape` closes it.
5. Open Library, Candidate Evaluator, Tonight Mode, Adaptive Queue, and a Media Detail page on a narrow mobile width.
   - Expected: Content remains readable, primary actions are reachable, and the page does not require horizontal scrolling.

## Error Path

1. Submit an Add Media dialog without the required title.
   - Expected: A clear validation message appears and focus remains in the dialog.
2. Trigger an expected API error in a data-backed page, such as disabling the backend during local testing.
   - Expected: The page shows user-friendly error copy instead of a blank screen.
3. Re-enable the backend and retry the action.
   - Expected: The error clears and the flow can continue.

## Edge Case

1. Enable reduced motion in the operating system or browser emulation, then navigate between pages and open dialogs.
   - Expected: Animations and transitions are minimized while the UI remains usable.
2. Use only the keyboard to open and close a destructive confirmation dialog.
   - Expected: The dialog has a clear title, explains the action, traps focus while open, and returns focus after closing.
3. Review score and status badges with color perception reduced or disabled.
   - Expected: The badge text communicates the meaning without relying on color alone.

## Notes

- Browser e2e covers the core responsive and keyboard checks in `apps/web/e2e/accessibility-responsive.spec.ts`.
- A full screen-reader pass with NVDA, VoiceOver, or Orca is still recommended before a public release.
