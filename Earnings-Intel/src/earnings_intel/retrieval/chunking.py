from __future__ import annotations

import hashlib
import re

import pandas as pd


def _tokenize(text: str) -> list[str]:
    return re.findall(r"\b\w+\b", (text or "").lower())


def _find_qa_token_index(text: str, tokens: list[str]) -> int | None:
    low = (text or "").lower()
    marker_pos = low.find("question-and-answer")
    if marker_pos < 0:
        marker_pos = low.find("q&a")
    if marker_pos < 0:
        return None
    prefix = low[:marker_pos]
    return len(_tokenize(prefix))


def chunk_transcript(
    doc_id: str,
    ticker: str,
    event_date: pd.Timestamp,
    text: str,
    chunk_size_tokens: int = 300,
    overlap_tokens: int = 50,
) -> list[dict[str, object]]:
    tokens = _tokenize(text)
    if not tokens:
        return []
    step = max(1, chunk_size_tokens - overlap_tokens)
    qa_idx = _find_qa_token_index(text, tokens)

    chunks: list[dict[str, object]] = []
    for chunk_num, start in enumerate(range(0, len(tokens), step)):
        end = min(start + chunk_size_tokens, len(tokens))
        if start >= end:
            continue
        chunk_tokens = tokens[start:end]
        section = "qa" if qa_idx is not None and start >= qa_idx else "prepared"
        chunk_text = " ".join(chunk_tokens)
        chunk_id = hashlib.sha1(f"{doc_id}|{chunk_num}|{start}|{end}".encode("utf-8")).hexdigest()
        chunks.append(
            {
                "chunk_id": chunk_id,
                "doc_id": doc_id,
                "ticker": ticker,
                "event_date": event_date,
                "section": section,
                "chunk_index": chunk_num,
                "token_start": start,
                "token_end": end,
                "chunk_text": chunk_text,
                "token_len": len(chunk_tokens),
            }
        )
        if end == len(tokens):
            break
    return chunks
