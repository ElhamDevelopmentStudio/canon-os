# Manual Test: TasteGraph

## Happy path

1. Log in and open **Library**.
   - Expected: Your media library loads.
2. Add a completed movie with a creator and at least two taste scores.
   - Expected: The media item appears in the library.
3. Open **TasteGraph** from the sidebar.
   - Expected: The TasteGraph page loads with summary cards and a **Rebuild TasteGraph** button.
4. Select **Rebuild TasteGraph**.
   - Expected: A completed rebuild status appears, node and edge counts are greater than zero, and the creator appears in strongest connected creators.
5. Review **Text graph view**.
   - Expected: It lists readable connections between media, creator, medium, dimensions, or aftertaste signals.

## Empty path

1. Log in with a new account and open **TasteGraph** before adding media.
   - Expected: The page shows an empty state explaining that there are no connections yet.
2. Select **Rebuild TasteGraph**.
   - Expected: The rebuild completes safely with zero useful connections.

## Error path

1. Stop the API server or disconnect the backend.
2. Refresh **TasteGraph**.
   - Expected: A clear error state appears with a retry action.
