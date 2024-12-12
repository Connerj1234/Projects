import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, accuracy_score, make_scorer, classification_report, confusion_matrix, mean_squared_error, r2_score
from sklearn.model_selection import GridSearchCV, TimeSeriesSplit
from xgboost import XGBRegressor
import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
import pickle

# ---  Load Data ---
match_df = pd.read_csv("/Users/connerjamison/VSCode/GitHub/Projects/MLS-Predictions/MLS_cleaned.csv")

# Assign Neutral Labels (Team 1 and Team 2)
match_df["team_1"] = match_df.apply(lambda row: row["team"] if row["is_home"] == 1 else row["opponent"], axis=1)
match_df["team_2"] = match_df.apply(lambda row: row["opponent"] if row["is_home"] == 1 else row["team"], axis=1)

# Assign Home/Away Flags
match_df["is_home_team1"] = match_df["is_home"]
match_df["is_home_team2"] = match_df["is_home"].apply(lambda x: 0 if x == 1 else 1)

match_df["date"] = pd.to_datetime(match_df["date"], errors="coerce")

match_df = match_df.dropna(subset=["result"])

match_df["correct_result"] = match_df.apply(
    lambda row: "D" if row["gf"] == row["ga"]
    else "W" if row["gf"] > row["ga"]
    else "L",
    axis=1
)

match_df["result"] = match_df["correct_result"]
print(f"{match_df["result"].value_counts()}\n")

# ---  Add Rolling Averages Based on Last 10 Games ---
match_df = match_df.sort_values(by=["team_1", "date"])
rolling_features = ["gf", "ga", "xg", "xga", "ast", "gca",
                    "ast_opponent", "gca_opponent"]
for feature in rolling_features:
    match_df[f"team_1_{feature}_rolling"] = (
        match_df.groupby("team_1")[feature].rolling(window=10, min_periods=1).mean().fillna(0).reset_index(0, drop=True)
    )
    match_df[f"team_2_{feature}_rolling"] = (
        match_df.groupby("team_2")[feature].rolling(window=10, min_periods=1).mean().fillna(0).reset_index(0, drop=True)
    )

match_df["team_1_goal_diff_rolling"] = (
    match_df["team_1_gf_rolling"] - match_df["team_1_ga_rolling"]
)
match_df["team_2_goal_diff_rolling"] = (
    match_df["team_2_gf_rolling"] - match_df["team_2_ga_rolling"]
)

rolling_feature_columns = [
    f"team_1_{feature}_rolling" for feature in rolling_features
] + [
    f"team_2_{feature}_rolling" for feature in rolling_features
] + [
    "team_1_goal_diff_rolling", "team_2_goal_diff_rolling"
]

base_features = ["is_home_team1", "hour", "day_code"]
features = base_features + rolling_feature_columns

# ---  Split Data into Training and Test ---
match_df["year"] = pd.to_datetime(match_df["date"]).dt.year

train_subset = match_df[(match_df["year"] >= 2020) & (match_df["year"] <= 2022)]
test_data = match_df[match_df["year"] >= 2023]

train_subset = train_subset.dropna(subset=features)
test_data = test_data.dropna(subset=features)

target_team_1 = "gf"
target_team_2 = "ga"

X_train = train_subset[features]
y_train_team_1 = train_subset[target_team_1]
y_train_team_2 = train_subset[target_team_2]

X_test = test_data[features]
y_test_team_1 = test_data[target_team_1]
y_test_team_2 = test_data[target_team_2]

mae_scorer = make_scorer(mean_absolute_error, greater_is_better=False)

# Function to perform GridSearchCV with TimeSeriesSplit
def perform_grid_search(model, param_grid, X_train, y_train, n_splits=5):
    tscv = TimeSeriesSplit(n_splits=n_splits)
    grid_search = GridSearchCV(
        estimator=model,
        param_grid=param_grid,
        scoring=mae_scorer,
        cv=tscv,
        verbose=1,
        n_jobs=-1
    )
    grid_search.fit(X_train, y_train)
    return grid_search.best_estimator_, grid_search.best_params_, -grid_search.best_score_

rf_param_grid = {
    "n_estimators": [250, 275, 300],
    "max_depth": [6, 10],
    "min_samples_split": [2],
    "min_samples_leaf": [9, 10],
}
xgb_param_grid = {
    "n_estimators": [100, 125, 150],
    "learning_rate": [0.05, 0.0625, 0.075],
    "max_depth": [2],
    "subsample": [0.3, 0.5, 0.7],
    "colsample_bytree": [0.6, 0.75, 0.9],
    "min_child_weight": [5, 7],
    "reg_alpha": [0, 0.005],
    "reg_lambda": [0.5, 1, 1.5]
}

# --- Perform Grid Search and Refit for Each Model ---
# Random Forest (Team 1)
rf_team_1_model, rf_team_1_params, rf_team_1_score = perform_grid_search(
    RandomForestRegressor(random_state=42),
    rf_param_grid,
    X_train,
    y_train_team_1
)
print(f"Best RF Params (Team 1): {rf_team_1_params}\n")

# Random Forest (Team 2)
rf_team_2_model, rf_team_2_params, rf_team_2_score = perform_grid_search(
    RandomForestRegressor(random_state=42),
    rf_param_grid,
    X_train,
    y_train_team_2
)
print(f"Best RF Params (Team 2): {rf_team_2_params}\n")

# XGBoost (Team 1)
xgb_team_1_model, xgb_team_1_params, xgb_team_1_score = perform_grid_search(
    XGBRegressor(random_state=42, objective="reg:squarederror"),
    xgb_param_grid,
    X_train,
    y_train_team_1
)
print(f"Best XGB Params (Team 1): {xgb_team_1_params}\n")

