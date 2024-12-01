import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
import random

# Initialize a session
session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Connection": "keep-alive"
})

def fetch_url_with_session(url, session, retries=3, sleep_range=(15, 30)):
    for i in range(retries):
        try:
            response = session.get(url, timeout=10)
            if response.status_code == 200:
                time.sleep(random.uniform(*sleep_range))  # Longer random delay
                return response
            elif response.status_code == 429:
                print("Too many requests (429). Waiting before retrying...")
                time.sleep(60)  # Explicitly wait 60 seconds if rate-limited
            else:
                print(f"Request failed with status {response.status_code}. Retrying...")
                time.sleep(2 ** i)
        except Exception as e:
            print(f"Error: {e}. Retrying...")
            time.sleep(2 ** i)
    raise Exception(f"Failed to fetch {url} after {retries} retries")

# Base URL for MLS standings
standings_url = "https://fbref.com/en/comps/22/Major-League-Soccer-Stats"
years = list(range(2024, 2015, -1))

# Scrape team URLs
all_team_urls = {}
print("Scraping team URLs for all seasons...")
for year in years:
    print(f"Scraping standings for the {year} season...")
    response = fetch_url_with_session(standings_url, session)
    soup = BeautifulSoup(response.text, features='lxml')
    standings_table = soup.select('table.stats_table')[12]
    links = [l.get("href") for l in standings_table.find_all('a')]
    links = [l for l in links if '/squads/' in l]
    team_urls = [f"https://fbref.com{l}" for l in links]
    all_team_urls[year] = team_urls
    previous_season = soup.select("a.prev")[0].get("href")
    standings_url = f"https://fbref.com{previous_season}"

first_year = list(all_team_urls.keys())[0]

# Print the URLs for the first year
print(f"Team URLs for {first_year}: {all_team_urls[first_year]}")

print("Finished scraping team URLs.")

