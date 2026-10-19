from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from morning_brief.dashboard import daily_weather_rows, render_dashboard, write_archive, write_dashboard
from morning_brief.prioritization import build_actions, choose_one_thing
from morning_brief.sources.weather import collect_weather


class WeatherBriefingTests(unittest.TestCase):
    def facts(self, second_alert=None):
        alert = {"event": "Air Quality Alert", "headline": "Bulletin issued by NWS", "effective": "2026-10-14T14:00:00-04:00", "expires": "2026-10-15T18:00:00-04:00"}
        return {"generated_at": "2026-10-15T07:30:00-04:00", "weather": [
            {"location": "Conyers", "latitude": 33.6, "longitude": -84.0, "alerts": [alert]},
            {"location": "Atlanta", "latitude": 33.7, "longitude": -84.4, "alerts": [second_alert or dict(alert)]},
        ]}

    def test_shared_bulletin_merges_locations_and_preserves_source(self):
        actions = build_actions(self.facts(), "2026-10-15", 2)
        self.assertEqual(len(actions), 1)
        self.assertEqual(actions[0]["title"], "Air Quality Alert for Conyers & Atlanta")
        self.assertIn("forecast.weather.gov/MapClick.php", actions[0]["link"])
        self.assertTrue(actions[0]["source_is_current"])

    def test_distinct_bulletins_stay_separate(self):
        facts = self.facts()
        facts["weather"][0]["alerts"][0]["id"] = "bulletin-a"
        facts["weather"][1]["alerts"][0]["id"] = "bulletin-b"
        self.assertEqual(len(build_actions(facts, "2026-10-15", 2)), 2)

    def test_errors_and_expired_alerts_are_not_promoted(self):
        facts = self.facts()
        facts["generated_at"] = "2026-10-16T07:30:00-04:00"
        facts["weather"][0]["alerts"].append({"error": "timeout"})
        self.assertEqual(build_actions(facts, "2026-10-16", 2), [])

    def test_lead_requires_source_and_uses_highest_priority(self):
        unlinked = {"title": "Unlinked", "score": 100}
        linked = {"title": "Linked", "score": 80, "link": "https://example.com/story"}
        self.assertEqual(choose_one_thing([unlinked], [linked])["title"], "Linked")
        self.assertNotEqual(choose_one_thing([unlinked], [])["title"], "Unlinked")
        self.assertNotEqual(choose_one_thing([{**unlinked, "link": "javascript:alert(1)"}], [])["title"], "Unlinked")

    def test_exact_source_and_saved_bulletin_reach_main_card(self):
        facts = self.facts()
        for location in facts["weather"]:
            location["alerts"][0].update(source_url="https://api.weather.gov/alerts/exact", description="Smoke < haze", instruction="Avoid outdoor exertion")
        actions = build_actions(facts, "2026-10-15", 2)
        page = render_dashboard(facts, {"one_thing": choose_one_thing(actions, []), "actions": actions}, [], None)
        self.assertIn('href="https://api.weather.gov/alerts/exact"', page)
        self.assertIn("Read saved bulletin", page)
        self.assertIn("Smoke &lt; haze", page)
        self.assertIn("Avoid outdoor exertion", page)

    def test_daily_rows_pair_same_date_and_preserve_missing_values(self):
        periods = [
            {"name": "Tonight", "start_time": "2026-10-15T18:00:00-04:00", "is_daytime": False, "temperature": 42},
            {"name": "Friday", "start_time": "2026-10-16T06:00:00-04:00", "is_daytime": True, "temperature": 70, "short_forecast": "Sunny < skies", "precipitation_probability": 0},
            {"name": "Friday Night", "start_time": "2026-10-16T18:00:00-04:00", "is_daytime": False, "temperature": 45},
        ]
        rows = daily_weather_rows(periods)
        self.assertEqual(rows.count('class="daily-row"'), 2)
        self.assertIn('aria-label="High —"', rows)
        self.assertIn('aria-label="Low 45°"', rows)
        self.assertIn("Rain 0%", rows)
        self.assertIn("Sunny &lt; skies", rows)
        self.assertEqual(rows.count('style="left:'), 1)

    def test_archive_omits_explanatory_labels(self):
        with tempfile.TemporaryDirectory() as folder:
            write_archive(Path(folder), ["2026-10-15"])
            page = (Path(folder) / "archive.html").read_text()
        self.assertNotIn("Browse the archive", page)
        self.assertNotIn("Highlighted dates", page)

    @patch("morning_brief.sources.weather.safe_get_json")
    def test_collector_retains_week_and_bulletin(self, fetch):
        fetch.side_effect = [
            ({"properties": {"forecast": "https://api.weather.gov/forecast"}}, None),
            ({"properties": {"periods": [{"name": str(i)} for i in range(14)]}}, None),
            ({"features": [{"id": "https://api.weather.gov/alerts/exact", "properties": {"description": "Smoke", "instruction": "Stay inside"}}]}, None),
        ]
        result = collect_weather([{"name": "Atlanta", "latitude": 33.7, "longitude": -84.4}])[0]
        self.assertEqual(len(result["forecast_periods"]), 14)
        self.assertEqual(result["alerts"][0]["description"], "Smoke")
        self.assertEqual(result["alerts"][0]["instruction"], "Stay inside")


class ArchiveNavigationTests(unittest.TestCase):
    def test_publishing_updates_old_navigation_without_changing_content(self):
        original = '<html><head><style>body{color:green}</style></head><body><header class="hero"><select><option>old date</option></select></header><main><p>Saved original report</p></main></body></html>'
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder)
            old = output / "2026-10-12.html"
            old.write_text(original)
            write_dashboard(output, {"date": "2026-10-19"}, {})
            updated = old.read_text()
            self.assertNotIn("<select", updated)
            self.assertIn('href="archive.html"', updated)
            self.assertIn('href="index.html">← Latest brief', updated)
            self.assertIn("Saved original report", updated)
            self.assertIn('data-brief-navigation', updated)
            self.assertIn("Oct 12, 2026", updated)
            write_dashboard(output, {"date": "2026-10-19"}, {})
            self.assertEqual(old.read_text(), updated)

    def test_source_links_use_consistent_details_label(self):
        from morning_brief.prioritization import build_briefing
        facts = {"date": "2026-10-19", "weather": [{"latitude": 33, "longitude": -84, "alerts": [{"event": "Weather alert", "headline": "Alert from NWS"}]}]}
        page = render_dashboard(facts, build_briefing(facts), [], None)
        self.assertNotIn("bulletin URL was not saved", page)
        self.assertNotIn("NWS local forecast &amp; active alerts", page)
        self.assertIn('>Details</a>', page)
