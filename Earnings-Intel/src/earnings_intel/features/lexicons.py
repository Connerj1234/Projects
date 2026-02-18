from __future__ import annotations

import re

UNCERTAINTY_WORDS = {
    "uncertain",
    "uncertainty",
    "volatile",
    "risk",
    "risks",
    "challenging",
    "challenge",
    "headwind",
    "headwinds",
    "pressure",
    "pressures",
    "unpredictable",
    "downturn",
}

RISK_WORDS = {
    "risk",
    "risks",
    "exposure",
    "liability",
    "threat",
    "threats",
    "decline",
    "declines",
    "decrease",
    "decreases",
    "contraction",
    "loss",
    "losses",
}


def _tokens(text: str) -> list[str]:
    return re.findall(r"\b[a-z]+\b", (text or "").lower())


def lexicon_features(text: str) -> dict[str, float]:
    toks = _tokens(text)
    n = len(toks)
    if n == 0:
        return {
            "uncertainty_count": 0.0,
            "uncertainty_ratio": 0.0,
            "risk_count": 0.0,
            "risk_ratio": 0.0,
        }
    uncertainty = sum(1 for t in toks if t in UNCERTAINTY_WORDS)
    risk = sum(1 for t in toks if t in RISK_WORDS)
    return {
        "uncertainty_count": float(uncertainty),
        "uncertainty_ratio": float(uncertainty / n),
        "risk_count": float(risk),
        "risk_ratio": float(risk / n),
    }
