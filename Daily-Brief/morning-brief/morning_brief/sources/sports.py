from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from morning_brief.http_client import safe_get_json


def collect_sports(teams: list[dict[str, Any]], start_date: date, lookahead_days: int) -> list[dict[str, Any]]:
    games: list[dict[str, Any]] = []
    seen: set[str] = set()

    for team in teams:
        for offset in range(lookahead_days + 1):
            day = start_date + timedelta(days=offset)
            url = (
                "https://site.api.espn.com/apis/site/v2/sports/"
                f"{team['sport_path']}/scoreboard?dates={day.strftime('%Y%m%d')}"
            )
            data, error = safe_get_json(url)
            if error or not isinstance(data, dict):
                continue
            for event in data.get("events", []):
                if not event_matches_team(event, team.get("match_terms", [])):
                    continue
                game_id = str(event.get("id") or event.get("uid") or f"{team['name']}-{day}")
                if game_id in seen:
                    continue
                seen.add(game_id)
                games.append(normalize_event(event, team["name"], team["sport_path"]))

    return sorted(games, key=lambda item: item.get("starts_at") or "")


def event_matches_team(event: dict[str, Any], match_terms: list[str]) -> bool:
    haystack_parts = [event.get("name", ""), event.get("shortName", "")]
    for competition in event.get("competitions", []):
        for competitor in competition.get("competitors", []):
            team = competitor.get("team", {})
            haystack_parts.extend(
                [
                    team.get("displayName", ""),
                    team.get("shortDisplayName", ""),
                    team.get("name", ""),
                    team.get("abbreviation", ""),
                ]
            )
    haystack = " | ".join(str(part).lower() for part in haystack_parts)
    return any(term.lower() in haystack for term in match_terms)


def normalize_event(event: dict[str, Any], followed_team: str, sport_path: str) -> dict[str, Any]:
    competition = (event.get("competitions") or [{}])[0]
    competitors = competition.get("competitors", [])
    teams = []
    for competitor in competitors:
        team = competitor.get("team", {})
        teams.append(
            {
                "name": team.get("displayName"),
                "abbreviation": team.get("abbreviation"),
                "home_away": competitor.get("homeAway"),
                "score": competitor.get("score"),
            }
        )

    broadcasts = []
    for item in competition.get("broadcasts", []) or []:
        names = item.get("names")
        if names:
            broadcasts.extend(names)

    return {
        "followed_team": followed_team,
        "sport_path": sport_path,
        "event": event.get("name") or event.get("shortName"),
        "starts_at": event.get("date"),
        "status": event.get("status", {}).get("type", {}).get("description"),
        "venue": competition.get("venue", {}).get("fullName"),
        "teams": teams,
        "broadcasts": sorted(set(broadcasts)),
        "source_url": (event.get("links") or [{}])[0].get("href"),
        "source": "ESPN public scoreboard",
    }

