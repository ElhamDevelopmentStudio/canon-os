# Candidate Evaluator Manual Test

## Happy path: create and evaluate a candidate

1. Log in and open **Candidates** from the sidebar.
   - Expected: The Candidate Evaluator page opens with a candidate form, evaluation result panel, and candidate history area.
2. Enter a title, choose a media type, add a premise, set hype, genericness, and time cost.
   - Expected: All fields are keyboard reachable and labels are visible.
3. Select **Run Evaluation**.
   - Expected: The page saves the candidate, shows a decision, confidence, likely fit, risk, reasons for, reasons against, best mood, and recommended action.
4. Select **Add To Library**.
   - Expected: A success message confirms the candidate was added to the library as Planned.
5. Open **Library**.
   - Expected: The candidate title appears as a media item owned by the current user.

## Error path: missing title

1. Open **Candidates** and leave the title empty.
   - Expected: The form stays usable.
2. Select **Run Evaluation**.
   - Expected: An error message says a title is required before evaluation.
3. Add a title and select **Run Evaluation** again.
   - Expected: The error clears and a result appears.

## Edge case: skip a risky candidate

1. Create a candidate with high expected genericness, high hype, and a long time cost.
   - Expected: The result warns about genericness and/or time cost risk.
2. Select **Skip Candidate**.
   - Expected: The candidate status changes to Skip and the history revalidates.
3. Reload the page.
   - Expected: The skipped candidate remains in history with the Skip status.

## Delayed queue behavior

1. Run any evaluation and inspect the action buttons.
   - Expected: **Add To Queue** is visible but disabled with text indicating queue actions arrive in MVP-M08.
