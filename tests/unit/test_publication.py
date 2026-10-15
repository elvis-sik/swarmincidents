import copy
import unittest
import publication as p


class Publication(unittest.TestCase):
    def setUp(self):
        self.before = dict(updated="2026-10-14", version="1", labs={}, affected=[], responses=[], incidents=[
            dict(id="one", title="An incident", summary="Old account", sources=[["Report", "Publisher", "https://example.org/report"]])])
        self.after = copy.deepcopy(self.before)
        self.after["incidents"][0]["summary"] = "New evidence changes the account"
        self.after["updated"] = "2026-10-15"
        self.journal = dict(schema_version=1, baseline=dict(catalog_sha256=p.digest(self.before), updates=[]), publications=[])
        self.update = dict(id="one-development", incident="one", type="Update", title="New evidence", summary="The account changed.",
            source="https://example.org/report", publisher="Publisher", freshness="recent", freshness_reason="Substantive evidence released today",
            resources=[dict(url="https://example.org/report", publisher="Publisher", reason="The original evidence for this development")])
        self.plan = dict(id="release-one", published="2026-10-15T13:00:00-07:00", approval="curator-reviewed", updates=[self.update],
                         decisions=[dict(path=["incidents", "one"], update_ids=["one-development"])])

    def prepare(self):
        return p.append(self.before, self.after, self.journal, self.plan)

    def test_substantive_change_produces_one_shared_announcement_and_exact_diff(self):
        journal = self.prepare()
        result = p.project(journal, self.after)["updates"]
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["changes"][0]["before"]["summary"], "Old account")
        self.assertEqual(result[0]["changes"][0]["after"]["summary"], self.after["incidents"][0]["summary"])
        p.check_transition(self.before, self.after, self.journal, journal, {"updates": []})

    def test_missing_announcement_disposition_blocks(self):
        self.plan["decisions"] = []
        with self.assertRaisesRegex(ValueError, "Missing publication decision"):
            self.prepare()

    def test_routine_edit_is_recorded_without_notification(self):
        self.plan["updates"] = []
        self.plan["decisions"] = [dict(path=["incidents", "one"], routine_reason="Typo correction; no factual change")]
        self.assertEqual(p.project(self.prepare(), self.after)["updates"], [])

    def test_new_incident_cannot_be_marked_routine(self):
        self.after["incidents"].append(dict(id="two", title="New incident", sources=[]))
        self.plan["decisions"].append(dict(path=["incidents", "two"], routine_reason="Skip announcement"))
        with self.assertRaisesRegex(ValueError, "new incident requires"):
            self.prepare()

    def test_direct_catalog_edit_or_omitted_diff_blocks(self):
        journal = self.prepare()
        self.after["incidents"][0]["title"] = "Unrecorded edit"
        with self.assertRaisesRegex(ValueError, "without a matching publication"):
            p.project(journal, self.after)
        journal["publications"][0]["after_sha256"] = p.digest(self.after)
        with self.assertRaisesRegex(ValueError, "after snapshot"):
            p.project(journal, self.after)

    def test_history_cannot_be_rewritten_or_rebaselined(self):
        old = self.prepare()
        edited = copy.deepcopy(old)
        edited["publications"][0]["updates"][0]["summary"] = "Rewritten history"
        with self.assertRaisesRegex(ValueError, "append-only"):
            p.check_transition(self.after, self.after, old, edited, {})
        edited = copy.deepcopy(old)
        edited["baseline"]["catalog_sha256"] = p.digest(self.after)
        with self.assertRaisesRegex(ValueError, "immutable"):
            p.check_transition(self.after, self.after, old, edited, {})

    def test_source_selection_requires_reviewable_evidence(self):
        self.update["resources"][0]["reason"] = ""
        with self.assertRaisesRegex(ValueError, "rationale"):
            self.prepare()
        self.update["resources"][0]["reason"] = "Original report"
        self.update["source"] = self.update["resources"][0]["url"] = "https://unreviewed.example/new"
        with self.assertRaisesRegex(ValueError, "not on the incident"):
            self.prepare()

    def test_two_complementary_sources_and_stable_ids(self):
        self.after["incidents"][0]["sources"].append(["Independent report", "Other", "https://example.org/other"])
        self.update["resources"].append(dict(url="https://example.org/other", publisher="Other", reason="Independent verification"))
        old = self.prepare()
        newer = copy.deepcopy(self.after)
        newer["incidents"][0]["summary"] += " Another development."
        plan = copy.deepcopy(self.plan)
        plan.update(id="release-two", published="2026-10-16T13:00:00-07:00")
        with self.assertRaisesRegex(ValueError, "permanent and unique"):
            p.append(self.after, newer, old, plan)

    def test_migration_preserves_released_feed_entries(self):
        p.check_transition(self.before, self.before, None, self.journal, {"updates": []})
        with self.assertRaisesRegex(ValueError, "preserve every"):
            p.check_transition(self.before, self.before, None, self.journal, {"updates": [dict(id="missing")]})

    def test_unrelated_announcement_and_no_approval_block(self):
        self.plan["approval"] = "draft"
        with self.assertRaisesRegex(ValueError, "curator-reviewed"):
            self.prepare()
        self.plan["approval"] = "curator-reviewed"
        self.update["incident"] = "missing"
        with self.assertRaisesRegex(ValueError, "for that incident"):
            self.prepare()

    def test_drafting_packet_preserves_all_source_options_and_stays_draft(self):
        self.after["incidents"][0]["sources"].append(["Second", "Other", "https://example.org/second"])
        packet = p.drafting_packet(self.before, self.after)
        self.assertEqual(len(packet["source_candidates"][0]["sources"]), 2)
        self.assertEqual(packet["plan_shape"]["approval"], "draft")

    def test_new_incident_cannot_borrow_another_incidents_announcement(self):
        self.after["incidents"].append(dict(id="two", title="Another incident", sources=[]))
        self.plan["decisions"].append(dict(path=["incidents", "two"], update_ids=["one-development"]))
        with self.assertRaisesRegex(ValueError, "for that incident"):
            self.prepare()


if __name__ == "__main__":
    unittest.main()
