# Music That Travels — Research direction and Work handoff protocol

Status: operating agreement, 9 November 2026. Applies to Music That Travels research and implementation tasks within `studio-anelli/playground`.

This document complements [the creative principles](./music-that-travels-principles.md) and [the repository manual](../MANUAL.md). It does not supersede GitHub branch/preview/approval rules.

## Roles and authority

**Creative director (project owner):** Sets the goals, taste, experience priorities, scope and tradeoffs. Reviews the experience, decides when a research result is interesting, and approves or rejects publication and PR merges.

**Research director (ChatGPT in the direction/review conversation):** Turns the creative goal into one bounded, testable mission; records its instructions in GitHub; identifies exact inputs and acceptance criteria; independently audits the evidence, code, coverage and preview returned by the execution session; then recommends acceptance, corrections or the next priority. The director reports to the owner rather than acting as an automatic authority to publish.

**Execution (ChatGPT Work):** Performs sustained research, source retrieval, identity reconciliation, evidence adjudication, data updates, code changes, regeneration and tests. Works in a dedicated branch or PR. Commits the actual results, not just a plan or count of items. Reports blockers and honest unknowns.

**GitHub:** Shared source of truth for the brief, input queue, accepted evidence, outcomes, tests, implementation and final report. A conversation summary is not a substitute for committed evidence.

**Communication limitation:** The direction conversation cannot autonomously control, message or continuously observe a separate Work run. The project owner starts Work, and returns to the direction conversation when its run has finished (or when a decision/blocker needs escalation). No claim of automatic supervision or background monitoring.

## Mission contract

For each substantial mission, the director specifies:

1. **Outcome and experience value** — what should become visibly, audibly or analytically better, and what is outside scope.
2. **Canonical input** — branch/PR, precise file paths, snapshot and identifiers. Avoid reopening completed inventory as a new task.
3. **Complete unit of work** — the whole assigned queue or explicitly named slice. Internal checkpoints are allowed; they do not count as final delivery.
4. **Source and identity rules** — allowed evidence, precise relation types, edition/artist/recording distinctions and uncertainty policy.
5. **Acceptance tests** — measurable research progress, test/build/preview status, record-level outcomes and no-regression conditions.
6. **Deliverables** — source changes, generated map, machine-readable adjudication, consolidated report and reviewable PR.
7. **Stop/escalation rule** — stop only after the assigned scope is completed, evidence is genuinely exhausted, or a documented blocking limitation prevents continuation. Do not stop merely because a small number of successful examples have been found.

Once briefed, Work should proceed through the mission without repeatedly asking permission for minor subtasks. When a constraint materially changes the goal, the owner decides.

## Musical geography: evidence acceptance

The map distinguishes music/artist scenes, artist base, group formation, cultural roots, documentary recording locations, and the geographic market of the *owned edition*. These relationships are different and must be labelled distinctly.

- Preserve exact Discogs release IDs, instance IDs and artist identities, plus track/master scope where relevant. Reuse evidence only across matching, checked artist IDs; never match by similar names alone.
- Use first-party artist/label documentation, Discogs and MusicBrainz with verified identities, reliable interviews and specialist music archives; cite URLs and what each actually supports.
- A documented city, region or country **associated with the artist's musical work** is acceptable when its relation, precision and temporal limits are explicit. It is not automatically the recording location of every owned record.
- Do not infer musical origin from citizenship, birthplace alone, genre, record-shop location, pressing/edition country, label headquarters or shipping routes.
- Compilations, aliases, collaborations, remixes and anonymous/white-label records require proper scope. Preserve distinct contributors instead of collapsing them into one location.
- Genuinely undocumented origins remain unknown, visible in the experience, and recorded as reviewed unresolved if they were actually investigated. An unchecked record is **pending**, not “no evidence.”
- Favour broad reliable mapping, selective cultural depth and delightful discoveries over unnecessary encyclopedic biographies.

## Research progress is not inventory progress

The following three numbers **must be reported separately**:

- **Assigned:** records in the input queue.
- **Investigated/adjudicated:** records for which real external source checks were carried out, with source links and outcomes.
- **Newly mapped:** formerly unplaced records which now have an accepted geographic association included in the regenerated map.

Counting every input record, creating a review register or changing `verification_pending` metadata without actual source work is **not** completed research. Never present projected coverage as an observed production/map result.

Each record outcome must have an exact release ID, identity, outcome (`accepted_geography`, `reviewed_no_evidence`, `identity_unresolved`, `compilation_scope_unresolved`, `conflicting_evidence`, or `verification_pending`), evidence URL(s) if available, geographic relation/precision for accepted claims, caveats and review date. Only accept a result when the supporting source has actually been consulted.

## Work delivery contract

One consolidated report per completed mission should provide:

| Field | Required content |
| --- | --- |
| Scope | Branch/PR, canonical input and input count |
| Actioned | Number actually independently researched and adjudicated, and any not investigated |
| Research gains | Number of newly accepted, evidence-backed **previously unplaced** records; identity reuse count |
| Residuals | Exact unresolved count, outcome categories and source/identity blockers |
| Map coverage | Before/after denominators, geography vs edition lens, projected vs built vs public clearly distinguished |
| Evidence quality | Source links, verification notes, exceptions/conflicts, and sampled independent source checks |
| Technical integrity | Source commits, regeneration command/result, tests, Cloudflare build status, functioning preview URL |
| Decision | Ready for independent audit, needs correction, blocked, or explicitly partial |

Work must update the canonical data and build the map when the mission requires it. Reporting only that a script or queue exists is not sufficient. If real limitations prevent full completion, Work must report what it **actually did**, what remains, and the limitation without claiming success.

## Independent review and publication

When the owner says “Work finished”, the director inspects the changed files and PR, checks the actual adjudication and evidence against the mission, verifies GitHub/Cloudflare checks and preview, samples sensitive identities/scopes, and reconciles the coverage counts.

- **Accept:** evidence and implementation meet criteria; recommend merge for owner approval.
- **Revise:** provide a precise correction brief referencing the existing PR and defective records. Work continues on the same workstream.
- **Blocked or partial:** present measured progress, risks and realistic next options. Never substitute an inventory for completed research.
- **Merge:** only after owner approval and appropriate build/preview verification under `MANUAL.md`.

## Current geographic-completion mission

At protocol creation, the workstream is [PR #90](https://github.com/studio-anelli/playground/pull/90). The frozen 257-record queue and its review register are in `lib/music-that-travels/source/geography-completion-queue.json` and `geography-completion-review-register.json` on that branch.

The prior Work run enumerated all 257 but documented **0 independently verified new records**; all 257 were still marked `verification_pending`. That is an inventory checkpoint, not mission completion. For this workstream, resume **actual external musical-geography research** across the whole queue, regenerate the map, test it, and deliver one consolidated adjudication and coverage report. Do not repeat the inventory step.

## Minimal practical handoff

**Owner → Work:** “Execute the mission in PR #90. Read `docs/music-that-travels-research-direction.md` from `main` and the completion brief on PR #90. Do the actual research across the whole outstanding queue, update the source/map, run tests, and report all outcomes. Do not stop at inventory.”

**Owner → direction conversation:** “Work is done. Review PR #90 against the research-direction contract.”

The director then provides one concrete audit and decision recommendation, not another planning cycle.
