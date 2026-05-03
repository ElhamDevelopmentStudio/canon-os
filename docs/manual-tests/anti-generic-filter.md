# Anti-Generic Filter Manual Test

## Happy path: evaluate a risky generic candidate

1. Log in and open **Candidates**.
   - Expected: The Candidate Evaluator page opens with labeled fields and an empty result panel.
2. Enter a candidate with high hype, high expected genericness, long time cost, and notes such as "mystery box", "filler", and "weak ending".
   - Expected: The form accepts the values without losing focus or hiding labels.
3. Select **Run Evaluation**.
   - Expected: The result shows **Anti-Generic Filter**, a high genericness risk, detected red flags, and a likely skip or sample-with-guardrail verdict.

## Happy path: evaluate a modern exception

1. Select **New Candidate**.
   - Expected: The previous candidate clears and the form is ready.
2. Enter a recent work with a named creator, low expected genericness, low hype, and premise notes like "original authorial voice" or "distinctive craft".
   - Expected: The form remains keyboard reachable.
3. Select **Run Evaluation**.
   - Expected: The Anti-Generic section shows positive exceptions and does not treat the release year alone as a red flag.

## Error path: missing title

1. Open **Candidates** and leave the title blank.
   - Expected: The page remains usable.
2. Select **Run Evaluation**.
   - Expected: A clear message says a title is required before evaluation.
3. Add a title and run again.
   - Expected: The error clears and the Anti-Generic result appears.

## Edge case: disable one rule and re-run

1. Open **Settings** and find **Anti-Generic Filter rules**.
   - Expected: Rules are listed with type, description, **Enabled**, **Weight**, **Save Rule**, and **Reset Rules** controls.
2. Disable **Filler-heavy long series** and select **Save Rule**.
   - Expected: A success message says the rule was saved and evaluation should be re-run.
3. Return to **Candidates**, select the same high-risk candidate, and select **Run Evaluation**.
   - Expected: The new Anti-Generic result no longer lists **Filler-heavy long series** as a detected red flag.
4. Return to **Settings** and select **Reset Rules**.
   - Expected: Defaults are restored and the controls remain understandable.
