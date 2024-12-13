import pandas as pd

data = pd.read_csv("/Users/connerjamison/VSCode/GitHub/Projects/MLS-Predictions/MLS_uncleaned.csv")

def remove_penalty_scores(match_df):
    # Backup original match outcomes
    original_results = match_df["result"].copy()

    # Extract the base score (before parentheses) for gf and ga
    match_df["gf"] = match_df["gf"].astype(str).str.extract(r"^(\d+)").fillna(0).astype(int)
    match_df["ga"] = match_df["ga"].astype(str).str.extract(r"^(\d+)").fillna(0).astype(int)

    # Restore the original match outcomes for draws
    match_df["result"] = original_results

    return match_df

def clean_match_data(match_df):
    # Ensure columns are numeric
    match_df["gf"] = pd.to_numeric(match_df["gf"], errors="coerce").astype(int)
    match_df["ga"] = pd.to_numeric(match_df["ga"], errors="coerce").astype(int)
    match_df["season"] = pd.to_numeric(match_df["season"], errors="coerce").astype(int)
    match_df["xg"] = pd.to_numeric(match_df["xg"], errors="coerce")
    match_df["xga"] = pd.to_numeric(match_df["xga"], errors="coerce")

    # Add a binary flag for home/away
    match_df["is_home"] = match_df["venue"].apply(lambda x: 1 if x == "Home" else 0)

    # Ensure Date column is in datetime format and sorted
    match_df["date"] = pd.to_datetime(match_df["date"])
    match_df = match_df.sort_values(by=["date"])
    match_df["hour"] = match_df["time"].str.replace(":.+", "", regex=True).astype("int", errors="ignore")
    match_df["day_code"] = match_df["date"].dt.dayofweek

    match_df = match_df.rename(columns={"Unnamed: 0": "match #"})
    match_df["match #"] = match_df["match #"].astype(int)

    match_df = match_df.dropna(subset=["result"])
    match_df = match_df.fillna(0)

    # Drop unnecessary or duplicated columns
    match_df = match_df.drop(columns=["match report", "time_opponent", "comp_opponent", "round_opponent", "day_opponent",
                                      "opponent_opponent", "attendance_opponent", "formation_opponent", "opp formation_opponent",
                                      "referee_opponent", "match report_opponent", "venue_opponent", "result_opponent", "gf_opponent", "ga_opponent",
                                      "notes_opponent", "season_opponent", "xg_opponent", "xga_opponent", "opponent_team", "captain",
                                      "referee", "formation", "opp formation", "notes", "captain_opponent", "day", "comp", "round"],
                             errors="ignore")

    desired_order = ["match #", "date", "season", "time", "hour", "day_code","venue", "is_home","result", "gf", "ga", "team"]
    match_df = match_df[desired_order + [col for col in match_df.columns if col not in desired_order]]

    return match_df

# Apply functions
data = remove_penalty_scores(data)
data = clean_match_data(data)

data.to_csv("MLS_cleaned.csv", index=False)
