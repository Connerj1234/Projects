#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from morning_brief.collectors import collect_all
from morning_brief.emailer import send_email
from morning_brief.openai_renderer import render_with_openai
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
    facts_path.write_text(json.dumps(facts, indent=2, sort_keys=True), encoding="utf-8")

    if args.collect_only:
        print(json.dumps(facts, indent=2, sort_keys=True))
        return 0

    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    model = os.environ.get("OPENAI_MODEL", "gpt-5.4-mini").strip()

    if api_key:
        brief = render_with_openai(facts, model=model, api_key=api_key)
    else:
        brief = render_fallback(facts)
        brief = (
            "OPENAI_API_KEY is not set, so this fallback brief was generated without AI.\n\n"
            + brief
        )

    brief_path = output_dir / f"{date_slug}-brief.txt"
    brief_path.write_text(brief, encoding="utf-8")

    print(brief)

    if args.send:
        subject = f"Morning Brief - {now.strftime('%A, %B %-d')}"
        send_email(subject=subject, body=brief)
        print(f"\nSent email: {subject}")
    elif not args.dry_run:
        print("\nNot sent. Re-run with --send to email this brief.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

