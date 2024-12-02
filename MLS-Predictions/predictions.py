import pandas as pd
from sklearn.model_selection import train_test_split, GridSearchCV, PredefinedSplit
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, accuracy_score
from xgboost import XGBRegressor
import numpy as np
import random
import pickle

# ---  Load Data ---
match_df = pd.read_csv("MLS_cleaned.csv")

# Assign Neutral Labels (Team 1 and Team 2)
match_df["team_1"] = match_df.apply(lambda row: row["team"] if row["is_home"] == 1 else row["opponent"], axis=1)
match_df["team_2"] = match_df.apply(lambda row: row["opponent"] if row["is_home"] == 1 else row["team"], axis=1)

# Assign Home/Away Flags
match_df["is_home_team1"] = match_df["is_home"]
match_df["is_home_team2"] = match_df["is_home"].apply(lambda x: 0 if x == 1 else 1)  # Reverse of is_home

match_df["date"] = pd.to_datetime(match_df["date"], errors="coerce")
if match_df["date"].isna().any():
    raise ValueError("Invalid dates found in the 'date' column.")

# ---  Add Rolling Averages Based on Last 5 Games ---
match_df = match_df.sort_values(by=["team_1", "date"])
rolling_features = ["gf", "ga", "xg", "xga", "poss", "sh", "sot", "cmp%", "ast", "kp", "sca", "gca", "tkl", "blocks", "int", "clr", "team_age",
                    "sh_opponent", "sot_opponent", "cmp%_opponent", "ast_opponent", "kp_opponent", "sca_opponent", "gca_opponent",
                    "tkl_opponent", "blocks_opponent", "int_opponent", "clr_opponent", "team_age_opponent"]
for feature in rolling_features:
    match_df[f"team_1_{feature}_rolling"] = (
        match_df.groupby("team_1")[feature].rolling(window=5, min_periods=1).mean().reset_index(0, drop=True)
    )
    match_df[f"team_2_{feature}_rolling"] = (
        match_df.groupby("team_2")[feature].rolling(window=5, min_periods=1).mean().reset_index(0, drop=True)
    )

base_features = ["is_home_team1", "is_home_team2","hour", "day_code"]
rolling_feature_columns = [
    f"team_1_{feature}_rolling" for feature in rolling_features
] + [
    f"team_2_{feature}_rolling" for feature in rolling_features
]
features = base_features + rolling_feature_columns

# ---  Split Data into Training (Pre-2023) and Test (2024) ---
match_df["year"] = pd.to_datetime(match_df["date"]).dt.year
train_subset = match_df[match_df["year"] < 2023]
val_subset = match_df[match_df["year"] == 2023]
test_data = match_df[match_df["year"] == 2024]

train_subset = train_subset.dropna(subset=features)
val_subset = val_subset.dropna(subset=features)
test_data = test_data.dropna(subset=features)

target_team_1 = "gf"
target_team_2 = "ga"

X_train = train_subset[features]
y_train_team_1 = train_subset[target_team_1]
y_train_team_2 = train_subset[target_team_2]

X_val = val_subset[features]
y_val_team_1 = val_subset[target_team_1]
y_val_team_2 = val_subset[target_team_2]

X_test = test_data[features]
y_test_team_1 = test_data[target_team_1]
y_test_team_2 = test_data[target_team_2]

def tune_model(model, param_grid, X_train, y_train, X_val, y_val):
    best_model = None
    best_score = float("inf")
    best_params = None

    for params in param_grid:
        model_instance = model.__class__(**params)  # Create a new instance for each parameter set
        model_instance.fit(X_train, y_train)
        y_pred = model_instance.predict(X_val)
        score = mean_absolute_error(y_val, y_pred)

        if score < best_score:
            best_model = model_instance
            best_score = score
            best_params = params

    return best_model, best_params, best_score

# Define Parameter Grids
rf_param_grid = [
    {"n_estimators": n, "max_depth": d, "min_samples_split": s}
    for n in [300, 350, 400]
    for d in [8, 9, 10]
    for s in [2, 3, 4]
]

xgb_param_grid = [
    {"n_estimators": n, "learning_rate": lr, "max_depth": d}
    for n in [100, 125, 150]
    for lr in [0.05, 0.1, 0.15]
    for d in [4, 5, 6]
]

# Tune Random Forest (Team 1)
rf_team_1, rf_team_1_params, rf_team_1_score = tune_model(
    RandomForestRegressor(random_state=42), rf_param_grid, X_train, y_train_team_1, X_val, y_val_team_1
)
print(f"Best RF Params (Team 1): {rf_team_1_params}, MAE: {rf_team_1_score:.4f}")

