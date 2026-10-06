# AAB Platform Governance — Parallel Development Protocol

**Document:** PARALLEL-DEVELOPMENT-PROTOCOL-2026-10-02  
**Internal reference:** AAB-GOV-DEC-PARALLEL-DEVELOPMENT-01  
**Status:** APPROVED — reviewed and approved in governance session 2026-10-02  
**Platform Owner approval:** approved as drafted, 2026-10-02, with the first experiment's packages to be chosen when they are opened (section 9)  
**Date:** 2026-10-02, drafted at `main` `67dfdbf`  
**Type:** Platform development operating procedure  
**Applies to:** all development work on this repository when more than one AI system works on AAB at the same time, Claude Code and ChatGPT among them, and the Platform Owner's coordination of that work. The pull request rule added on 2026-10-03 applies to every pull request, whether or not parallel development is active.\
**Supplements:** governance/AAB-PLATFORM-ROADMAP-2026-09-27.md, sections 8.3 to 8.5 (the governed migration path, its order and its prerequisites); governance/AAB-PLATFORM-DOMAIN-SEPARATION-DECISION-2026-09-25.md; governance/AAB-COUNTRY-SCIENTIFIC-DATA-NON-RETURN-BOUNDARY-2026-09-13.md

**Authority:** ESTABLISHES HOW PARALLEL DEVELOPMENT ON AAB IS ORGANISED, RECORDED, REVIEWED, MERGED AND RECOVERED. Grants no AI system merge authority. Changes no contract, no capability's state and no decision recorded elsewhere. Does not start the extraction of the platform primitives, satisfy the dependency audit's independent verification, satisfy Gate D or begin WP05.

**Amended:** 2026-10-03, with the pull request rule (see "Amendment of 2026-10-03: the pull request rule").

---

## Amendment of 2026-10-03: the pull request rule

**Why.** The rule every pull request has followed in review was given by the Platform Owner in session, and the merge subject was recorded as proposed, not adopted (stock-take, section 3, update of `59a0dfe`). A rule that exists only inside a chat breaks section 2's principle. Rule 8 also says "Only the Platform Owner merges to `main`", while in practice the developer executes the merge on the Platform Owner's instruction. This amendment writes the rule into the repository, and supersedes rule 8's first sentence (point 2).

**1. Every pull request.** Every pull request to this repository follows this rule, however small or clerical, whether or not more than one AI system is working on AAB at the time.

**2. Merging is the Platform Owner's decision.** For the purposes of rule 8, its first sentence is superseded by the following: Only the Platform Owner possesses merge-decision authority. A developer or AI system may execute the mechanical merge operation only under a fresh, explicit, one-time Platform Owner instruction, given after the final report and naming the reviewed head SHA. That execution grants no autonomous or continuing merge authority.
- The instruction is "merge it", naming the head SHA.
- The developer merges only if the PR's head is still that SHA, with the merge pinned to it, by this command: `gh pr merge <PR-number> --merge --match-head-commit <full-head-sha> --subject "Merge PR #NNN — <PR title>"`. If the head has moved, the developer does not merge: it stops and reports.
- Never while CI is running. Never on the developer's own initiative.
- **Rule 8's other requirements are unchanged:** the instruction is given after the report, never in the same turn; auto-merge is never enabled; an earlier approval never covers a later merge.
- This agrees with the protocol's Authority header: "Grants no AI system merge authority."

**3. The report on opening a pull request.** The developer reports:
- the PR's number and link;
- the full head SHA;
- CI on that head: the test count, the isolation result, and the backup-restore outcome with its step count.

It is given in this form: "PR #NNN is open at head <sha>. CI: N of N tests passed, isolation passed, backup-restore PROVEN. I'll merge when you say merge it, tied to <sha>." **If CI has not finished,** the developer says so, and checks again only when asked.

**4. The merge subject.** "Merge PR #NNN — <PR title>", set by the command in point 2.

**5. Hashes.** Every hash reported is produced by a command from its source, and compared by a script. None is copied by hand. A shortened hash is for reading only; the full value is authoritative.

