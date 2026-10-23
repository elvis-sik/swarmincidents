# Publishing reviewed updates

The canonical publication journal travels with the incident catalog. Both the Updates page and RSS are generated from its validated announcement projection; editing a substantive incident alone cannot pass the publishing gate.

## Review flow

1. Produce a before/after catalog and run `publication.py packet --help` for the drafting-packet command. The packet contains exact entity differences and available source candidates.
2. The editing agent drafts the factual title and short summary, chooses one main resource and at most one complementary resource, and explains each selection. Select evidence for the particular development, including relevant incident, response or dataset citations. Do not equate an updated source timestamp with newly public information.
3. Elvis reviews inclusion, wording, source choices and freshness. Plan approval is recorded as `curator-reviewed`; Git review remains the authorization boundary. The journal CLI does not call a model or send messages.
4. Prepare and validate the release using `publication.py prepare --help` and `publication.py check --help`. Every changed entity must reference the appropriate announcement or have a specific routine-edit reason. New incidents always need their own announcement. Shared responses must be linked to incidents they actually concern.
5. Commit the catalog, append-only journal and exact generated `updates.json` export together. The private publisher compares against the deployed public catalog before copying them and rebuilding.

Announcement IDs and timestamps remain stable. Substantive developments and material corrections get distinct announcements. Routine formatting or metadata edits can be recorded without creating news. No historical reconstruction should be silently presented as fresh information.

## Historical migration

The initial retrospective import preserves the four released RSS entries and adds 44 reviewed historical entries. Its manifest enumerates and hashes the exact import and records curator review. Reconstructed entries carry public commit provenance and saved snapshots. Old-dated entries have distinct GUIDs, so a reader may still present them as unread on first seeing the import.

The baseline becomes immutable after migration; subsequent publication records extend it rather than rebuilding history. Eight reviewed swarm/fleet annotations are recorded as a routine catalog transition without changing incident inclusion, titles or accounts.

## Channel behavior

The website and RSS use the same announcement copy and resources. Website details expose the historical differences and a primary View incident action. RSS retains the Read on swarmincidents.com wording. This release does not activate email collection, an email schedule, X posting or automatic editorial approval.

## Original catalog addition date

`catalog-metadata.json` stores each card’s original `added_at`, `original_update` and evidence `basis`. Incident cards display that stored date linked to the original Updates entry; builds validate it against the earliest New incident record instead of deriving a replacement. Later updates and corrections cannot reset it. Dates use America/Los_Angeles. Historical Git provenance and its limitations remain in the persisted metadata; the small visible field presents the selected catalog date without a qualifier. Missing or contradictory records fail the build.

## Public source registry

`source-registry.json` retains public source identities, observed URL aliases, existing title/publisher variants and per-incident curated/additional associations. Curated sources must exactly preserve the editorial catalog; additional references are saved context, not independently verified supporting evidence. Sign-in-required references retain only already-public lead identifiers. Private lead narratives and credentials do not belong in this export.

Timeline associations explicitly bind report/disclosure text, activity intervals and knowledge-event text to source IDs. Build validation rejects drift, ambiguity, unknown references or guessed public links for private notifications. An unresolved historical reference needs an explicit reason. The card shows a compact selection and an accessible Show all sources dialog; the dialog retains all sources and filters only this incident’s collection.
