from __future__ import annotations

import pandas as pd


def drop_empty_transcripts(df: pd.DataFrame) -> pd.DataFrame:
    return df[df["full_text"].str.strip().ne("")].copy()
