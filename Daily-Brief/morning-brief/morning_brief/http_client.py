from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Any


USER_AGENT = "morning-brief/0.1 (personal use; contact: local)"


def get_json(url: str, timeout: int = 30) -> dict[str, Any] | list[Any]:
    request = urllib.request.Request(url, headers=headers_for_url(url))
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def get_text(url: str, timeout: int = 30) -> str:
    request = urllib.request.Request(url, headers=headers_for_url(url))
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read().decode("utf-8", errors="replace")


def safe_get_json(url: str, timeout: int = 30) -> tuple[dict[str, Any] | list[Any] | None, str | None]:
    try:
        return get_json(url, timeout=timeout), None
    except urllib.error.HTTPError as exc:
        return None, f"HTTP {exc.code} {exc.reason}"
    except Exception as exc:
        return None, str(exc)


def safe_get_text(url: str, timeout: int = 30) -> tuple[str | None, str | None]:
    try:
        return get_text(url, timeout=timeout), None
    except urllib.error.HTTPError as exc:
        return None, f"HTTP {exc.code} {exc.reason}"
    except Exception as exc:
        return None, str(exc)


def headers_for_url(url: str) -> dict[str, str]:
    # ESPN's undocumented scoreboard edge rejects explicit/spoofed user agents,
    # while weather.gov expects clients to identify themselves.
    if urllib.parse.urlparse(url).hostname == "site.api.espn.com":
        return {}
    return {"User-Agent": USER_AGENT}

