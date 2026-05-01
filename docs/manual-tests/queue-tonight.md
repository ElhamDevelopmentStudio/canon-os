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

## Tonight Mode happy path: generate a plan

1. Add at least two queue items: one **Start Soon** item under 120 minutes and one **Sample First** item under 60 minutes.
   - Expected: Both items appear in their queue lanes.
2. Add one planned library media item with a known runtime, page count, or audiobook length.
   - Expected: The item appears in Library with status **Planned**.
3. Open **Tonight Mode** from the sidebar.
   - Expected: The page shows available time, energy, focus, desired effect, media type, risk tolerance, and Generate Tonight Plan controls.
4. Enter 120 available minutes, choose medium or deep focus, choose a desired effect, and select preferred media types.
   - Expected: The form accepts the choices without leaving the page.
5. Select **Generate Tonight Plan**.
   - Expected: Recommendation cards appear with Safe choice, Challenging choice, and/or Wildcard choice labels, reasons, media badges, fit scores, and time estimates.

## Tonight Mode actions

1. On a linked planned media recommendation, select **Start This**.
   - Expected: A success message says the title is marked as consuming, and the media item status changes to **Consuming** in Library.
2. On a queued recommendation, select **Not Tonight**.
   - Expected: A success message appears and the queue item moves to the **Delay / Archive** lane.
3. On a planned media recommendation not already queued, select **Add To Queue**.
   - Expected: A success message appears and the title is visible in Queue.

## Tonight Mode error path: invalid time

1. Open **Tonight Mode**.
   - Expected: The form is visible.
2. Set available time to 0 or blank and select **Generate Tonight Plan**.
   - Expected: An error message asks for at least 1 available minute and no recommendation request is sent.

## Tonight Mode edge case: no matching candidates

1. Use a new account with no queue items and no planned media.
   - Expected: Queue and Library are empty.
2. Open **Tonight Mode** and select **Generate Tonight Plan**.
   - Expected: The page shows an empty state explaining that queue items or planned media are needed.
