import pandas as pd
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor
from sklearn.metrics import accuracy_score
import random

# --- 1. Data Cleaning Function ---
def clean_match_data(match_df):
    """Clean and preprocess raw match data."""
    # Ensure columns are numeric where needed
    match_df["gf"] = match_df["gf"].astype(int)
    match_df["ga"] = match_df["ga"].astype(int)
    match_df["xg"] = match_df["xg"].astype(float)
    match_df["xga"] = match_df["xga"].astype(float)

    # Add a binary flag for home/away
    match_df["is_home"] = match_df["Venue"].apply(lambda x: 1 if x == "Home" else 0)

    # Clean opponent names
    match_df["Opponent"] = match_df["Opponent"].str.strip()

    # Ensure Date column is in datetime format and sorted
    match_df["date"] = pd.to_datetime(match_df["date"])
    match_df = match_df.sort_values(by=["date"])
    match_df["hour"] = match_df["time"].str.replace(":.+", "", regex=True).astype("int")
    match_df["day_code"] = match_df["date"].dt.dayofweek

    return match_df

# --- 2. Load and Clean Data ---
match_df = pd.read_csv("match_data_with_opponents.csv")  # Adjust file name as needed
match_df = clean_match_data(match_df)

# --- 3. Assign Neutral Labels (Team 1 and Team 2) ---
# Assign Team 1 and Team 2 Based on Venue
match_df["team_1"] = match_df.apply(lambda row: row["team"] if row["is_home"] == 1 else row["opponent"], axis=1)
match_df["team_2"] = match_df.apply(lambda row: row["opponent"] if row["is_home"] == 1 else row["team"], axis=1)

# Assign Home/Away Flags
match_df["is_home_team1"] = match_df["is_home"]
match_df["is_home_team2"] = match_df["is_home"].apply(lambda x: 0 if x == 1 else 1)  # Reverse of is_home

# --- 4. Add Rolling Averages Based on Last 5 Games ---
match_df = match_df.sort_values(by=["team_1", "date"])
rolling_features = ["gf", "ga", "sh", "sot"]  # Add more features as necessary
for feature in rolling_features:
    match_df[f"team_1_{feature}_rolling"] = (
        match_df.groupby("team_1")[feature].rolling(window=5, min_periods=1).mean().reset_index(0, drop=True)
    )
    match_df[f"team_2_{feature}_rolling"] = (
        match_df.groupby("team_2")[feature].rolling(window=5, min_periods=1).mean().reset_index(0, drop=True)
    )

# --- 5. Split Data into Training (Pre-2023) and Test (2024) ---
match_df["year"] = pd.to_datetime(match_df["date"]).dt.year
train_data = match_df[match_df["year"] < 2023]
test_data = match_df[match_df["year"] == 2024]

# Define features and targets
features = [
    "team_1_gf_rolling", "team_1_ga_rolling", "team_2_gf_rolling", "team_2_ga_rolling",
    "is_home_team1", "is_home_team2", "hour", "day_code"
]
target_team_1 = "gf"  # Goals scored by Team 1
target_team_2 = "ga"  # Goals scored by Team 2

X_train = train_data[features]
y_train_team_1 = train_data[target_team_1]
y_train_team_2 = train_data[target_team_2]

X_test = test_data[features]
y_test_team_1 = test_data[target_team_1]
y_test_team_2 = test_data[target_team_2]

# --- 6. Perform Grid Search for Hyperparameter Tuning ---
# Random Forest Parameters
rf_param_grid = {
    "n_estimators": [50, 100, 200, 300],
    "max_depth": [5, 10, 15],
    "min_samples_split": [2, 5, 10]
}

# XGBoost Parameters
xgb_param_grid = {
    "n_estimators": [50, 100, 200, 300],
    "learning_rate": [0.01, 0.1, 0.2],
    "max_depth": [3, 5, 7]
}

# --- Grid Search for Random Forest (Team 1) ---
rf_grid_team_1 = GridSearchCV(RandomForestRegressor(random_state=42), rf_param_grid, cv=3, scoring="neg_mean_absolute_error")
rf_grid_team_1.fit(X_train, y_train_team_1)
print("Best RF Params (Team 1):", rf_grid_team_1.best_params_)

# Retrain Random Forest with Best Parameters (Team 1)
rf_team_1 = RandomForestRegressor(**rf_grid_team_1.best_params_, random_state=42)
rf_team_1.fit(X_train, y_train_team_1)

# --- Grid Search for Random Forest (Team 2) ---
rf_grid_team_2 = GridSearchCV(RandomForestRegressor(random_state=42), rf_param_grid, cv=3, scoring="neg_mean_absolute_error")
rf_grid_team_2.fit(X_train, y_train_team_2)
print("Best RF Params (Team 2):", rf_grid_team_2.best_params_)

# Retrain Random Forest with Best Parameters (Team 2)
rf_team_2 = RandomForestRegressor(**rf_grid_team_2.best_params_, random_state=42)
rf_team_2.fit(X_train, y_train_team_2)

# --- Grid Search for XGBoost (Team 1) ---
xgb_grid_team_1 = GridSearchCV(XGBRegressor(random_state=42, objective='reg:squarederror'), xgb_param_grid, cv=3, scoring="neg_mean_absolute_error")
xgb_grid_team_1.fit(X_train, y_train_team_1)
print("Best XGB Params (Team 1):", xgb_grid_team_1.best_params_)