# Process each team
all_matches = []
for year, team_urls in all_team_urls.items():
    #team_urls = team_urls[:3:2]  # Only take the first 3 team URLs
    team_stats = []
    for team_url in team_urls:
        team_name = team_url.split("/")[-1].replace("-Stats", "").replace("-", " ")
        print(f"Processing stats for team: {team_name}")

        # Fetch team page
        data = requests.get(team_url)
        matches = pd.read_html(data.text, match="Scores & Fixtures")[0]
        soup = BeautifulSoup(data.text, "lxml")

        try:
            standard_stats_table = pd.read_html(data.text, match="Standard Stats")[0]
            standard_stats_table.columns = standard_stats_table.columns.droplevel(0)  # Drop multi-level column headers
            team_age = standard_stats_table.iloc[-2]["Age"]  # Extract age from the last row
        except (ValueError, KeyError):
            print(f"Could not find age for team: {team_name}")
            team_age = None

        # Extract links to stats subpages
        links = [l.get("href") for l in soup.find_all("a")]

        # ----------------- Fetch Shooting Stats -----------------
        shooting_links = [l for l in links if l and "all_comps/shooting/" in l]
        if shooting_links:
            shooting_url = f"https://fbref.com{shooting_links[0]}"
            print(f"Fetching shooting stats from: {shooting_url}")
            shooting_data = requests.get(shooting_url)
            try:
                shooting = pd.read_html(shooting_data.text, match="Shooting")[0]
                shooting.columns = shooting.columns.droplevel()  # Adjust if multi-level columns exist
                shooting = shooting[["Date", "Sh", "SoT", "Dist", "FK", "PK", "PKatt"]]
            except ValueError:
                print("No Shooting table found.")
                shooting = pd.DataFrame(columns=["Date", "Sh", "SoT", "Dist", "FK", "PK", "PKatt"])
        else:
            print("No Shooting link found.")
            shooting = pd.DataFrame(columns=["Date", "Sh", "SoT", "Dist", "FK", "PK", "PKatt"])

        # ----------------- Fetch Passing Stats -----------------
        passing_links = [l for l in links if l and "all_comps/passing/" in l]
        if passing_links:
            passing_url = f"https://fbref.com{passing_links[0]}"
            print(f"Fetching passing stats from: {passing_url}")
            passing_data = requests.get(passing_url)
            try:
                passing = pd.read_html(passing_data.text, match="Passing")[0]
                passing.columns = passing.columns.droplevel()  # Adjust if multi-level columns exist
                # Keep all columns from the Passing table, duplicates included
                passing = passing[["Date", "Cmp", "Att", "Cmp%","Ast", "KP"]]
            except ValueError as e:
                print("Error while processing the Passing table:", e)
                passing = pd.DataFrame()  # Empty DataFrame if the table isn't found
        else:
            print("No Passing link found.")
            passing = pd.DataFrame()  # Empty DataFrame if no link is found


        # ----------------- Fetch Goal Creation Stats -----------------
        creation_links = [l for l in links if l and "all_comps/gca/" in l]
        if creation_links:
            creation_url = f"https://fbref.com{creation_links[0]}"
            print(f"Fetching goal creation stats from: {creation_url}")
            creation_data = requests.get(creation_url)
            try:
                creation = pd.read_html(creation_data.text, match="Goal and Shot Creation")[0]
                creation.columns = creation.columns.droplevel()  # Adjust if multi-level columns exist
                creation = creation[["Date", "SCA", "GCA"]]
            except ValueError:
                print("No Goal Creation table found.")
                creation = pd.DataFrame(columns=["Date", "SCA", "GCA"])
        else:
            print("No Goal Creation link found.")
            creation = pd.DataFrame(columns=["Date", "SCA", "GCA"])

        # ----------------- Fetch Defensive Actions Stats -----------------
        defensive_links = [l for l in links if l and "all_comps/defense/" in l]
        if defensive_links:
            defensive_url = f"https://fbref.com{defensive_links[0]}"
            print(f"Fetching defensive stats from: {defensive_url}")
            defensive_data = requests.get(defensive_url)
            try:
                defensive = pd.read_html(defensive_data.text, match="Defensive Actions")[0]
                defensive.columns = defensive.columns.droplevel()  # Adjust if multi-level columns exist

                # Select only the desired columns
                defensive = defensive[["Date", "Tkl", "Blocks","Int", "Clr", "Err"]]
            except ValueError as e:
                print("Error while processing the Defensive Actions table:", e)
                defensive = pd.DataFrame(columns=["Date", "Tkl", "Blocks","Int", "Clr", "Err"])
        else:
            print("No Defensive Actions link found.")
            defensive = pd.DataFrame(columns=["Date", "Tkl", "Blocks","Int", "Clr", "Err"])


        # Merge Data
        team_data = matches.merge(shooting, on="Date", how="left", suffixes=("", "_shooting"))
        team_data = team_data.merge(passing, on="Date", how="left", suffixes=("", "_passing"))
        team_data = team_data.merge(creation, on="Date", how="left", suffixes=("", "_creation"))
        team_data = team_data.merge(defensive, on="Date", how="left", suffixes=("", "_defensive"))

        team_data["team_age"] = team_age

        # Add metadata
        team_data["Season"] = year
        team_data["Team"] = team_url.split("/")[-1].replace("-Stats", "").replace("-", " ")

        # Add the processed team data to a list for later concatenation
        team_stats.append(team_data)

        # Pause to avoid being rate-limited
        time.sleep(random.uniform(15, 30))
  # Delay to avoid blocking

    if team_stats:
    # Combine all team data for the season
        season_data = pd.concat(team_stats, ignore_index=True)

        # Standardize team and opponent names using a mapping
        team_name_mapping = {
            "Atlanta Utd": "Atlanta United",
            "Inter-Miami": "Inter Miami",
            "NYCFC": "New York City FC",
            "Charlotte": "Charlotte FC",
            "NY Red Bulls": "New York Red Bulls",
            "NE Revolution": "New England Revolution",
            "LAFC": "Los Angeles FC",
            "Minnesota Utd": "Minnesota United",
            "Vancouver W'caps": "Vancouver Whitecaps FC",
            "Austin": "Austin FC",
            "St. Louis": "St Louis City",
            "Sporting KC": "Sporting Kansas City",
            "SJ Earthquakes": "San Jose Earthquakes",
            "DC United": "D.C. United",
            "CF Montréal": "CF Montreal",
        }
        season_data = pd.concat(team_stats, ignore_index=True)

        # Standardize team and opponent names
        season_data["Team"] = season_data["Team"].replace(team_name_mapping)
        season_data["Opponent"] = season_data["Opponent"].replace(team_name_mapping)

        # Prepare opponent stats
        opponent_stats = season_data.copy()

        # Rename "Team" to "opponent_team"
        opponent_stats = opponent_stats.rename(columns={"Team": "opponent_team"})

        # Add suffix to opponent stats columns
        opponent_stats.columns = [
            f"{col}_opponent" if col not in ["Date", "opponent_team"] else col
            for col in opponent_stats.columns
        ]

        # Ensure no duplicate rows in opponent_stats
        opponent_stats = opponent_stats.drop_duplicates(subset=["Date", "opponent_team"]).reset_index(drop=True)

        # Ensure indices are unique before merging
        if not season_data.index.is_unique:
            print("Season Data Index is not unique. Resetting...")
            season_data = season_data.reset_index(drop=True)

        if not opponent_stats.index.is_unique:
            print("Opponent Stats Index is not unique. Resetting...")
            opponent_stats = opponent_stats.reset_index(drop=True)

        # Perform merge
        try:
            combined_data = season_data.merge(
                opponent_stats,
                left_on=["Date", "Opponent"],
                right_on=["Date", "opponent_team"],
                how="left"
            )
        except Exception as e:
            print("Error during merge:", e)
            print("Season Data:")
            print(season_data.head())
            print("Opponent Stats:")
            print(opponent_stats.head())
            raise

        # Reset index for the final combined dataset
        combined_data = combined_data.reset_index(drop=True)

        # Append to all_matches
        all_matches.append(combined_data)
    else:
        print(f"No team stats found for year {year}")



# Save final data
if all_matches:
    match_df = pd.concat(all_matches, ignore_index=True)
    match_df.columns = [c.lower() for c in match_df.columns]
    match_df.to_csv("match_data_with_opponents.csv", index=False)
    print("Data saved to match_data_with_opponents.csv")
else:
    print("No matches to concatenate.")
