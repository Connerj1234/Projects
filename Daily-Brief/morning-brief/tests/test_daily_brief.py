from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from morning_brief.dashboard import render_dashboard, write_comparison_page, write_dashboard
from morning_brief.http_client import USER_AGENT, headers_for_url
from morning_brief.markdown_email import markdown_to_html
from morning_brief.prioritization import build_briefing, compact_for_ai
from morning_brief.render_fallback import render_fallback


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
                    "starts_at": "2026-09-11T19:05:00-04:00",
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