# Retrain XGBoost with Best Parameters (Team 1)
xgb_team_1 = XGBRegressor(**xgb_grid_team_1.best_params_, random_state=42)
xgb_team_1.fit(X_train, y_train_team_1)

# --- Grid Search for XGBoost (Team 2) ---
xgb_grid_team_2 = GridSearchCV(XGBRegressor(random_state=42, objective='reg:squarederror'), xgb_param_grid, cv=3, scoring="neg_mean_absolute_error")
xgb_grid_team_2.fit(X_train, y_train_team_2)
print("Best XGB Params (Team 2):", xgb_grid_team_2.best_params_)

# Retrain XGBoost with Best Parameters (Team 2)
xgb_team_2 = XGBRegressor(**xgb_grid_team_2.best_params_, random_state=42)
xgb_team_2.fit(X_train, y_train_team_2)


# --- 7. Champion Model Evaluation and Final Test ---

# --- Champion Model Selection ---
# Predictions on the training set
rf_team_1_train_pred = rf_team_1.predict(X_train)
xgb_team_1_train_pred = xgb_team_1.predict(X_train)

rf_team_2_train_pred = rf_team_2.predict(X_train)
xgb_team_2_train_pred = xgb_team_2.predict(X_train)

# Evaluate model performance using Mean Absolute Error (MAE)
from sklearn.metrics import mean_absolute_error

rf_team_1_mae = mean_absolute_error(y_train_team_1, rf_team_1_train_pred)
xgb_team_1_mae = mean_absolute_error(y_train_team_1, xgb_team_1_train_pred)

rf_team_2_mae = mean_absolute_error(y_train_team_2, rf_team_2_train_pred)
xgb_team_2_mae = mean_absolute_error(y_train_team_2, xgb_team_2_train_pred)

# Choose Champion Models (lower MAE is better)
if rf_team_1_mae < xgb_team_1_mae:
    champion_team_1_model = rf_team_1
else:
    champion_team_1_model = xgb_team_1

if rf_team_2_mae < xgb_team_2_mae:
    champion_team_2_model = rf_team_2
else:
    champion_team_2_model = xgb_team_2

print("Champion Model for Team 1:", type(champion_team_1_model).__name__)
print("Champion Model for Team 2:", type(champion_team_2_model).__name__)

# --- 2. Test the Champion Models ---
# Predictions on the test set
team_1_test_pred = champion_team_1_model.predict(X_test)
team_2_test_pred = champion_team_2_model.predict(X_test)

# --- 3. Predict Match Results ---
# Determine the predicted match result (Win/Draw/Loss)
test_data["predicted_result"] = [
    "W" if team_1_test_pred[i] > team_2_test_pred[i] else
    ("L" if team_1_test_pred[i] < team_2_test_pred[i] else "D")
    for i in range(len(team_1_test_pred))
]

# Determine the actual match result (Win/Draw/Loss)
actual_results = [
    "W" if y_test_team_1.iloc[i] > y_test_team_2.iloc[i] else
    ("L" if y_test_team_1.iloc[i] < y_test_team_2.iloc[i] else "D")
    for i in range(len(y_test_team_1))
]

# --- 4. Calculate Accuracy ---
# Compare predicted results with actual results
test_accuracy = accuracy_score(actual_results, test_data["predicted_result"])
print(f"Final Test Accuracy: {test_accuracy:.2f}")

# --- 5. Visualize Confusion Matrix ---
from sklearn.metrics import confusion_matrix
import seaborn as sns
import matplotlib.pyplot as plt

conf_matrix = confusion_matrix(actual_results, test_data["predicted_result"], labels=["W", "D", "L"])
conf_matrix_df = pd.DataFrame(conf_matrix, index=["W", "D", "L"], columns=["W", "D", "L"])

plt.figure(figsize=(8, 6))
sns.heatmap(conf_matrix_df, annot=True, fmt="d", cmap="Blues")
plt.title("Confusion Matrix for Match Result Predictions")
plt.ylabel("Actual Result")
plt.xlabel("Predicted Result")
plt.show()

# --- 6. Feature Importance ---
# Extract feature importance from the models
if hasattr(champion_team_1_model, 'feature_importances_'):
    team_1_feature_importance = champion_team_1_model.feature_importances_
else:
    team_1_feature_importance = champion_team_1_model.get_booster().get_score(importance_type='weight')

if hasattr(champion_team_2_model, 'feature_importances_'):
    team_2_feature_importance = champion_team_2_model.feature_importances_
else:
    team_2_feature_importance = champion_team_2_model.get_booster().get_score(importance_type='weight')

# Convert feature importance to a DataFrame
team_1_feature_importance_df = pd.DataFrame({
    'Feature': X_test.columns,
    'Importance': team_1_feature_importance
}).sort_values(by='Importance', ascending=False)

team_2_feature_importance_df = pd.DataFrame({
    'Feature': X_test.columns,
    'Importance': team_2_feature_importance
}).sort_values(by='Importance', ascending=False)

# Plot feature importance for Team 1
plt.figure(figsize=(10, 6))
sns.barplot(x='Importance', y='Feature', data=team_1_feature_importance_df)
plt.title('Feature Importance for Team 1 Model')
plt.show()

# Plot feature importance for Team 2
plt.figure(figsize=(10, 6))
sns.barplot(x='Importance', y='Feature', data=team_2_feature_importance_df)
plt.title('Feature Importance for Team 2 Model')
plt.show()