# Tune Random Forest (Team 2)
rf_team_2, rf_team_2_params, rf_team_2_score = tune_model(
    RandomForestRegressor(random_state=42), rf_param_grid, X_train, y_train_team_2, X_val, y_val_team_2
)
print(f"Best RF Params (Team 2): {rf_team_2_params}, MAE: {rf_team_2_score:.4f}")

# Tune XGBoost (Team 1)
xgb_team_1, xgb_team_1_params, xgb_team_1_score = tune_model(
    XGBRegressor(random_state=42, objective="reg:squarederror"), xgb_param_grid, X_train, y_train_team_1, X_val, y_val_team_1
)
print(f"Best XGB Params (Team 1): {xgb_team_1_params}, MAE: {xgb_team_1_score:.4f}")

# Tune XGBoost (Team 2)
xgb_team_2, xgb_team_2_params, xgb_team_2_score = tune_model(
    XGBRegressor(random_state=42, objective="reg:squarederror"), xgb_param_grid, X_train, y_train_team_2, X_val, y_val_team_2
)
print(f"Best XGB Params (Team 2): {xgb_team_2_params}, MAE: {xgb_team_2_score:.4f}")

# --- Evaluate on Test Set ---
def evaluate_model(model, X, y_true):
    y_pred = model.predict(X)
    mae = mean_absolute_error(y_true, y_pred)
    mse = mean_squared_error(y_true, y_pred)
    r2 = r2_score(y_true, y_pred)
    return {"MAE": mae, "MSE": mse, "R2": r2}

# Evaluate the best models
rf_team_1_metrics = evaluate_model(rf_team_1, X_test, y_test_team_1)
rf_team_2_metrics = evaluate_model(rf_team_2, X_test, y_test_team_2)
xgb_team_1_metrics = evaluate_model(xgb_team_1, X_test, y_test_team_1)
xgb_team_2_metrics = evaluate_model(xgb_team_2, X_test, y_test_team_2)

print("RF Team 1 Test Metrics:", rf_team_1_metrics)
print("RF Team 2 Test Metrics:", rf_team_2_metrics)
print("XGB Team 1 Test Metrics:", xgb_team_1_metrics)
print("XGB Team 2 Test Metrics:", xgb_team_2_metrics)

def select_champion(metrics_rf, metrics_xgb):
    # Example: prioritize MAE, then R2
    if metrics_rf["MAE"] < metrics_xgb["MAE"]:
        return "Random Forest", metrics_rf
    elif metrics_xgb["MAE"] < metrics_rf["MAE"]:
        return "XGBoost", metrics_xgb
    else:  # Tie-breaker: higher R2
        return ("Random Forest", metrics_rf) if metrics_rf["R2"] > metrics_xgb["R2"] else ("XGBoost", metrics_xgb)

champion_team_1_model_name, champion_team_1_metrics = select_champion(rf_team_1_metrics, xgb_team_1_metrics)
champion_team_2_model_name, champion_team_2_metrics = select_champion(rf_team_2_metrics, xgb_team_2_metrics)

print("Champion Model for Team 1:", champion_team_1_model_name, "Metrics:", champion_team_1_metrics)
print("Champion Model for Team 2:", champion_team_2_model_name, "Metrics:", champion_team_2_metrics)

champion_team_1_model = rf_team_1 if champion_team_1_model_name == "Random Forest" else xgb_team_1
champion_team_2_model = rf_team_2 if champion_team_2_model_name == "Random Forest" else xgb_team_2

# --- 2. Test the Champion Models ---
# Predictions on the test set
team_1_test_pred = champion_team_1_model.predict(X_test)
team_2_test_pred = champion_team_2_model.predict(X_test)

# --- 3. Predict Match Results ---
# Determine the predicted match result (Win/Draw/Loss)
test_data["predicted_result"] = [
    "W" if team_1_test_pred[i] > team_2_test_pred[i] + 0.4 else
    ("L" if team_1_test_pred[i] + 0.4 < team_2_test_pred[i] else "D")
    for i in range(len(team_1_test_pred))
]

# Determine the actual match result (Win/Draw/Loss) with the same logic
actual_results = [
    "W" if y_test_team_1.iloc[i] > y_test_team_2.iloc[i] + 0.4 else
    ("L" if y_test_team_1.iloc[i] + 0.4 < y_test_team_2.iloc[i] else "D")
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
if hasattr(champion_team_1_model_name, 'feature_importances_'):
    team_1_feature_importance = champion_team_1_model_name.feature_importances_
else:
    team_1_feature_importance = champion_team_1_model_name.get_booster().get_score(importance_type='weight')

if hasattr(champion_team_2_model_name, 'feature_importances_'):
    team_2_feature_importance = champion_team_2_model_name.feature_importances_
else:
    team_2_feature_importance = champion_team_2_model_name.get_booster().get_score(importance_type='weight')

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
