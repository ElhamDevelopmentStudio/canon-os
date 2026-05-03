# Manual Test: Background Jobs And Notifications

## Happy path: graph rebuild job

1. Log in and open **TasteGraph**.
   - Expected: The page loads with a **Rebuild TasteGraph** button.
2. Click **Rebuild TasteGraph**.
   - Expected: A job status card appears and shows the graph rebuild as complete.
3. Open **Jobs** from the sidebar.
   - Expected: A **Graph rebuild** row appears with status **Complete** and 100% progress.
4. Open the header **Jobs** notification dropdown.
   - Expected: The recent graph rebuild appears in the dropdown.

## Happy path: export job

1. Open **Settings**.
   - Expected: Import and export tools are visible.
2. Click **Request Export**.
   - Expected: The export finishes and shows a downloadable export message.
3. Open **Jobs**.
   - Expected: An **Export** row appears with status **Complete**, 100% progress, and result details.

## Happy path: metadata and Narrative DNA jobs

1. Open a media detail page that has attached external metadata.
   - Expected: The **Refresh metadata** button is visible.
2. Click **Refresh metadata**.
   - Expected: The metadata refresh succeeds and a **Metadata refresh** job appears in **Jobs**.
3. Open the **Narrative DNA** tab for the same media item and click **Request Narrative Analysis**.
   - Expected: The analysis completes and a **Narrative analysis** job appears in **Jobs**.

## Error path

1. Stop the API server, then open **Jobs**.
   - Expected: The page shows a clear **Background jobs unavailable** error.
2. Restart the API server and click **Refresh jobs**.
   - Expected: The job list reloads successfully.

## Edge case

1. Use a new account with no imports, exports, metadata refreshes, graph rebuilds, or narrative jobs.
   - Expected: **Jobs** shows an empty state explaining which actions create jobs.
