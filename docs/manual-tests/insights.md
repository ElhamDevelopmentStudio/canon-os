# Insights Manual Test

## Goal

Confirm the Insights page turns the user's real media, rating, taste score, creator, and Narrative DNA evidence into a dense but readable analytics workspace.

## Preconditions

- User is logged in.
- For the happy path, the user has at least two completed media items with ratings, creators, completed dates, taste scores, and one completed Narrative DNA analysis.

## Happy Path

1. Go to `/insights`.
   - Expected: The page opens with the heading “Insights” and a compact action row.
2. Review the top signal strip.
   - Expected: Timeline months, rated media, dominant medium, and regret time show numbers from the user's data.
3. Review Consumption timeline and Rating distribution.
   - Expected: The timeline uses vertical visual columns, rating distribution uses horizontal bars, and both sit in flat worksheet sections rather than boxed cards.
4. Review Media mix, Taste monitor, and Top themes.
   - Expected: Medium balance, dimension signal density, and Narrative DNA themes appear as compact chart-like modules with clear section hierarchy and no card-in-card framing.
5. Review Genericness vs satisfaction and Regret vs time cost.
   - Expected: Average signals, outlier titles, regret minutes, and insight text appear without errors.
6. Review Top creators and Dimension trends.
   - Expected: Creator rankings and dimension trend rows show score, detail, and warning evidence when present.

## Error Path

1. Stop the API server or disconnect the backend temporarily.
   - Expected: The page shows an “Insights unavailable” error message.
2. Restart the API server.
   - Expected: Clicking “Try again” reloads the page data.

## Edge Case

1. Log in as a new user with no media.
   - Expected: The Insights page shows a friendly empty state and each chart module shows the next evidence steps needed to populate it.
2. Open the page on a narrow mobile screen.
   - Expected: All sections stack cleanly, chart labels remain readable, and no key action or data is cut off.

## Notes

- Top themes are currently derived from completed Narrative DNA extracted traits until a dedicated tag/theme taxonomy exists.
- Mocked component tests do not replace the Playwright browser-to-backend Insights test.
