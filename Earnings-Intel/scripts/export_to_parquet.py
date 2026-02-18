from datasets import load_dataset
from pathlib import Path

dataset = load_dataset("Bose345/sp500_earnings_transcripts")

# Convert split to pandas
df = dataset["train"].to_pandas()

output_dir = Path("data/raw/transcripts")
output_dir.mkdir(parents=True, exist_ok=True)

df.to_parquet(output_dir / "sp500_transcripts.parquet")

print("Saved to data/raw/transcripts/")
