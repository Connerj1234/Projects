from __future__ import annotations

import html
import re
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from typing import Any

from morning_brief.http_client import safe_get_text


TAG_RE = re.compile(r"<[^>]+>")


def collect_rss_group(urls: list[str], per_feed: int, max_items: int) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    seen_links: set[str] = set()

    for url in urls:
        text, error = safe_get_text(url)
        if error or not text:
            items.append({"source_url": url, "error": error or "Empty RSS response"})
            continue
        for item in parse_rss(text, url)[:per_feed]:
            link = item.get("link") or item.get("title", "")
            if link in seen_links:
                continue
            seen_links.add(link)
            items.append(item)
            if len(items) >= max_items:
                return items

    return items[:max_items]


def parse_rss(text: str, source_url: str) -> list[dict[str, Any]]:
    root = ET.fromstring(text)
    channel = root.find("channel")
    source_name = text_value(channel, "title") if channel is not None else source_url
    raw_items = root.findall("./channel/item")
    parsed = []
    for item in raw_items:
        parsed.append(
            {
                "title": clean(text_value(item, "title")),
                "link": text_value(item, "link"),
                "published_at": normalize_date(text_value(item, "pubDate")),
                "summary": clean(text_value(item, "description")),
                "source": clean(source_name),
                "source_feed": source_url,
            }
        )
    return parsed


def text_value(node: ET.Element | None, child_name: str) -> str:
    if node is None:
        return ""
    child = node.find(child_name)
    if child is None or child.text is None:
        return ""
    return child.text.strip()


def clean(value: str) -> str:
    value = html.unescape(value or "")
    value = TAG_RE.sub("", value)
    return " ".join(value.split())


def normalize_date(value: str) -> str:
    if not value:
        return ""
    try:
        return parsedate_to_datetime(value).isoformat()
    except Exception:
        return value

