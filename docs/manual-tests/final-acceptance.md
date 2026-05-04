# Final Acceptance Manual Test

Use this checklist for a release-candidate walkthrough after automated CP-M22 gates pass.

## Happy Path

1. Start local dependencies and the app.
   - Expected: Web, API, PostgreSQL, Redis, and worker services are healthy.
2. Register a new user and open Dashboard.
   - Expected: Dashboard loads without console errors and shows empty or starter summary cards.
3. Add media to Library, attach metadata, score it, and add an aftertaste entry.
   - Expected: Library/detail pages show saved media, metadata, scores, and reflection evidence after refresh.
4. Evaluate a candidate, run Critic Council if available from the flow, and add the result to the queue.
   - Expected: Evaluation, anti-generic signals, council output, and queue entry are visible.
5. Recalculate Queue and generate Tonight Mode.
   - Expected: Queue priorities update and Tonight Mode returns actionable recommendations.
6. Open Taste Profile, TasteGraph, Taste Evolution, Insights, Personal Canon, Adaptation Intelligence, Media Archaeologist, Narrative DNA, Completion Detox, Jobs, and Settings.
   - Expected: Each page loads, has a clear empty/success state, and no primary action is dead.
7. Export user data, log out, log back in, and verify important records remain.
   - Expected: Export downloads and persisted records still appear after login.

## Error Path

1. Submit invalid values in representative forms such as register, add media, import CSV, and destructive confirmations.
   - Expected: The UI blocks or explains the invalid input without losing the page state.
2. Visit a protected route while logged out.
   - Expected: The app redirects to login/register and does not show private data.

## Edge Case

1. Use the app with an empty account, then with multiple records across media types.
   - Expected: Empty states are helpful, pagination/filters remain usable, and Dashboard/Profile/Insights update from real saved data.
2. Use a narrow mobile viewport and keyboard navigation for the sidebar, command palette, dialogs, and forms.
   - Expected: Focus remains visible, controls are labelled, dialogs can close, and pages do not horizontally overflow.
