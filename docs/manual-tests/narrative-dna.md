# Manual Test: Narrative DNA Analyzer

## Happy path: request analysis for a media item

1. Log in and open **Library**.
   - Expected: Your media items are visible.
2. Add or open a media item with notes about atmosphere, themes, characters, or ending.
   - Expected: The media detail page opens.
3. Select the **Narrative DNA** tab.
   - Expected: An empty state appears if no analysis exists yet.
4. Enter optional **Narrative analysis notes**.
   - Expected: Notes stay in the textarea.
5. Select **Request Narrative Analysis**.
   - Expected: The request succeeds and the page shows completed status, trait scores, summary, extracted traits, and evidence notes.

## Error path

1. Disconnect the API or use an expired session, then request Narrative DNA.
   - Expected: The page shows a clear Narrative analysis error and does not fake a completed result.
2. Log in again and retry.
   - Expected: The request works after authentication is restored.

## Edge case: metadata-only analysis

1. Open a media item with no notes.
   - Expected: The **Narrative DNA** tab still allows a request.
2. Request analysis without extra notes.
   - Expected: The result has lower confidence and evidence notes say the basis was metadata/title-level evidence.

## Candidate integration check

1. Create a completed Narrative DNA analysis for a media item.
   - Expected: The analysis appears in the media detail tab.
2. Open **Candidate Evaluator** and evaluate a candidate with a premise that mentions a matching trait, such as atmosphere or character complexity.
   - Expected: The result shows **Narrative DNA signals** when the saved analysis influenced scoring.

## TasteGraph integration check

1. Rebuild **TasteGraph** after a completed Narrative DNA analysis exists.
   - Expected: Signal node counts include Narrative DNA, and the text graph can show narrative signal connections.
