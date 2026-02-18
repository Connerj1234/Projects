from pathlib import Path

from datasets import load_dataset


def main() -> None:
    dataset = load_dataset("Bose345/sp500_earnings_transcripts")
    train = dataset["train"].to_pandas()

    output_dir = Path("data/raw/transcripts")
    output_dir.mkdir(parents=True, exist_ok=True)
    out_path = output_dir / "sp500_transcripts.parquet"
    train.to_parquet(out_path, index=False)

    print(f"Saved dataset: {out_path} (rows={len(train)})")


if __name__ == "__main__":
    main()
