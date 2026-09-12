#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from morning_brief.collectors import collect_all
from morning_brief.dashboard import write_comparison_page, write_dashboard
from morning_brief.emailer import send_email
from morning_brief.markdown_email import markdown_to_html
from morning_brief.openai_renderer import render_summary_with_openai
from morning_brief.prioritization import build_briefing, compact_for_ai
from morning_brief.render_fallback import render_fallback
from morning_brief.settings import load_config


def load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def main() -> int:
    parser = argparse.ArgumentParser(description="Collect and send a daily morning brief.")
    parser.add_argument("--config", default="config.json", help="Path to config JSON.")
    parser.add_argument("--send", action="store_true", help="Send email via SMTP.")
    parser.add_argument("--dry-run", action="store_true", help="Print and save output, but do not email.")
    parser.add_argument("--collect-only", action="store_true", help="Collect facts and skip OpenAI rendering.")
    parser.add_argument("--no-ai", action="store_true", help="Generate the brief and dashboard without an API call.")
    parser.add_argument(
        "--compare-ai",
        action="store_true",
        help="Compare the complete free brief with the API-enhanced version.",
    )
    parser.add_argument(
        "--compare-models",
        action="store_true",
        help=argparse.SUPPRESS,
    )
    parser.add_argument("--dotenv", default=".env", help="Path to .env file.")
    args = parser.parse_args()

    root = Path(__file__).resolve().parent
    load_dotenv(root / args.dotenv)

    config = load_config(root / args.config)
    timezone = ZoneInfo(os.environ.get("BRIEF_TIMEZONE", config.timezone))
    now = datetime.now(timezone)

    facts = collect_all(config, now)

    output_dir = Path(os.environ.get("BRIEF_OUTPUT_DIR", root / "out"))
    if not output_dir.is_absolute():
        output_dir = root / output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    date_slug = now.strftime("%Y-%m-%d")
    facts_path = output_dir / f"{date_slug}-facts.json"
    previous_facts = load_previous_facts(output_dir, facts_path)
    facts_path.write_text(json.dumps(facts, indent=2, sort_keys=True), encoding="utf-8")

    if args.collect_only:
        print(json.dumps(facts, indent=2, sort_keys=True))
        return 0

    briefing = build_briefing(
        facts,
        previous_facts=previous_facts,
        preferred_keywords=config.preferred_keywords,
        market_move_threshold=config.market_move_threshold,
    )
    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    model = os.environ.get("OPENAI_MODEL", "gpt-5.4-nano").strip()
    ai_mode = "off" if args.no_ai else os.environ.get("BRIEF_AI_MODE", "daily").strip().lower()
    ai_summary = None
    ai_usage: dict[str, object] = {}
    compact_facts = compact_for_ai(facts, briefing)
    if api_key and should_use_ai(ai_mode, now.weekday()):
        try:
            ai_summary, ai_usage = render_summary_with_openai(
                compact_facts, model=model, api_key=api_key
            )
        except RuntimeError as exc:
            print(f"AI summary unavailable; continuing with the local brief: {exc}")

    dashboard_base_url = os.environ.get("BRIEF_BASE_URL", "").strip().rstrip("/")
    dashboard_url = f"{dashboard_base_url}/" if dashboard_base_url else ""
    brief = render_fallback(
        facts,
        briefing=briefing,
        dashboard_url=dashboard_url,
        ai_summary=ai_summary,
    )

    brief_path = output_dir / f"{date_slug}-brief.txt"
    brief_path.write_text(brief, encoding="utf-8")
    dashboard_path = write_dashboard(output_dir, facts, briefing, ai_summary)

    if args.compare_ai or args.compare_models:
        outputs: dict[str, dict[str, object]] = {
            "No API · $0": {
                "text": render_fallback(facts, briefing=briefing, dashboard_url=dashboard_url),
                "format": "markdown",
            },
        }
        if not api_key:
            outputs["OpenAI models"] = {
                "error": "OPENAI_API_KEY is not configured on this machine. Run this command on the server to generate live model samples."
            }
        else:
            comparison_models = [
                value.strip()
                for value in os.environ.get(
                    "BRIEF_COMPARE_MODELS", model
                ).split(",")
                if value.strip()
            ]
            for comparison_model in comparison_models:
                if comparison_model == model and ai_summary:
                    outputs[f"With API · {comparison_model}"] = {
                        "text": render_fallback(
                            facts,
                            briefing=briefing,
                            dashboard_url=dashboard_url,
                            ai_summary=ai_summary,
                        ),
                        "format": "markdown",
                        "usage": ai_usage,
                    }
                    continue
                try:
                    text, usage = render_summary_with_openai(
                        compact_facts, comparison_model, api_key
                    )
                    outputs[f"With API · {comparison_model}"] = {
                        "text": render_fallback(
                            facts,
                            briefing=briefing,
                            dashboard_url=dashboard_url,
                            ai_summary=text,
                        ),
                        "format": "markdown",
                        "usage": usage,
                    }
                except RuntimeError as exc:
                    outputs[f"With API · {comparison_model}"] = {"error": str(exc)}
        comparison_path = write_comparison_page(output_dir, date_slug, outputs)
        print(f"\nModel comparison: {comparison_path}")

    print(brief)
    print(f"\nDashboard: {dashboard_path}")

    if args.send:
        subject = f"Morning Brief - {now.strftime('%A, %B %-d')}"
        send_email(subject=subject, body=brief, html_body=markdown_to_html(brief))
        print(f"\nSent email: {subject}")
    elif not args.dry_run:
        print("\nNot sent. Re-run with --send to email this brief.")

    return 0


def load_previous_facts(output_dir: Path, current_path: Path) -> dict[str, object] | None:
    candidates = sorted(output_dir.glob("????-??-??-facts.json"), reverse=True)
    for path in candidates:
        if path == current_path:
            continue
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
    return None


def should_use_ai(mode: str, weekday: int) -> bool:
    if mode == "daily":
        return True
    if mode == "weekly":
        target = int(os.environ.get("BRIEF_AI_WEEKDAY", "6"))
        return weekday == target
    return False


if __name__ == "__main__":
    raise SystemExit(main())
