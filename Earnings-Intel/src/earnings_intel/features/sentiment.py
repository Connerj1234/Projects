from __future__ import annotations

import re

POSITIVE_WORDS = {
    "strong",
    "growth",
    "improve",
    "improved",
    "improving",
    "beat",
    "beats",
    "outperform",
    "opportunity",
    "optimistic",
    "momentum",
    "resilient",
    "success",
}

NEGATIVE_WORDS = {
    "weak",
    "decline",
    "declines",
    "down",
    "downturn",
    "miss",
    "missed",
    "pressure",
    "uncertain",
    "challenging",
    "loss",
    "headwind",
}


def _tokens(text: str) -> list[str]:
    return re.findall(r"\b[a-z]+\b", (text or "").lower())


def sentiment_features(text: str) -> dict[str, float]:
    toks = _tokens(text)
    n = len(toks)
    if n == 0:
        return {
            "positive_count": 0.0,
            "negative_count": 0.0,
            "positive_ratio": 0.0,
            "negative_ratio": 0.0,
            "sentiment_net": 0.0,
        }
    pos = sum(1 for t in toks if t in POSITIVE_WORDS)
    neg = sum(1 for t in toks if t in NEGATIVE_WORDS)
    return {
        "positive_count": float(pos),
        "negative_count": float(neg),
        "positive_ratio": float(pos / n),
        "negative_ratio": float(neg / n),
        "sentiment_net": float((pos - neg) / n),
    }
