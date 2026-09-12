from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from morning_brief.dashboard import (
    render_dashboard,
    render_sports_groups,
    write_comparison_page,
    write_dashboard,
)
from morning_brief.http_client import USER_AGENT, headers_for_url
from morning_brief.markdown_email import markdown_to_html
from morning_brief.prioritization import NEWS_SECTIONS, build_briefing, compact_for_ai
from morning_brief.render_fallback import render_fallback
from morning_brief.sources.markets import collect_market_watchlist
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
                "history_6m": [
                    {"timestamp": 1, "close": 150.0},
                    {"timestamp": 2, "close": 192.15},
                ],
                "history_change_percent": 28.1,
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

    def test_priority_prefers_current_commute_disruption_over_routine_game(self) -> None:
        facts = sample_facts()
        briefing = build_briefing(facts, market_move_threshold=2.0)
        self.assertEqual(briefing["one_thing"]["kind"], "traffic")
        self.assertEqual(
            briefing["one_thing"]["link"],
            "https://example.com/traffic",
        )

    def test_new_items_are_balanced_across_news_sections(self) -> None:
        facts = sample_facts()
        for section in ("market_news", "tech_ai", "general_news"):
            facts[section] = [
                {
                    "title": f"New {section} item",
                    "summary": "A useful update.",
                    "source": "Example",
                    "published_at": "2026-09-11T06:00:00-04:00",
                }
            ]
        facts["traffic_commute"].append(
            {
                "title": "Second traffic update",
                "summary": "Another commute item.",
                "source": "Example",
                "published_at": "2026-09-11T06:05:00-04:00",
            }
        )
        briefing = build_briefing(facts)
        first_five_sections = {item["section"] for item in briefing["new_items"][:5]}
        self.assertEqual(first_five_sections, set(NEWS_SECTIONS))

    def test_traffic_ranking_favors_commute_impact_and_trims_source_suffix(self) -> None:
        facts = sample_facts()
        facts["traffic_commute"] = [
            {
                "title": "Unrelated discovery during traffic stop - Example News",
                "summary": "A routine police stop produced an unusual discovery.",
                "source": "Example",
                "published_at": "2026-09-11T07:00:00-04:00",
            },
            {
                "title": "Airport delays continue - CBS News",
                "summary": "Flights are delayed this morning.",
                "source": "Example",
                "link": "https://example.com/airport",
                "published_at": "2026-09-11T06:30:00-04:00",
            },
        ]
        briefing = build_briefing(facts)
        self.assertEqual(briefing["news"]["traffic_commute"][0]["link"], "https://example.com/airport")
        self.assertEqual(briefing["one_thing"]["title"], "Airport delays continue")

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

    def test_dashboard_uses_compact_header_and_friendlier_labels(self) -> None:
        facts = sample_facts()
        page = render_dashboard(facts, build_briefing(facts), [facts["date"]], None)
        self.assertIn('class="hero-meta"', page)
        self.assertIn("<h1>Good morning.</h1>", page)
        self.assertIn("YOUR DAILY BRIEF", page)
        self.assertNotIn("YOUR DAILY BRIEF ·", page)
        self.assertIn(">26-09-11</option>", page)
        self.assertIn("Today’s highlights", page)
        self.assertNotIn("Needs attention", page)
        self.assertNotIn("stories deprioritized", page)
        self.assertNotIn("Save story", page)
        self.assertNotIn("dailyBriefSaved", page)
        self.assertNotIn('<span class="badge', page)

    def test_market_card_includes_accessible_six_month_sparkline(self) -> None:
        facts = sample_facts()
        page = render_dashboard(facts, build_briefing(facts), [facts["date"]], None)
        self.assertIn('class="sparkline up"', page)
        self.assertIn("NVDA six-month trend, +28.1 percent", page)
        self.assertIn("6M +28.1%", page)
        self.assertIn("width:calc(100% + 12px)", page)

    @patch("morning_brief.sources.markets.safe_get_json")
    def test_market_collection_requests_six_month_history(self, get_json) -> None:
        get_json.return_value = (
            {
                "chart": {
                    "result": [
                        {
                            "meta": {
                                "regularMarketPrice": 120.0,
                                "previousClose": 118.0,
                                "currency": "USD",
                            },
                            "timestamp": [1, 2, 3],
                            "indicators": {"quote": [{"close": [100.0, None, 120.0]}]},
                        }
                    ]
                }
            },
            None,
        )
        result = collect_market_watchlist([{"symbol": "TEST", "name": "Test"}])[0]
        self.assertIn("range=6mo&interval=1d", get_json.call_args.args[0])
        self.assertEqual(len(result["history_6m"]), 2)
        self.assertAlmostEqual(result["history_change_percent"], 20.0)
        self.assertAlmostEqual(result["change_percent"], (2 / 118) * 100)

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

    def test_news_headlines_are_visibly_identified_as_external_links(self) -> None:
        facts = sample_facts()
        page = render_dashboard(facts, build_briefing(facts), [facts["date"]], None)
        self.assertIn("Underlined headlines open the original story", page)
        self.assertIn('class="story-link" href="https://example.com/local"', page)
        self.assertIn('class="link-arrow" aria-hidden="true">↗</span>', page)
        self.assertIn("opens original story in a new tab", page)
        self.assertIn(".story-link{text-decoration:underline", page)

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
