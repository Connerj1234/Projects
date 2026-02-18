#!/usr/bin/env python3
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import html
import json
from pathlib import Path
import os
import re
import time
from typing import Any

import pandas as pd
import requests
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = ROOT / "data" / "raw" / "transcripts" / "fmp_transcripts.parquet"
SEC_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json"
SEC_SUBMISSIONS_URL = "https://data.sec.gov/submissions/CIK{cik:010d}.json"
SEC_ARCHIVE_BASE = "https://www.sec.gov/Archives/edgar/data"
SEC_TICKER_CACHE = ROOT / "data" / "raw" / "sec" / "company_tickers.json"
TRANSCRIPT_HINTS = [
    "earnings call transcript",
    "conference call transcript",
    "transcript",
    "prepared remarks",
    "question-and-answer",
    "q&a",
    "earnings conference call",
]


def _safe_json_response(response: requests.Response) -> Any:
    try:
        return response.json()
    except ValueError:
        return None


def _safe_json_text(text: str) -> Any:
    try:
        return json.loads(text)
    except ValueError:
        return None


def _summarize_payload(payload: Any) -> str:
    if payload is None:
        return "non-JSON response"
    if isinstance(payload, dict):
        for key in ["Error Message", "error", "message"]:
            if key in payload and payload[key]:
                return str(payload[key])
        keys = ", ".join(sorted(payload.keys())) or "no keys"
        return f"object payload with keys: {keys}"
    if isinstance(payload, list):
        return f"list payload with {len(payload)} item(s)"
    return f"unexpected payload type: {type(payload).__name__}"


def _summarize_text_payload(text: str) -> str:
    payload = _safe_json_text(text)
    if payload is not None:
        return _summarize_payload(payload)
    clean = (text or "").strip().replace("\n", " ")
    if not clean:
        return "non-JSON empty response"
    return f"non-JSON response: {clean[:220]}"


def _load_fallback(path: Path) -> pd.DataFrame:
    if path.suffix.lower() == ".parquet":
        df = pd.read_parquet(path)
    else:
        df = pd.read_csv(path)

    required = ["ticker", "date", "year", "quarter", "content"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise RuntimeError(
            f"Fallback transcripts missing required columns: {', '.join(missing)}"
        )

    out = df.copy()
    out["date"] = pd.to_datetime(out["date"]).dt.normalize()
    out["ticker"] = out["ticker"].astype(str)
    out["year"] = out["year"].astype(int)
    out["quarter"] = out["quarter"].astype(int)
    out["content"] = out["content"].fillna("").astype(str)
    if "symbol" not in out.columns:
        out["symbol"] = out["ticker"]
    if "source" not in out.columns:
        out["source"] = "fallback"
    out["ingested_at"] = pd.Timestamp(datetime.now(timezone.utc))
    return out


def _quarter_from_date(ts: pd.Timestamp) -> int:
    return ((int(ts.month) - 1) // 3) + 1


def _text_from_html(raw: str) -> str:
    no_script = re.sub(r"(?is)<(script|style).*?>.*?</\\1>", " ", raw)
    no_tags = re.sub(r"(?is)<[^>]+>", " ", no_script)
    unescaped = html.unescape(no_tags)
    return re.sub(r"\s+", " ", unescaped).strip()


def _looks_like_transcript(text: str) -> bool:
    if len(text) < 1500:
        return False
    lowered = text.lower()
    return any(hint in lowered for hint in TRANSCRIPT_HINTS)


class SecClient:
    def __init__(self, user_agent: str, request_interval_sec: float = 0.25):
        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": user_agent,
                "Accept-Encoding": "gzip, deflate",
                "Accept": "application/json, text/plain, */*",
            }
        )
        self.request_interval_sec = request_interval_sec
        self.last_request_ts = 0.0

    def get(self, url: str, timeout: int = 30, max_retries: int = 4) -> tuple[str | None, str | None]:
        for attempt in range(max_retries):
            elapsed = time.time() - self.last_request_ts
            if elapsed < self.request_interval_sec:
                time.sleep(self.request_interval_sec - elapsed)
            self.last_request_ts = time.time()
            try:
                resp = self.session.get(url, timeout=timeout)
            except requests.RequestException as exc:
                if attempt == max_retries - 1:
                    return None, f"request_error: {exc}"
                time.sleep(min(2 ** attempt, 4))
                continue

            if resp.status_code == 200:
                return resp.text, None
            if resp.status_code in (429, 500, 502, 503, 504):
                if attempt == max_retries - 1:
                    return None, f"http_{resp.status_code}: {_summarize_text_payload(resp.text)}"
                time.sleep(min(2 ** attempt, 8))
                continue
            return None, f"http_{resp.status_code}: {_summarize_text_payload(resp.text)}"
        return None, "unknown_error"

    def get_json(self, url: str) -> tuple[Any | None, str | None]:
        text, error = self.get(url)
        if error:
            return None, error
        payload = _safe_json_text(text or "")
        if payload is None:
            return None, f"invalid_json: {_summarize_text_payload(text or '')}"
        return payload, None


