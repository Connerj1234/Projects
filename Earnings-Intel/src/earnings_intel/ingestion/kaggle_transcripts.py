from __future__ import annotations

import hashlib
from pathlib import Path

import pandas as pd

from earnings_intel.utils.dates import parse_date
from earnings_intel.utils.text import has_forward_looking, token_count


def _doc_id(ticker: str, event_date: pd.Timestamp, full_text: str) -> str:
    base = f"{ticker}|{event_date.date() if pd.notna(event_date) else 'na'}|{full_text[:500]}"
    return hashlib.sha1(base.encode("utf-8")).hexdigest()


def load_source(input_path: str) -> pd.DataFrame:
    p = Path(input_path)
    if p.suffix == ".parquet":
        return pd.read_parquet(p)
    if p.suffix == ".csv":
        return pd.read_csv(p)
    raise ValueError(f"Unsupported file extension: {p.suffix}")


def normalize_transcripts(df: pd.DataFrame, source_name: str) -> pd.DataFrame:
    out = pd.DataFrame()
    out["ticker"] = df.get("symbol")
    out["event_date"] = parse_date(df.get("date"))
    out["fiscal_year"] = pd.to_numeric(df.get("year"), errors="coerce")
    out["fiscal_quarter"] = pd.to_numeric(df.get("quarter"), errors="coerce")
    out["speaker_segments"] = df.get("structured_content")
    out["full_text"] = df.get("content").fillna("")
    out["source_name"] = source_name
    out["char_len"] = out["full_text"].str.len()
    out["token_len"] = out["full_text"].map(token_count)
    out["contains_forward_looking"] = out["full_text"].map(has_forward_looking)
    out["doc_id"] = [
        _doc_id(ticker=str(t), event_date=d, full_text=str(txt))
        for t, d, txt in zip(out["ticker"], out["event_date"], out["full_text"])
    ]

    out = out[
        [
            "doc_id",
            "ticker",
            "event_date",
            "fiscal_year",
            "fiscal_quarter",
            "speaker_segments",
            "full_text",
            "source_name",
            "char_len",
            "token_len",
            "contains_forward_looking",
        ]
    ]
    return out


def deduplicate_longest(df: pd.DataFrame) -> pd.DataFrame:
    tmp = df.sort_values(["ticker", "event_date", "char_len"], ascending=[True, True, False])
    return tmp.drop_duplicates(subset=["ticker", "event_date"], keep="first").reset_index(drop=True)
