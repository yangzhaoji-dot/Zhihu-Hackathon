# Cognitive Universe v1 — Integrated Product Contract

This document freezes the interaction architecture before implementation. The product is a web-native cognitive universe, not a game engine.

## Product loop

1. **Opening / Home** — enter the cognitive universe, search or choose a question.
2. **Question galaxy** — see the question as the gravity core and many viewpoint planets grouped by thinking direction.
3. **Cluster** — semantic zoom reveals concrete viewpoints.
4. **Planet focus** — inspect one existing viewpoint and choose to land.
5. **Planet internal exploration** — read grounded Zhihu text, select exact spans, collect excerpts.
6. **Viewpoint synthesis** — AI sees only the user-selected excerpts and forms a new viewpoint.
7. **Evaluation** — a separate AI pass compares the new viewpoint with the source planet and evaluates grounding, coherence, specificity, boundary awareness and novelty.
8. **Evolution action** — user confirms either:
   - **merge**: refine the source planet in place; or
   - **fork**: create a new user-synthesized planet linked to its parent.
9. **Return to galaxy** — the changed/new planet is visible immediately and remains in browser session state.
10. **Inter-planet interaction** — user selects two planets, asks AI to analyze their collision, then can fuse them into a third planet.

The first eight steps are one cognitive act: *read → select → synthesize → evaluate → evolve*. Cross-planet interaction is a second act: *compare → collide → fuse*.

## Grounding rules

- User-facing source material is real source text from the graph, not an AI rewrite.
- A selected excerpt must be a literal substring of an allowed source; the server validates it.
- Synthesis receives only selected excerpts, not the source planet title. This avoids target imitation.
- Evaluation is a separate pass and may see the source planet.
- If AI is unavailable, selected excerpts remain intact and the product shows an unavailable state. It must not fabricate a result.
- Demo-authored galaxy labels remain explicitly demo content; they are never presented as Zhihu authors or statistics.

## Planet state model

A user-evolved opinion is still an `Opinion`, with additional optional provenance metadata:

- `kind: "user"`
- `origin: "user-synthesized"`
- `sourceIds`: source records used by the user
- `selectedExcerpts`: exact spans the user selected
- `derivedFrom`: parent opinion ids
- `evolution`: relation, action, score, timestamp, and previous title for merges

### Merge

Merge means the new result is a refinement of the same cognitive object. The source planet keeps its id and position, but its title/summary are refined. Provenance and previous title are retained.

### Fork

Fork creates a new planet near the parent. It receives a stable client-generated id, retains selected source ids/excerpts, and a graph relation is created from parent to child.

## Demo / live graph continuity

All graph mutations happen on the browser-side `OpinionGraph` and are saved through the galaxy session store. This works for the authored demo and for live searched graphs.

The demo graph is no longer immutable once a user starts evolving it: session state overrides the pristine fixture. A reset action can restore the pristine demo.

When the demo stand-in `demo-health-0` lands, its internal reading material comes from the grounded sample opinion `o_stoploss`, but evolution is applied back to `demo-health-0` in the originating demo graph. This keeps the primary demo path coherent.

## Planet-to-planet interaction

Inside a cluster, the user can mark up to two planets for **collision**.

Collision output shows:
- consensus
- core disagreement
- conditions for each viewpoint
- evidence comparison
- missing information
- candidate synthesis

The user can then **fuse into a new planet**. Fusion is not automatic: the analysis is visible first, then the user confirms. The fused planet keeps both parents in `derivedFrom`, inherits their source ids, and is saved into the current graph.

## Visual / navigation rules

- Universe: 2D/2.5D luminous deep-space map with semantic zoom.
- Planet: web-native reading + selection surface, not free-roaming gameplay.
- Evolution must be visible: after merge/fork/fuse, returning to the galaxy highlights the affected planet.
- Generated/user planets use a distinct but restrained visual treatment; they are not silently presented as original human viewpoints.
- Browser Back / Escape semantics remain predictable.

## Scope that must be functional in this branch

- opening + home + recommendations + search
- question galaxy + cluster zoom + focus
- landing into the sample planet from the main demo path
- grounded text selection and collection
- synthesis + evaluation
- confirmed merge/fork that mutates the originating graph
- generated planet visible after return
- re-entering a generated planet using its stored sources
- two-planet collision analysis
- fusion into a third planet
- session persistence / demo reset
- mobile-safe layout and reduced-motion compatibility
- CI tests for graph evolution and primary browser flows

## Explicitly deferred

- multi-user/social matching
- durable cloud/database persistence of personal evolved galaxies
- model hidden-state / chain-of-thought instrumentation
- free-roaming 2.5D game controls
- real-time collaborative editing

These are extensions, not blockers for the complete hackathon interaction loop.
