from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Iterable

import numpy as np
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer


analyzer = SentimentIntensityAnalyzer()

RISK_LEXICON = {
    "risk",
    "uncertain",
    "volatility",
    "headwind",
    "challenge",
    "inflation",
    "constraint",
    "slowdown",
    "pressure",
    "regulatory",
}

OPPORTUNITY_LEXICON = {
    "opportunity",
    "growth",
    "expansion",
    "improvement",
    "tailwind",
    "upside",
    "innovation",
    "efficiency",
    "momentum",
    "demand",
}


@dataclass
class TextFeatureRow:
    word_count: int
    risk_ratio: float
    opportunity_ratio: float
    sentiment_neg: float
    sentiment_pos: float
    sentiment_compound: float


def tokenize(text: str) -> list[str]:
    return re.findall(r"[A-Za-z']+", text.lower())


def ratio_in_lexicon(tokens: Iterable[str], lexicon: set[str]) -> float:
    token_list = list(tokens)
    if not token_list:
        return 0.0
    count = sum(1 for t in token_list if t in lexicon)
    return count / len(token_list)


def extract_text_features(text: str) -> TextFeatureRow:
    tokens = tokenize(text)
    scores = analyzer.polarity_scores(text)
    return TextFeatureRow(
        word_count=len(tokens),
        risk_ratio=ratio_in_lexicon(tokens, RISK_LEXICON),
        opportunity_ratio=ratio_in_lexicon(tokens, OPPORTUNITY_LEXICON),
        sentiment_neg=scores["neg"],
        sentiment_pos=scores["pos"],
        sentiment_compound=scores["compound"],
    )


def chunk_text(text: str, words_per_chunk: int = 120, overlap: int = 30) -> list[str]:
    tokens = tokenize(text)
    if not tokens:
        return []
    chunks = []
    step = max(1, words_per_chunk - overlap)
    for i in range(0, len(tokens), step):
        piece = tokens[i : i + words_per_chunk]
        if len(piece) < 25:
            continue
        chunks.append(" ".join(piece))
    return chunks


def safe_log1p(x: float) -> float:
    return float(np.log1p(max(0.0, x)))
