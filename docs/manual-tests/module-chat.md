# Module Chat Manual Test

## Happy path: Tonight chat

1. Open Tonight Mode.
   Expected result: The page shows the existing Tonight controls and a Tonight chat panel.

2. Send `90 minutes, tired, medium focus, quality, low risk, anime or movie`.
   Expected result: The assistant returns a recommendation instead of asking unnecessary form questions.

3. Review the recommendation list on the page.
   Expected result: Chat-generated recommendations appear in the normal Tonight recommendation area with scores, reasons, time, mood, and action buttons.

## Happy path: Candidate chat

1. Open Candidate Evaluator.
   Expected result: The page shows the Candidate chat panel above the evaluator form.

2. Send a candidate message with title, format, and premise, such as `"Angel's Egg" anime, symbolic faith and ruins, not generic, about 71 minutes`.
   Expected result: The assistant saves/evaluates the candidate and shows a commit/sample/delay/skip recommendation.

3. Use Add To Queue.
   Expected result: The evaluated candidate can be added through the existing queue action.

## Happy path: Discovery chat

1. Open Media Archaeologist.
   Expected result: The Discovery chat panel is available above the structured discovery form.

2. Send `Mindfuck movie`.
   Expected result: The assistant generates a discovery trail and the normal trail result cards appear.

3. Select `Modern exceptions` in the Era field and generate a structured trail, or include `modern exceptions` in the chat request.
   Expected result: Every result has a release year of 2017 or later. Older works such as 1920s or 1980s titles do not appear in the generated trail.

4. Add one result to Queue.
   Expected result: The selected discovery result is saved as a queue item.

## Happy path: Completion Detox chat

1. Add or choose a library item that is planned or consuming.
   Expected result: The item appears in Completion Detox.

2. Open Completion Detox and send a chat message with title, progress, and motivation, such as `30 minutes into "Movie Title", motivation 3/10`.
   Expected result: The assistant records a detox decision and shows drop, pause, or continue guidance.

3. Use Mark Dropped or Mark Paused if available.
   Expected result: The media item status updates through the existing action.

## Happy path: Aftertaste chat

1. Open Aftertaste Log.
   Expected result: The Aftertaste chat panel appears above the entries.

2. Send a message with title, worth-time signal, memorability score, genericness, alive/authored signal, and final thoughts.
   Expected result: The assistant asks for any missing signal before saving.

3. Complete the missing answers.
   Expected result: A new aftertaste entry appears in the log.

## Error path

1. Start a chat with vague text such as `recommend something`.
   Expected result: The assistant asks a focused follow-up instead of hallucinating a recommendation.

2. Try Completion Detox or Aftertaste with a title not in the library.
   Expected result: The assistant asks for the exact saved title and does not create an invalid decision/reflection.

## Edge case

1. Run chat without `MINIMAX_API_KEY` configured.
   Expected result: The panel still works with local deterministic slot extraction and shows a provider note that the local fallback handled the turn.

2. Configure `MINIMAX_API_KEY`, `MINIMAX_BASE_URL=https://api.minimax.io/v1`, and `MINIMAX_MODEL=MiniMax-M2.7`.
   Expected result: New turns use MiniMax. Discovery chat uses MiniMax-generated recommendations with hard-filter validation.

3. Keep `CANONOS_WEB_SEARCH_ENABLED=true`.
   Expected result: Discovery chat provider notes show that live web context was available. If search fails, the assistant reports the fallback instead of hiding it.
