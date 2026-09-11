---
description: Write durable session state to SESSION-RECAP.md before compaction
---

Write the current session's durable state to `SESSION-RECAP.md` in the project root,
overwriting it. This survives compaction; the conversation does not.

Include, in this order, and nothing else:

## Decisions
Every decision made this session, as a table: what was decided, what was rejected, why.
Rationale is the point — a decision without its "why" gets relitigated next session.
If a decision was later reversed, keep both and mark the reversal with its date.

## Verified facts
Codebase facts established by actually reading code, each with `path:line`. These were
expensive to find and are the first thing lost to compaction. Examples of the kind that
matter here: tier limits and quota rules, rate-limit values, platform timeouts, where
billing is triggered, which API surfaces exist. Mark anything assumed-but-unverified
as such, explicitly.

## Corrections
Claims made this session that turned out to be wrong, with what's actually true. This
section exists so a compacted future self does not re-assert a corrected error. Include
my own reversals, not just external ones.

## Open questions and blockers
What is undecided, and what is blocked on what. Name the specific thing that would
unblock each.

## Artifacts
Files written or changed this session, by path, one line each on what they contain.
Include any published Artifact URLs.

## Deferred
What was deliberately cut or postponed, and the reason. Distinguish "blocked" from
"chose not to" — they are not the same and the difference matters when picking work back up.

## Preferences stated
Anything the user said this session about how they want the work done, in their framing.

Rules: no narration, no tool-call mechanics, no superseded drafts, no restating the task.
Cite `path:line` wherever a fact came from code. If a section is genuinely empty, omit
its heading rather than writing "none".
