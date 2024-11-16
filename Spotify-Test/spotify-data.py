import pandas as pd
import numpy as np
import seaborn as sns
import matplotlib.pyplot as plt

data = pd.read_csv("/Users/connerjamison/Downloads/Spotify-Most-Streamed-Songs.csv")


"""
#Basic Info about Data
print(data.info())
print(data.describe(include='all'))
print(data.shape)
print(data.size)

#Data Cleaning
data = data.dropna(inplace=True)
data = data.reset_index(inplace=True, drop=True)
print(data.isnull().sum(axis=0)) #Confirms no missing values

print(data[["artist(s)_name", "track_name",  "streams"]])
print(data.groupby("artist_count")["track_name"].count())

#Boxplot using seaborn
plt.figure(figsize=(5,1))
plt.title('in spotify playlists')
sns.boxplot(x=data['in_spotify_playlists'])
plt.show()

#Histogram using seaborn
plt.figure(figsize=(5,3))
sns.histplot(data['in_spotify_playlists'], bins=range(0,1000,20))
plt.title('spotify playlists histogram')
plt.show()"""
