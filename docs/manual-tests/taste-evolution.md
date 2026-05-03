# Manual Test: Taste Evolution Journal

## Happy path

1. Log in and open **Library**.
   - Expected: Your media library loads.
2. Add at least two completed media items from different months with personal ratings and taste scores.
   - Expected: Each item appears in the library and its scores save without an error.
3. Open **Aftertaste Log** and add one reflection with **Worth time = No** and **Felt generic = Yes** for one completed item.
   - Expected: The reflection appears in the log.
4. Open **Taste Evolution** from the sidebar.
   - Expected: The page loads with a **Generate Snapshot** button.
5. Select **Generate Snapshot**.
   - Expected: A snapshot appears with rating trend, medium trend, genericness tolerance, regret trend, completion fatigue, favorite dimension, insights, and snapshot history.
6. Open **Dashboard**.
   - Expected: The **Latest taste shift** card shows the newest insight and links back to Taste Evolution.

## Empty path

1. Log in with a new account and open **Taste Evolution** before adding media.
   - Expected: The page shows an empty snapshot timeline message.
2. Select **Generate Snapshot**.
   - Expected: A safe snapshot is created and explains that more evidence is needed.

## Error path

1. Stop the API server or disconnect the backend.
2. Refresh **Taste Evolution**.
   - Expected: A clear error state appears with a retry action.