def _load_ticker_map(client: SecClient) -> tuple[dict[str, int], str | None]:
    payload = None
    if SEC_TICKER_CACHE.exists():
        payload = _safe_json_text(SEC_TICKER_CACHE.read_text())

    if payload is None:
        payload, err = client.get_json(SEC_TICKERS_URL)
        if err:
            return {}, f"ticker_map_error: {err}"
        SEC_TICKER_CACHE.parent.mkdir(parents=True, exist_ok=True)
        SEC_TICKER_CACHE.write_text(json.dumps(payload))

    if not isinstance(payload, dict):
        return {}, f"ticker_map_invalid: {_summarize_payload(payload)}"

    out: dict[str, int] = {}
    for item in payload.values():
        if not isinstance(item, dict):
            continue
        ticker = str(item.get("ticker", "")).upper().strip()
        cik = item.get("cik_str")
        if ticker and cik is not None:
            out[ticker] = int(cik)
    if not out:
        return {}, "ticker_map_empty: no ticker rows found"
    return out, None


def _extract_filings(payload: Any) -> list[dict[str, str]]:
    if not isinstance(payload, dict):
        return []
    filings = payload.get("filings", {})
    recent = filings.get("recent", {})
    if not isinstance(recent, dict):
        return []
    forms = recent.get("form", [])
    dates = recent.get("filingDate", [])
    accs = recent.get("accessionNumber", [])
    primary_docs = recent.get("primaryDocument", [])

    n = min(len(forms), len(dates), len(accs), len(primary_docs))
    out = []
    for i in range(n):
        out.append(
            {
                "form": str(forms[i]),
                "filing_date": str(dates[i]),
                "accession": str(accs[i]),
                "primary_document": str(primary_docs[i]),
            }
        )
    return out


def _fetch_filing_candidates(
    client: SecClient, cik: int, start_year: int, end_year: int
) -> tuple[list[dict[str, str]], list[str]]:
    url = SEC_SUBMISSIONS_URL.format(cik=cik)
    payload, err = client.get_json(url)
    if err:
        return [], [f"submissions_error: CIK{cik:010d}: {err}"]

    candidates = _extract_filings(payload)
    errors: list[str] = []

    files = payload.get("filings", {}).get("files", []) if isinstance(payload, dict) else []
    if isinstance(files, list):
        for file_info in files:
            if not isinstance(file_info, dict):
                continue
            name = file_info.get("name")
            if not name:
                continue
            shard_url = f"https://data.sec.gov/submissions/{name}"
            shard_payload, shard_err = client.get_json(shard_url)
            if shard_err:
                errors.append(f"submissions_shard_error: CIK{cik:010d} {name}: {shard_err}")
                continue
            candidates.extend(_extract_filings(shard_payload))

    filtered = []
    for filing in candidates:
        form = filing.get("form", "")
        if form not in {"8-K", "6-K"}:
            continue
        filing_date = filing.get("filing_date")
        try:
            year = pd.Timestamp(filing_date).year
        except Exception:
            continue
        if start_year <= year <= end_year:
            filtered.append(filing)
    return filtered, errors


