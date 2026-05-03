# Insights Manual Test

## Goal

Confirm the Insights page turns the user's real media, rating, taste score, creator, and Narrative DNA evidence into simple readable charts and cards.

## Preconditions

- User is logged in.
- For the happy path, the user has at least two completed media items with ratings, creators, completed dates, taste scores, and one completed Narrative DNA analysis.

## Happy Path

1. Go to `/insights`.
   - Expected: The page opens with the heading “Readable patterns from your media history.”
2. Review the top metric cards.
   - Expected: Timeline months, rated media, tracked dimensions, and regret time show numbers from the user's data.
3. Review the Consumption timeline, Rating distribution, and Media type distribution sections.
   - Expected: Each section shows readable bars and counts.
4. Review Dimension trends, Genericness vs satisfaction, and Regret vs time cost.
   - Expected: Taste score averages, outlier titles, regret minutes, and insight text appear without errors.
5. Review Top creators and Top themes.
   - Expected: Creator rankings and Narrative DNA theme/trait examples appear when evidence exists.

## Error Path

1. Stop the API server or disconnect the backend temporarily.
   - Expected: The page shows an “Insights unavailable” error message.
2. Restart the API server.
   - Expected: Clicking “Try again” reloads the page data.

## Edge Case

1. Log in as a new user with no media.
   - Expected: The Insights page shows a friendly empty state and each chart/card explains what evidence is missing.
2. Open the page on a narrow mobile screen.
   - Expected: All sections stack cleanly, bars remain readable, and no key action or data is cut off.

## Notes

- Top themes are currently derived from completed Narrative DNA extracted traits until a dedicated tag/theme taxonomy exists.
- Mocked component tests do not replace the Playwright browser-to-backend Insights test.
