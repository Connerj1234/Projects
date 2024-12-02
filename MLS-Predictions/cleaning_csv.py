import pandas as pd

data = pd.read_csv("/Users/connerjamison/VSCode/GitHub/match_data.csv")

def update_result_and_clean_penalty(df):
    for index, row in df.iterrows():
        # Check for penalties in 'gf' and 'ga' columns
        if pd.isna(row["gf"]) or pd.isna(row["ga"]):
            continue
        if "(" in str(row["gf"]) and "(" in str(row["ga"]):
            # Extract actual goals and penalty shootout scores
            gf_actual, gf_penalty = map(int, str(row["gf"]).replace(")", "").split(" ("))
            ga_actual, ga_penalty = map(int, str(row["ga"]).replace(")", "").split(" ("))

            # Update the result based on penalty shootout
            if gf_penalty > ga_penalty:
                df.at[index, "result"] = "W"
            elif gf_penalty < ga_penalty:
                df.at[index, "result"] = "L"
            else:
                df.at[index, "result"] = "D"  # This shouldn't occur in penalties

            # Update 'gf' and 'ga' to remove penalty shootout scores
            df.at[index, "gf"] = gf_actual
            df.at[index, "ga"] = ga_actual

    # Ensure 'gf' and 'ga' are numeric after cleanup
    df["gf"] = pd.to_numeric(df["gf"], errors="coerce")
    df["ga"] = pd.to_numeric(df["ga"], errors="coerce")
    return df

def clean_match_data(match_df):
    """Clean and preprocess raw match data."""
    # Ensure columns are numeric where needed
    match_df["gf"] = pd.to_numeric(match_df["gf"], errors="coerce").fillna(0).astype(int)
    match_df["ga"] = pd.to_numeric(match_df["ga"], errors="coerce").fillna(0).astype(int)
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

    # Drop unnecessary or duplicated columns
    match_df = match_df.drop(columns=["match report", "time_opponent", "comp_opponent", "round_opponent", "day_opponent",
                                      "opponent_opponent", "attendance_opponent", "formation_opponent", "opp formation_opponent",
                                      "referee_opponent", "match report_opponent", "venue_opponent", "result_opponent", "gf_opponent", "ga_opponent",
                                      "notes_opponent", "season_opponent", "xg_opponent", "xga_opponent", "opponent_team"],
                             errors="ignore")

    desired_order = ["match #", "date", "season","time", "hour","comp", "round", "day", "day_code","venue", "is_home","result", "gf", "ga", "team"]
    match_df = match_df[desired_order + [col for col in match_df.columns if col not in desired_order]]

    return match_df

# Apply functions
data = update_result_and_clean_penalty(data)
data = clean_match_data(data)

data.to_csv("MLS_cleaned.csv", index=False)
