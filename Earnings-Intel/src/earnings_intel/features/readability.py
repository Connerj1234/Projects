from __future__ import annotations

import re


def sentence_count(text: str) -> int:
    if not text:
        return 0
    parts = [p for p in re.split(r"[.!?]+", text) if p.strip()]
    return len(parts)


def token_count(text: str) -> int:
    if not text:
        return 0
    return len(re.findall(r"\b\w+\b", text))


def readability_features(text: str) -> dict[str, float]:
    tokens = re.findall(r"\b\w+\b", text.lower()) if text else []
    n_tokens = len(tokens)
    n_sent = sentence_count(text)
    n_sent_safe = max(n_sent, 1)
    avg_sent_len = n_tokens / n_sent_safe
    avg_token_len = (sum(len(t) for t in tokens) / max(n_tokens, 1)) if tokens else 0.0
    # Fast syllable proxy from contiguous vowel groups.
    vowel_groups = len(re.findall(r"[aeiouyAEIOUY]+", text or ""))
    syllables_per_token = vowel_groups / max(n_tokens, 1)
    flesch_proxy = 206.835 - 1.015 * avg_sent_len - 84.6 * syllables_per_token

    return {
        "sent_count": float(n_sent),
        "token_count": float(n_tokens),
        "avg_sentence_len": float(avg_sent_len),
        "avg_token_len": float(avg_token_len),
        "flesch_proxy": float(flesch_proxy),
    }
