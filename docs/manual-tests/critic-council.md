# Critic Council Manual Test

## Happy path: run council on a candidate and media item

1. Log in and open **Candidates**.
   - Expected: Candidate Evaluator loads.
2. Create or select a candidate with a title, premise, release year, expected genericness, and time cost.
   - Expected: The candidate is saved in history.
3. Open **Library** and create or choose a media item.
   - Expected: The media item is visible in the library.
4. Open **Critic Council**.
   - Expected: The page shows a compact debate workspace with signal blocks, a prompt box, candidate selector, media item selector, Run Council button, **Critic Settings**, and **History**.
5. Select the candidate and media item, enter a short prompt, and click **Run Council**.
   - Expected: A final council decision appears with confidence, disagreement, explanation, and critic opinions beside the prompt.
6. Click **Add Decision To Candidate**.
   - Expected: The button confirms the decision was applied, and the candidate status matches the final decision.
7. Click **History**.
   - Expected: Council history opens in a dialog, shows saved debates, and closes without changing the current workspace unless a saved debate is selected.

## Error path: run without any input

1. Open **Critic Council** with no candidate, media item, or prompt selected.
2. Click **Run Council**.
   - Expected: A visible error asks for a prompt, candidate, or media item.

## Edge case: disable a critic

1. Open **Critic Settings**.
   - Expected: Critic settings open in a dialog instead of occupying the main workspace.
2. Find **Wildcard**.
3. Uncheck **Enabled** and click **Save Critic**.
   - Expected: A success message says the critic setting was saved.
4. Run the council again.
   - Expected: The Wildcard opinion card is not included in the new debate.
5. Re-enable Wildcard and save.
   - Expected: Wildcard can appear again in future debates.