**6. The report after a merge.** The developer reports the merge commit, its parents, and that `main` points to it.

**What this amendment does not change.** Apart from rule 8's first sentence, superseded in point 2, rules 1 to 12 and sections 4 to 11 are unchanged. It changes no contract, no capability's state and no decision recorded elsewhere. It authorises no implementation and no extraction.

---

## 1. Purpose

AAB is now built by more than one AI system working at the same time, under one Platform Owner. This document establishes:

1. the principle that keeps that work recoverable;
2. twelve rules that keep parallel work from colliding;
3. the two files every unit of parallel work carries: a work package and a handover;
4. how work is checkpointed, and how it is recovered when a chat falls behind or is lost;
5. the coordination register that shows who owns what;
6. the first parallel experiment; and
7. the order in which parallel development is introduced.

**Naming.** A unit of parallel work is a **development work package**, identified `DWP-NNN` (`DWP-001`, `DWP-002`, …). The `WPnn` identifiers belong to the Phase-2 work packages (WP04, WP05; `governance/phase-2/`) and are never reused here.

---

## 2. The governing principle

**No fact required to continue AAB may exist only inside a chat.**

A chat is a working surface, not a record. It can lag behind `main`, be compacted, or be lost. Anything another session would need in order to continue the work belongs in the repository, committed, before the chat that produced it ends:

- decisions, and who made them;
- the state of the work: what is done, what is in progress and exactly where it stopped;
- the base it was built on;
- open questions, and what blocks the work;
- the reason for any choice that a later session could otherwise undo.

**The repository wins.** Where a chat's account of the work and the repository disagree, the repository is the record, and the chat is corrected. A fact that existed only in a lost chat is treated as never having been established, and is established again.

---

## 3. The twelve rules

1. **Pinned SHA.** Every work package starts from a recorded commit of `main`, its *pinned base*. Every claim the work package makes about the state of AAB ("the tests pass", "this function does X", "this contract says Y") is a claim at that commit, or at a later one it names.

2. **One owner per file.** Every file a work package changes is owned by exactly one open work package, listed in its `WORK-PACKAGE.md` and in the coordination register. No other work package edits it. A file that two packages both need is either split, or the change is sequenced: one package merges first, and the other rebases onto it.

3. **No concurrent migrations.** At most one open work package may add or change a database migration at a time. Its migration numbers are reserved in the coordination register before it writes them. Migrations already on `main` are never edited.

4. **Interface freeze.** The interfaces a work package consumes — JSON schemas, routes, receipt and error envelope shapes, database tables and functions, and the contracts they come from — are frozen for it at its pinned base, and listed. A work package that needs one of them changed does not change it: the change is its own work package, merged first, and every package that consumes the interface rebases onto it.

5. **Small PRs.** One work package is one pull request, of a size one reviewer can read in full in one sitting. Work that cannot be is split into more work packages before it starts, not after.

6. **Machine-readable contract tests.** Every work package that builds against a contract carries tests that check the contract's requirements mechanically, and that CI runs: schema validation, refusal codes, fail-closed behaviour, receipts in the same transaction, least-privilege access. The tests are named in the work package. A requirement with no test is listed as untested, never assumed met.

7. **Cross-review.** Work produced by one AI system is reviewed before merge by another system or another session that did not produce it, read-only, with its findings recorded in the repository. A finding is resolved by a change on the branch and re-verified, never by argument in a chat. No system reviews its own work as the review that counts.

8. **Human merge authority.** Only the Platform Owner merges to `main`. An AI system reports the PR's state, with the CI run, and waits for a fresh instruction to merge, given after that report. It never merges in the same turn it reports, never enables auto-merge, and never treats an earlier approval as covering a later merge.

9. **Integration order.** Work packages merge in dependency order: platform before domain, and a capability before the capabilities that rely on it (roadmap, sections 5 and 8.4). A work package whose dependency has not merged does not merge, whatever the state of its own tests.