def fetch_ticker_rows(
    client: SecClient, ticker: str, cik: int, start_year: int, end_year: int
) -> tuple[list[dict], list[str], int]:
    rows: list[dict] = []
    errors: list[str] = []
    scanned = 0
    filings, filing_errors = _fetch_filing_candidates(client, cik, start_year, end_year)
    errors.extend(filing_errors)

    for filing in filings:
        scanned += 1
        accession = filing.get("accession", "")
        primary_doc = filing.get("primary_document", "")
        filing_date = filing.get("filing_date", "")
        if not accession or not primary_doc or not filing_date:
            continue

        acc_no_dash = accession.replace("-", "")
        filing_url = f"{SEC_ARCHIVE_BASE}/{cik}/{acc_no_dash}/{primary_doc}"
        doc_text, doc_error = client.get(filing_url)
        if doc_error:
            errors.append(f"filing_doc_error: {ticker} {filing_date}: {doc_error}")
            continue

        text = _text_from_html(doc_text or "")
        if not _looks_like_transcript(text):
            continue

        dt = pd.to_datetime(filing_date).normalize()
        rows.append(
            {
                "ticker": ticker,
                "date": dt,
                "year": int(dt.year),
                "quarter": _quarter_from_date(dt),
                "symbol": ticker,
                "content": text,
                "source": "sec_edgar",
                "ingested_at": pd.Timestamp(datetime.now(timezone.utc)),
            }
        )
    return rows, errors, scanned


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tickers", nargs="+", required=True)
    parser.add_argument("--start-year", type=int, default=2019)
    parser.add_argument("--end-year", type=int, default=2025)
    parser.add_argument(
        "--fallback-path",
        type=Path,
        default=Path(os.getenv("TRANSCRIPTS_FALLBACK_PATH", "")) if os.getenv("TRANSCRIPTS_FALLBACK_PATH") else None,
        help="Local CSV/Parquet with columns: ticker,date,year,quarter,content (used if SEC returns no rows).",
    )
    parser.add_argument(
        "--request-interval-sec",
        type=float,
        default=float(os.getenv("SEC_REQUEST_INTERVAL_SEC", "0.25")),
        help="Minimum delay between SEC requests for fair-access compliance.",
    )
    args = parser.parse_args()

    load_dotenv(ROOT / ".env")
    sec_user_agent = os.getenv("SEC_USER_AGENT")
    if not sec_user_agent and not (args.fallback_path and args.fallback_path.exists()):
        raise RuntimeError(
            "SEC_USER_AGENT missing. Add it to .env with contact info, "
            'e.g. "Your Name your-email@example.com".'
        )

    if args.fallback_path and not args.fallback_path.exists():
        raise RuntimeError(f"--fallback-path does not exist: {args.fallback_path}")

    if not sec_user_agent and args.fallback_path and args.fallback_path.exists():
        df = _load_fallback(args.fallback_path)
        df = df.drop_duplicates(subset=["ticker", "date", "quarter", "year"]).sort_values(["ticker", "date"])
        OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
        df.to_parquet(OUT_PATH, index=False)
        print(f"Using fallback-only mode; saved {len(df)} transcript rows to {OUT_PATH}")
        return

    client = SecClient(user_agent=sec_user_agent or "", request_interval_sec=max(0.1, args.request_interval_sec))
    ticker_map, ticker_map_error = _load_ticker_map(client)
    if ticker_map_error:
        if args.fallback_path and args.fallback_path.exists():
            df = _load_fallback(args.fallback_path)
            df = df.drop_duplicates(subset=["ticker", "date", "quarter", "year"]).sort_values(["ticker", "date"])
            OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
            df.to_parquet(OUT_PATH, index=False)
            print(
                f"SEC unavailable ({ticker_map_error}); using fallback transcripts from {args.fallback_path} "
                f"({len(df)} rows)"
            )
            return
        raise RuntimeError(f"Unable to load SEC ticker map: {ticker_map_error}")

    all_rows: list[dict] = []
    total_scanned_filings = 0
    error_counts: dict[str, int] = {}
    error_examples: list[str] = []
    for ticker in [t.upper() for t in args.tickers]:
        cik = ticker_map.get(ticker)
        if cik is None:
            err = f"ticker_not_found: {ticker}: ticker missing in SEC mapping"
            error_counts["ticker_not_found"] = error_counts.get("ticker_not_found", 0) + 1
            if len(error_examples) < 5:
                error_examples.append(err)
            continue

        rows, errors, scanned = fetch_ticker_rows(
            client=client,
            ticker=ticker,
            cik=cik,
            start_year=args.start_year,
            end_year=args.end_year,
        )
        all_rows.extend(rows)
        total_scanned_filings += scanned
        for error in errors:
            category = error.split(":", 1)[0]
            error_counts[category] = error_counts.get(category, 0) + 1
            if len(error_examples) < 5:
                error_examples.append(error)

    df = pd.DataFrame(all_rows)
    if df.empty:
        if args.fallback_path and args.fallback_path.exists():
            df = _load_fallback(args.fallback_path)
            print(f"Using fallback transcripts from {args.fallback_path} ({len(df)} rows)")
        else:
            diagnostics = (
                f"SEC summary: scanned_filings={total_scanned_filings}"
            )
            if error_counts:
                diagnostics = diagnostics + ", " + ", ".join(
                    f"{k}={v}" for k, v in sorted(error_counts.items())
                )
            examples = "\n".join(f"  - {example}" for example in error_examples) or "  - none"
            raise RuntimeError(
                "No transcripts returned.\n"
                f"{diagnostics}\n"
                "Example responses:\n"
                f"{examples}\n"
                "If SEC filings did not include transcript-like text, provide --fallback-path "
                "with a local transcript dataset."
            )

    df = df.drop_duplicates(subset=["ticker", "date", "quarter", "year"]).sort_values(["ticker", "date"])
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(OUT_PATH, index=False)

    print(f"Saved {len(df)} transcript rows to {OUT_PATH} (source=sec_edgar/fallback)")


if __name__ == "__main__":
    main()
