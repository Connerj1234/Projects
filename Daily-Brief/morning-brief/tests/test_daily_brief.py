from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from morning_brief.dashboard import (
    render_dashboard,
    render_sports_groups,
    write_comparison_page,
    write_dashboard,
)
from morning_brief.http_client import USER_AGENT, headers_for_url
from morning_brief.markdown_email import markdown_to_html
from morning_brief.prioritization import build_briefing, compact_for_ai
from morning_brief.render_fallback import render_fallback
from morning_brief.time_format import eastern_date, format_eastern


def sample_facts() -> dict:
    return {
        "date": "2026-09-11",
        "generated_at": "2026-09-11T07:30:00-04:00",
        "timezone": "America/New_York",
        "weather": [
            {
                "location": "Atlanta",
                "forecast_periods": [
                    {
                        "name": "Today",
                        "temperature": 81,
                        "temperature_unit": "F",
                        "short_forecast": "Partly sunny",
                    }
                ],
                "alerts": [],
            }
        ],
        "sports": {
            "followed_teams": [
                {
                    "followed_team": "Atlanta Braves",
                    "event": "Braves at Nationals",
                    "starts_at": "2026-09-11T23:05:00Z",
                    "source_url": "https://www.espn.com/mlb/game/example",
                }
            ],
            "major_events": [],
        },
        "market_watchlist": [
            {
                "symbol": "NVDA",
                "name": "Nvidia",
                "price": 192.15,
                "currency": "USD",
                "change_percent": 2.8,
            }
        ],
        "traffic_commute": [
            {
                "title": "Lane closures scheduled on I-20 eastbound",
                "summary": "Two lanes are scheduled to close after the morning commute.",
                "source": "Atlanta Traffic",
                "link": "https://example.com/traffic",
                "published_at": "2026-09-11T06:10:00-04:00",
            }
        ],
        "local_news": [
            {
                "title": "Atlanta expands weekend rail service",
                "summary": "More trains will run during major events this fall.",
                "source": "Local News",
                "link": "https://example.com/local",
                "published_at": "2026-09-11T05:00:00-04:00",
            }
        ],
        "market_news": [],
        "tech_ai": [],
        "general_news": [],
        "holidays": [],
    }


class DailyBriefTests(unittest.TestCase):
    def test_espn_uses_default_transport_user_agent(self) -> None:
        self.assertEqual(
            headers_for_url("https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard"),
            {},
        )
        self.assertEqual(
            headers_for_url("https://api.weather.gov/points/33,-84")["User-Agent"],
            USER_AGENT,
        )

    def test_priority_prefers_today_game_over_market_move(self) -> None:
        facts = sample_facts()
        briefing = build_briefing(facts, market_move_threshold=2.0)
        self.assertEqual(briefing["one_thing"]["kind"], "sports")
        self.assertEqual(
            briefing["one_thing"]["link"],
            "https://www.espn.com/mlb/game/example",
        )

    def test_dates_are_presented_in_eastern_time(self) -> None:
        self.assertEqual(eastern_date("2026-09-12T01:15:00Z"), "2026-09-11")
        self.assertEqual(
            format_eastern("2026-09-12T23:15:00Z"),
            "Sep 12, 2026 · 7:15 PM ET",
        )

    def test_sports_are_grouped_and_limited_to_three_per_sport(self) -> None:
        games = [
            {
                "sport_path": "baseball/mlb",
                "followed_team": "Atlanta Braves",
                "event": f"Baseball game {number}",
                "starts_at": f"2026-09-{number + 10:02d}T23:00:00Z",
            }
            for number in range(1, 6)
        ]
        games.append(
            {
                "sport_path": "football/nfl",
                "followed_team": "Atlanta Falcons",
                "event": "Football game",
                "starts_at": "2026-09-13T17:00:00Z",
            }
        )
        result = render_sports_groups(games)
        self.assertIn("Baseball", result)
        self.assertIn("Football", result)
        self.assertIn("Next 3 of 5", result)
        self.assertEqual(result.count("Baseball game"), 3)

    def test_filter_row_hides_native_scrollbar(self) -> None:
        facts = sample_facts()
        page = render_dashboard(facts, build_briefing(facts), [facts["date"]], None)
        self.assertIn("scrollbar-width:none", page)
        self.assertIn(".filters::-webkit-scrollbar{display:none}", page)

    def test_previous_story_is_deprioritized(self) -> None:
        facts = sample_facts()
        previous = {"local_news": [facts["local_news"][0]]}
        briefing = build_briefing(facts, previous_facts=previous)
        self.assertTrue(briefing["news"]["local_news"][0]["repeated"])
        self.assertEqual(briefing["repeated_count"], 1)

    def test_ai_input_is_bounded_and_omits_links(self) -> None:
        facts = sample_facts()
        briefing = build_briefing(facts)
        compact = compact_for_ai(facts, briefing)
        self.assertLessEqual(len(compact["new_headlines"]), 10)
        self.assertNotIn("link", compact["new_headlines"][0])

    def test_dashboard_escapes_content_and_keeps_safe_links(self) -> None:
        facts = sample_facts()
        facts["local_news"][0]["title"] = "<script>alert(1)</script>"
        briefing = build_briefing(facts)
        page = render_dashboard(facts, briefing, [facts["date"]], None)
        self.assertNotIn("<script>alert(1)</script>", page)
        self.assertIn("https://example.com/local", page)
        self.assertNotIn("The useful parts first", page)
        self.assertIn('<details class="news-group"', page)
        self.assertIn("Sep 11, 2026 · 7:05 PM ET", page)

    def test_markdown_email_renders_links(self) -> None:
        result = markdown_to_html("[Dashboard](https://example.com/brief)")
        self.assertIn('href="https://example.com/brief"', result)

    def test_comparison_page_writes_model_columns(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = write_comparison_page(
                Path(directory),
                "2026-09-11",
                {
                    "gpt-5.4-nano": {"text": "Short note."},
                    "gpt-5.4-mini": {"text": "More nuanced note."},
                },
            )
            text = path.read_text(encoding="utf-8")
            self.assertIn("gpt-5.4-nano", text)
            self.assertIn("gpt-5.4-mini", text)

    def test_dashboard_writes_netlify_privacy_files(self) -> None:
        facts = sample_facts()
        briefing = build_briefing(facts)
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            write_dashboard(output, facts, briefing)
            self.assertIn("Disallow: /", (output / "robots.txt").read_text())
            self.assertIn("X-Robots-Tag", (output / "_headers").read_text())


if __name__ == "__main__":
    unittest.main()