10. **Rebase and rerun.** Before merge, a branch is rebased onto the current `main`, and the full CI — the test suite and the backup-restore proof — is run again on the rebased head. A green result on an older base does not count. If `main` moves after that run and before merge, the branch is rebased and run again.

11. **No shared live environment.** Parallel work packages never share a running database, object store, Supabase project, hosted site or key. Each works on its own local or CI stack. The rehearsal (`wa-rehearsal.nexiuma.ai`, Supabase project `kdpcfbaeklkffozryjah`) and any live service are touched by no work package without the Platform Owner's separate authorisation, recorded in the work package.

12. **No protected information.** The repository is public, and a chat with an external AI system is an external service. No work package, branch, handover, review or chat carries:
    - credentials, tokens, private keys or secrets of any kind;
    - personal information;
    - country scientific information (the egress specification's category 2), or any real country data;
    - outreach and commercial information, which is tracked outside this repository.

    An AI system is given only what is on the public repository, or what the Platform Owner chooses to give it. Test data is synthetic.

**Safeguard investigation** (decision 72, boundary 4; `governance/AAB-PLATFORM-SECURITY-GAP-CONTINUATION-DECISION-2026-10-05.md`): work on an unresolved confidentiality, isolation, authority or recoverability safeguard uses rule 11 environments and rule 12 material only: isolated and disposable, with synthetic material or expressly authorised non-production material containing no real information. Rules 11 and 12 are unchanged.

---

## 4. The work package: `WORK-PACKAGE.md`

Every work package has a folder, `governance/development/work-packages/DWP-NNN-<short-name>/`. Its `WORK-PACKAGE.md` is written and reviewed **before any work begins**, and merged to `main` with the work package's entry in the coordination register, so that every session can see who owns what. After that it is changed only on the work package's own branch.

**Template:**

```markdown
# DWP-NNN — <title>

**Status:** PROPOSED | OPEN | IN_REVIEW | READY_TO_MERGE | MERGED | ABANDONED
**Opened:** <date>, approved by the Platform Owner on <date>
**Owner:** <AI system and session label>
**Reviewer:** <AI system or session that did not produce the work>
**Branch:** <branch name>
**Pinned base:** <full SHA of main>

## Objective
One paragraph: what exists on main when this package merges that did not before.

## Governing sources
The contracts, decisions and records this work implements or relies on, with paths.

## In scope
## Out of scope

## Owned files
Every path this package may create or change. Exclusive: no other open package edits them.

## Read-only files
Paths this package reads and relies on, and must not change.

## Interfaces consumed (frozen at the pinned base)
Schemas, routes, envelopes, tables and functions, each with its source.

## Interfaces produced
What this package adds that later packages may consume.

## Migrations
Numbers reserved in the coordination register, or "none".

## Contract tests
Each test, the requirement it checks, and the command that runs it.
Requirements with no test, listed as untested.

## Acceptance criteria
What must be true, and shown, before the package is ready to merge.

## Depends on
Work packages, and platform prerequisites, that must merge first.

## Protected information check
A statement that the package carries none of the information in rule 12.

## Review record
Where the review's findings are recorded, and how each was resolved.

## Merge record
PR, final head SHA, CI run, merge commit, and the date of the Platform Owner's instruction.
```

---

## 5. The handover: `HANDOVER.md`

Every work package keeps a `HANDOVER.md` in its folder, on its branch. **It is written so that a session that has never seen the work can continue it from the repository alone.** It is updated with every checkpoint commit (section 6) and merges with the work.

**Template:**

```markdown
# DWP-NNN — Handover

**Last updated:** <UTC date and time>, by <AI system and session label>
**Branch head:** <SHA of the commit that contains this handover's previous update, or "first checkpoint">
**Pinned base:** <SHA>; main is now at <SHA>; rebase needed: yes | no

## State in one paragraph

## Done
Each item with the commit that holds it.

## In progress
Exactly where the work stopped: the file, the step, and what was being attempted.

## Next steps
In order.

## Decisions taken in this package
Each decision, who made it, and where it is recorded. A decision made in a chat
is not a decision until it is written here or in a governing record.

## Open questions for the Platform Owner

## Tests
The last command run, its result, and the CI run if there is one.
Anything known to be failing, and why.

## Do not
Anything a resuming session must not do, and why.
```

---

## 6. Checkpoint commits

- **What a checkpoint is.** A commit on the work package's branch that records the work as it stands, with `HANDOVER.md` updated in the same commit. Its message begins `checkpoint(DWP-NNN):`.
- **When.** At every meaningful step; before any handover between sessions; before a session ends; and whenever a chat is long enough that it may be compacted. **No session ends with uncommitted work.**
- **Pushed at once.** A checkpoint that is not pushed is not a checkpoint.
- **Incomplete work is allowed, and stated.** A checkpoint may hold work that does not yet build or pass, as long as its handover says so plainly. It never claims more than it holds.
- **History is never rewritten.** No force-push, no amend and no rebase of commits that have been pushed, except the rebase onto `main` before merge (rule 10), which the handover records. Recovery depends on every pushed checkpoint remaining reachable.
- **Branches only.** Checkpoints are never made on `main`.
- **The repository's conventions apply:** line-ending conversion off for byte-bound files, and the commit identity and attribution the repository requires.

---

## 7. Recovering a lagging or lost chat

A chat **lags** when `main` or its own branch has moved without it, or when it was compacted. It is **lost** when it cannot be continued. Both are recovered the same way, from the repository.

1. **Stop.** The lagging chat makes no further change until it is recovered. A lost chat is replaced by a new session.
2. **Fetch.** Fetch `origin`, and read the coordination register on `main`.
3. **Find the package's last pushed checkpoint** on its branch. Work not pushed is treated as never done.
4. **Read the package's `WORK-PACKAGE.md` and `HANDOVER.md`** at that checkpoint, in full.
5. **Compare the bases.** Note the pinned base and the current `main`, and whether any interface the package consumes has changed since its base. If one has, the package stops and the Platform Owner is told.
6. **Verify, do not trust.** Run the package's tests and confirm that its handover's claims hold on the branch as it is. A claim that does not hold is corrected in the handover, not carried forward.
7. **Record the recovery** as a checkpoint: the date, the session that recovered it, what was found, and any correction made.
8. **Continue** from the handover's next steps.

**A chat's memory of the work is never a source.** If a lagging chat remembers something the repository does not hold, it is treated as unestablished: the Platform Owner decides whether it is established again.

**If the owner is lost for good,** the Platform Owner reassigns the package in the coordination register, and the new owner recovers it by the steps above.

---

## 8. The coordination register

**One file on `main`:** `governance/development/COORDINATION-REGISTER.md`. It is created with the first work package. It is the one place that shows every work package, who owns what, and what is reserved.

**Who changes it.** Only the coordinating session that the Platform Owner designates, in its own small PR, when a package is opened, reassigned, changes status, or merges or is abandoned. No work package branch edits the register, so it never becomes a point of conflict.

**Its sections:**

1. **Work packages.** One row each:

   | Field | Content |
   |---|---|
   | ID | `DWP-NNN` |
   | Title | |
   | Owner | AI system and session label |
   | Reviewer | |
   | Branch | |
   | Pinned base | SHA |
   | Status | PROPOSED, OPEN, IN_REVIEW, READY_TO_MERGE, MERGED, ABANDONED |
   | Depends on | Packages and prerequisites |
   | PR | Link, once opened |
   | Last updated | Date |

2. **File ownership.** Every path owned by an open package, and its package. A path appears at most once.
3. **Migration reservations.** Each reserved migration number, its package, and whether it has merged. Only one package holds open reservations at a time (rule 3).
4. **Frozen interfaces.** Each interface an open package consumes, the SHA it is frozen at, and the packages relying on it.
5. **Integration queue.** Packages ready to merge, in the order rule 9 requires.
6. **Event log.** Append-only: each opening, reassignment, recovery, review, merge and abandonment, with its date and commit.

---

## 9. The recommended first parallel experiment

**A small, documentation-only experiment, before any parallel code.** It tests the protocol itself, not the platform.

- **Two work packages at once, on disjoint files, with no migration and no code in `scs-pilot`:**
  - `DWP-001` (Claude Code): **the CAP-02 canonical contract**, once its step 1 decisions are confirmed. Its files are in `governance/workstream-b/`, and CAP-02's amendments to other contracts are included only if no other open package owns those files.
  - `DWP-002` (ChatGPT): **a machine-readable statement of CAP-04's contract requirements**, the checklist from which CAP-04's contract tests are later written (rule 6). It is read-only against CAP-04's contract, and its files are in its own folder. It writes no tests that run yet.
- **Each package reviews the other** (rule 7). The Platform Owner merges both (rule 8).
- **A recovery drill.** Partway through one package, its chat is deliberately abandoned, and a new session continues it from its `WORK-PACKAGE.md` and `HANDOVER.md` alone (section 7).
- **The experiment succeeds if:**
  - both packages merge with no conflicting edit;
  - the resumed session continues the work with nothing taken from the abandoned chat;
  - every review finding is recorded and resolved in the repository; and
  - no fact the Platform Owner needed existed only in a chat.
- **Its result is recorded** in the coordination register's event log, and this protocol is amended for what it teaches before code is developed in parallel.

The choice of packages is the Platform Owner's. These two are proposed because they touch no shared file, need no migration, and are useful whatever the outcome.

**Decided at approval (2026-10-02): CAP-02 is not the first experiment.** Its contract was already under way in an existing session, through the governed workflow, when this protocol was approved, and work already begun would not prove what the experiment is designed to prove. CAP-02 continues in that session. **`DWP-001` and `DWP-002` begin only from clean, approved starting points,** once their `WORK-PACKAGE.md` files are on `main`. Which packages they are is chosen when they are opened; the CAP-04 requirements statement above remains a candidate.

---

## 10. The staged implementation sequence

Parallel development reaches AAB's code in stages. **Each stage begins only when the one before it is complete,** and each is the Platform Owner's decision to begin.

1. **The dependency audit's independent verification.** A signed review by an independent human reviewer, working from review pack version 2 (roadmap, section 5.3; open decision 8). No AGR code is brought across before it, and no code is developed in parallel before it. Documentation work, such as the first experiment (section 9), may proceed.
2. **Extraction of the platform primitives** out of `scs-pilot`, which the domain separation decision allows only after that verification. **One stream, not parallel:** the extraction touches nearly every file that later work would build on. The second AI system reviews each step, and may write tests against the extracted modules in files it owns.
3. **CAP-04 as the primary stream.** CAP-04 is built first, because every other AGR capability resolves its evidence through it (roadmap, section 8.4). One owner builds it, one package per step, and the second system reviews it.
4. **Adversarial tests.** While CAP-04 is built, or immediately after, the second system writes tests that try to break it: refusal and fail-closed paths, idempotency, receipts written in the same transaction, least-privilege roles, row security, cross-country and cross-domain refusals, and challenge paths. They are in files it owns, and they are run in CI. A test that finds a fault is resolved on CAP-04's branch, never by weakening the test.
5. **Parallel capability branches.** Only after CAP-04 is merged and its adversarial tests pass, capabilities are built in parallel, each as its own work packages. A capability starts only when every capability it depends on is merged (rule 9): CAP-05 after CAP-04; CAP-06 before CAP-07; CAP-07 before CAP-08's test material checks; and as recorded in each contract's prerequisites.

---

## 11. What this document does not establish

- It grants no AI system authority to merge, to approve its own work, or to decide anything reserved to the Platform Owner.
- It changes no contract, no capability's state, and no priority recorded in the roadmap.
- It does not appoint the dependency audit's reviewer, begin the extraction, or authorise any AGR code.
- It does not authorise access to the rehearsal, a live database or any hosted service.
- It does not create the coordination register or any work package. Each is created when the first work package is opened.

---

*This document was approved in governance session 2026-10-02. It is a platform development procedure, not a capability contract, and is held in `governance/development/`.*
