import requests
import psycopg2
from datetime import datetime
import os
from dotenv import load_dotenv
import urllib.parse as urlparse

# Load .env and extract DATABASE_URL
load_dotenv(".env")
db_url = os.getenv("DATABASE_URL")
result = urlparse.urlparse(db_url)

# Extract components
username = result.username
password = result.password
database = result.path[1:]
hostname = result.hostname
port = result.port

# Connect to PostgreSQL
conn = psycopg2.connect(
    dbname=database,
    user=username,
    password=password,
    host=hostname,
    port=port
)
cursor = conn.cursor()

# Scraping target
url = "https://api.gsu.edu/proxy/handler/parking/spaces-available"
response = requests.get(url)
data = response.json()

# Extract & insert/update data
for entry in data[0]:
    name = entry["location_name"]
    free_spaces = int(entry["free_spaces"])
    total_spaces = int(entry["total_spaces"])
    percent = round((free_spaces / total_spaces) * 100, 1)
    last_updated = datetime.now()

    cursor.execute("""
        INSERT INTO parking_status (deck_name, open_spaces, percentage, last_updated)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (deck_name)
        DO UPDATE SET
            open_spaces = EXCLUDED.open_spaces,
            percentage = EXCLUDED.percentage,
            last_updated = EXCLUDED.last_updated
    """, (name, free_spaces, percent, last_updated))

conn.commit()
cursor.close()
conn.close()
print("✅ Parking data updated successfully")
