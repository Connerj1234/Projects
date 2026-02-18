from __future__ import annotations

import re


FORWARD_LOOKING_PATTERNS = [
    r"\bforward[- ]looking\b",
    r"\bwe expect\b",
    r"\bwe believe\b",
    r"\boutlook\b",
    r"\bguidance\b",
]


def token_count(text: str) -> int:
    if not text:
        return 0
    return len(re.findall(r"\b\w+\b", text))


def has_forward_looking(text: str) -> bool:
    if not text:
        return False
    s = text.lower()
    return any(re.search(p, s) for p in FORWARD_LOOKING_PATTERNS)