# XGBoost (Team 2)
xgb_team_2_model, xgb_team_2_params, xgb_team_2_score = perform_grid_search(
    XGBRegressor(random_state=42, objective="reg:squarederror"),
    xgb_param_grid,
    X_train,
    y_train_team_2
)
print(f"Best XGB Params (Team 2): {xgb_team_2_params}\n")
"""
with open("rf_team_1.pkl", "wb") as f:
    pickle.dump(rf_team_1_model, f)
with open("rf_team_2.pkl", "wb") as f:
    pickle.dump(rf_team_2_model, f)
with open("xgb_team_1.pkl", "wb") as f:
    pickle.dump(xgb_team_1_model, f)
with open("xgb_team_2.pkl", "wb") as f:
    pickle.dump(xgb_team_2_model, f)
print("\nAll models saved successfully!")
"""
# --- Evaluate on Test Set ---
def evaluate_model(model, X, y_true):
    y_pred = model.predict(X)
    mae = mean_absolute_error(y_true, y_pred)
    return f"{mae:.4f}"

"""
with open("rf_team_1.pkl", "rb") as f:
    rf_team_1 = pickle.load(f)
with open("rf_team_2.pkl", "rb") as f:
    rf_team_2 = pickle.load(f)
with open("xgb_team_1.pkl", "rb") as f:
    xgb_team_1 = pickle.load(f)
with open("xgb_team_2.pkl", "rb") as f:
    xgb_team_2 = pickle.load(f)

print("All models loaded successfully!")
"""

# Evaluate the best models based on full training set
rf_team_1_metrics = evaluate_model(rf_team_1_model, X_test, y_test_team_1)
rf_team_2_metrics = evaluate_model(rf_team_2_model, X_test, y_test_team_2)
xgb_team_1_metrics = evaluate_model(xgb_team_1_model, X_test, y_test_team_1)
xgb_team_2_metrics = evaluate_model(xgb_team_2_model, X_test, y_test_team_2)

print("Random Forest (Team 1) MAE:", rf_team_1_metrics)
print("Random Forest (Team 2) MAE:", rf_team_2_metrics)
print("\nXGBoost (Team 1) MAE:", xgb_team_1_metrics)
print("XGBoost (Team 2) MAE:", xgb_team_2_metrics)

# Choose champion models
if rf_team_1_metrics < xgb_team_1_metrics:
    champion_model1 = rf_team_1_model
    model_name1 = "Random Forest"
else:
    champion_model1 = xgb_team_1_model
    model_name1 = "XGBoost"

if rf_team_2_metrics < xgb_team_2_metrics:
    champion_model2 = rf_team_2_model
    model_name2 = "Random Forest"
else:
    champion_model2 = xgb_team_2_model
    model_name2 = "XGBoost"

print(f"\nBest Model (Team 1): {model_name1}")
print(f"Best Model (Team 2): {model_name1}\n")

# --- Test the Champion Models ---
team_1_test_pred = champion_model1.predict(X_test)
team_2_test_pred = champion_model2.predict(X_test)

# --- Predict Match Results + Accuracy ---
for buffer in [0.05, 0.075, 0.1]:
    test_data["predicted_result"] = [
        "W" if team_1_test_pred[i] > team_2_test_pred[i] + buffer else
        ("L" if team_1_test_pred[i] + buffer < team_2_test_pred[i] else "D")
        for i in range(len(team_1_test_pred))
    ]
    actual_results = [
        "W" if y_test_team_1.iloc[i] > y_test_team_2.iloc[i] + buffer else
        ("L" if y_test_team_1.iloc[i] + buffer < y_test_team_2.iloc[i] else "D")
        for i in range(len(y_test_team_1))
    ]
    accuracy = accuracy_score(actual_results, test_data["predicted_result"])
    print(f"Buffer: {buffer}, Accuracy: {accuracy:.2f}")

# --- Visualize Confusion Matrix ---
conf_matrix = confusion_matrix(actual_results, test_data["predicted_result"], labels=["W", "D", "L"])
conf_matrix_df = pd.DataFrame(conf_matrix, index=["W", "D", "L"], columns=["W", "D", "L"])

plt.figure(figsize=(8, 6))
sns.heatmap(conf_matrix_df, annot=True, fmt="d", cmap="Blues")
plt.title("Confusion Matrix for Match Result Predictions")
plt.ylabel("Actual Result")
plt.xlabel("Predicted Result")
plt.show()

# --- Feature Importance ---
def extract_feature_importance(model, features):
    importance = None
    if hasattr(model, "feature_importances_"):
        # RandomForest or any model with feature_importances_
        importance = model.feature_importances_
    elif hasattr(model, "get_booster"):
        # XGBoost-specific feature importance extraction
        booster = model.get_booster()
        importance_dict = booster.get_score(importance_type="weight")
        importance = [importance_dict.get(f, 0) for f in features]
    return pd.DataFrame({"Feature": features, "Importance": importance}).sort_values(by="Importance", ascending=False)

# Extract feature importance for champion models
team_1_feature_importance_df = extract_feature_importance(
    champion_model1, X_test.columns
)
team_2_feature_importance_df = extract_feature_importance(
    champion_model2, X_test.columns
)

# Plot feature importance for Team 1
plt.figure(figsize=(10, 6))
sns.barplot(x="Importance", y="Feature", data=team_1_feature_importance_df)
plt.title("Feature Importance for Team 1 Model")
plt.show()

# Plot feature importance for Team 2
plt.figure(figsize=(10, 6))
sns.barplot(x="Importance", y="Feature", data=team_2_feature_importance_df)
plt.title("Feature Importance for Team 2 Model")
plt.show()
