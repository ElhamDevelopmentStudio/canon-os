# Queue and Tonight Mode Manual Test

## Queue happy path: add and organize items

1. Log in and open **Queue** from the sidebar.
   - Expected: The Adaptive Queue page opens with search/filter controls, three lanes, and an Add Queue Item button.
2. Select **Add Queue Item**.
   - Expected: A modal opens with title, media type, priority, estimated time, best mood, reason, cancel, and save controls.
3. Enter a title, choose a media type, set priority to **Start Soon**, add a reason, and save.
   - Expected: The item appears in the Start Soon lane with media type, priority, time, mood, and reason.
4. Select the item edit button, change priority to **Delay / Archive**, and save.
   - Expected: The item moves to the Delay / Archive lane.
5. Use move up/down controls on queue cards.
   - Expected: Queue order changes and a success message appears.

## Queue from Candidate Evaluator

1. Open **Candidates** and run an evaluation.
   - Expected: A result card appears with a decision, scores, reasons, best mood, and action.
2. Select **Add To Queue**.
   - Expected: A success message confirms the candidate was added to the queue.
3. Open **Queue**.
   - Expected: The candidate appears in the lane that matches its evaluation decision.

## Error path: missing queue title

1. Open **Queue** and select **Add Queue Item**.
   - Expected: The modal opens.
2. Leave the title empty and select **Save**.
   - Expected: An error message says a title is required.
3. Add a title and save again.
   - Expected: The item saves successfully.

## Edge case: remove from queue only

1. Add a queue item from an existing candidate or media item.
   - Expected: It appears in the queue.
2. Select the remove button and confirm.
   - Expected: The item is removed from the queue only. The source candidate or media item remains available in its original area.

## Tonight Mode note

Tonight Mode is implemented in MVP-M09. This document will be expanded there with generate/recommend/start/not-tonight checks.
