# Candidate Evaluator Manual Test

## Happy path: create and evaluate a candidate

1. Log in and open **Candidates** from the sidebar.
   - Expected: The Candidate Evaluator page opens with a compact evaluation workbench, visible guardrail meters, and a **History** button.
2. Enter a title, choose a media type, and add a premise.
   - Expected: The main path only asks for the essential fields and all labels are visible.
3. Open **More context**.
   - Expected: Optional release year, creator, source, time cost, hype, and genericness controls appear without leaving the page.
4. Set a time cost preset, adjust hype, and adjust expected genericness.
   - Expected: The optional controls are keyboard reachable and update without exposing a long required form.
5. Select **Run Evaluation**.
   - Expected: The page saves the candidate, shows a decision, confidence, likely fit, risk, Anti-Generic Filter result, reasons for, reasons against, best mood, and recommended action.
6. Select **Add To Library**.
   - Expected: A success message confirms the candidate was added to the library as Planned.
7. Open **Library**.
   - Expected: The candidate title appears as a media item owned by the current user.

## Happy path: reopen a saved candidate

1. Open **Candidates**.
   - Expected: Candidate history is not shown at the bottom of the page.
2. Select **History**.
   - Expected: A Candidate history dialog opens with search and filter controls.
3. Select a saved candidate from the dialog.
   - Expected: The dialog closes and the selected candidate loads into the evaluator with its latest result.

## Error path: missing title

1. Open **Candidates** and leave the title empty.
   - Expected: The form stays usable.
2. Select **Run Evaluation**.
   - Expected: An error message says a title is required before evaluation.
3. Add a title and select **Run Evaluation** again.
   - Expected: The error clears and a result appears.

## Edge case: skip a risky candidate

1. Create a candidate with high expected genericness, high hype, and a long time cost.
   - Expected: The result warns about genericness and/or time cost risk, and the Anti-Generic section lists any matched red flags.
2. Select **Skip Candidate**.
   - Expected: The candidate status changes to Skip and the history revalidates.
3. Reload the page.
   - Expected: The skipped candidate remains in history with the Skip status.

## Edge case: modern exception

1. Create a recent candidate with a known creator, low expected genericness, and premise notes about original authorial voice.
   - Expected: The Anti-Generic section shows a positive exception instead of treating recency alone as a red flag.
