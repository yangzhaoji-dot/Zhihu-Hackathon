# Planet Internal Interaction v1

Goal: validate one loop only: read real Zhihu text -> select excerpts -> collect excerpts -> generate a personal viewpoint -> evaluate -> preview merge/fork.

## Scope

- Sample planet first: `o_stoploss`.
- Planet already has an existing viewpoint; the user is not reconstructing a hidden answer.
- Source material remains grounded in Zhihu answer text / existing source traces.
- The user selects exact text spans from the rendered material.
- AI is used only after collection to synthesize and evaluate the resulting viewpoint.
- Inter-planet collision/fusion is out of scope.

## Interaction loop

1. Land on the existing opinion planet and see the original opinion.
2. Read source cards with author/source context.
3. Highlight a text selection in one source card and click `收下这段`.
4. Collected excerpts appear in a persistent tray.
5. Once at least 2 excerpts are collected, `形成我的观点` becomes available.
6. The synthesis API returns a structured result: generated viewpoint, rationale summary, relation to original, scores, and suggested action.
7. UI previews either:
   - merge into original planet (`refinement` / `support` / `boundary`), or
   - fork a new planet (`revision` / `counterpoint` / `new_dimension`).

## Scoring

The score is feedback, not the goal. Dimensions:

- grounding: supported by selected excerpts
- coherence: internally consistent
- specificity: avoids vague both-sides language
- boundary: acknowledges conditions / limits when present
- novelty: adds something beyond the source planet

## API behavior

For the hackathon prototype, synthesis can use the existing App AI route. The model receives:

- original opinion title + summary
- only the selected excerpts and their source metadata

The model does not receive fabricated evidence. If AI is unavailable, the UI keeps the collected excerpts and shows a clear unavailable state; it does not fake a generated result.

## Phase boundary

This v1 does not persist a real new planet in the graph yet. It renders a merge/fork preview. Graph mutation comes after the interaction loop is validated.
