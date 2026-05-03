# Critic Council Manual Test

## Happy path: run council on a candidate and media item

1. Log in and open **Candidates**.
   - Expected: Candidate Evaluator loads.
2. Create or select a candidate with a title, premise, release year, expected genericness, and time cost.
   - Expected: The candidate is saved in history.
3. Open **Library** and create or choose a media item.
   - Expected: The media item is visible in the library.
4. Open **Critic Council**.
   - Expected: The page shows a prompt box, candidate selector, media item selector, Run Council button, critic settings, and council history.
5. Select the candidate and media item, enter a short prompt, and click **Run Council**.
   - Expected: A final council decision appears with confidence, disagreement, explanation, and critic opinion cards.
6. Click **Add Decision To Candidate**.
   - Expected: The button confirms the decision was applied, and the candidate status matches the final decision.

## Error path: run without any input

1. Open **Critic Council** with no candidate, media item, or prompt selected.
2. Click **Run Council**.
   - Expected: A visible error asks for a prompt, candidate, or media item.

## Edge case: disable a critic

1. In **Critic settings**, find **Wildcard**.
2. Uncheck **Enabled** and click **Save Critic**.
   - Expected: A success message says the critic setting was saved.
3. Run the council again.
   - Expected: The Wildcard opinion card is not included in the new debate.
4. Re-enable Wildcard and save.
   - Expected: Wildcard can appear again in future debates.
