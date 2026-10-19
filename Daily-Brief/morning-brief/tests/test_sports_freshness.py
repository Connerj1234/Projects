from datetime import datetime
import unittest
from unittest.mock import patch

from morning_brief.sources.sports import is_upcoming_event, collect_sports, collect_major_events


class SportsFreshnessTests(unittest.TestCase):
    reference = datetime.fromisoformat("2026-10-19T07:30:00-04:00")

    def test_upcoming_filters_use_generation_time(self):
        future = {"starts_at": "2026-10-19T20:00:00-04:00", "status": "Scheduled"}
        self.assertTrue(is_upcoming_event(future, self.reference))
        self.assertFalse(is_upcoming_event({**future, "starts_at": "2026-10-19T06:00:00-04:00"}, self.reference))
        for extra in [{"completed": True}, {"status_state": "post"}, {"status_state": "in"}, {"status": "Final/OT"}, {"status": "Postponed"}]:
            self.assertFalse(is_upcoming_event({**future, **extra}, self.reference))
        # A report snapshot uses its own reference time, even when read later.
        self.assertTrue(is_upcoming_event(future, datetime.fromisoformat("2026-10-18T07:30:00-04:00")))
        self.assertFalse(is_upcoming_event(future, datetime.fromisoformat("2026-10-20T07:30:00-04:00")))

    @patch("morning_brief.sources.sports.safe_get_json")
    def test_both_collectors_exclude_finished_and_earlier_games(self, fetch):
        def event(number, starts, complete=False):
            return {"id": str(number), "name": "Atlanta match " + str(number), "date": starts,
                    "status": {"type": {"completed": complete, "state": "post" if complete else "pre", "description": "Final" if complete else "Scheduled"}}}
        fetch.return_value = ({"events": [event(1, "2026-10-19T06:00:00-04:00"), event(2, "2026-10-19T20:00:00-04:00", True), event(3, "2026-10-19T20:00:00-04:00")]}, None)
        team = {"name": "Atlanta United", "sport_path": "soccer/usa.1", "match_terms": ["Atlanta"]}
        followed = collect_sports([team], self.reference.date(), 0, as_of=self.reference)
        major = collect_major_events([team], self.reference.date(), 0, as_of=self.reference)
        self.assertEqual([item["event_id"] for item in followed], ["3"])
        self.assertEqual([item["event_id"] for item in major], ["3"])
