import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, accuracy_score, make_scorer
from sklearn.model_selection import GridSearchCV, TimeSeriesSplit
from xgboost import XGBRegressor
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

# ---  Add Rolling Averages Based on Last 10 Games ---
match_df = match_df.sort_values(by=["team_1", "date"])
rolling_features = ["gf", "ga", "xg", "xga", "poss", "sh", "sot", "cmp%", "ast", "kp", "sca", "gca", "tkl", "team_age",
                    "sh_opponent", "sot_opponent", "cmp%_opponent", "ast_opponent", "kp_opponent", "sca_opponent", "gca_opponent",
                    "tkl_opponent", "team_age_opponent"]
for feature in rolling_features:
    match_df[f"team_1_{feature}_rolling"] = (
        match_df.groupby("team_1")[feature].rolling(window=10, min_periods=1).mean().reset_index(0, drop=True)
    )
    match_df[f"team_2_{feature}_rolling"] = (
        match_df.groupby("team_2")[feature].rolling(window=10, min_periods=1).mean().reset_index(0, drop=True)
    )

base_features = ["is_home_team1", "hour", "day_code"]
rolling_feature_columns = [
    f"team_1_{feature}_rolling" for feature in rolling_features
] + [
    f"team_2_{feature}_rolling" for feature in rolling_features
]
features = base_features + rolling_feature_columns

# ---  Split Data into Training (Pre-2023), Validation (2023), and Test (2024) ---
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
    return grid_search.best_params_, -grid_search.best_score_

rf_param_grid = {
    "n_estimators": [350, 400, 450],
    "max_depth": [9, 10, 11],
    "min_samples_split": [2, 3, 4],
    "min_samples_leaf": [1, 2, 4],
    "max_features": ["sqrt", "log2", None],
    "bootstrap": [True, False]
}

xgb_param_grid = {
    "n_estimators": [75, 100, 125],
    "learning_rate": [0.025, 0.05, 0.075],
    "max_depth": [3, 4, 5],
    "subsample": [0.6, 0.8, 1.0],
    "colsample_bytree": [0.6, 0.8, 1.0],
    "min_child_weight": [1, 3, 5],
    "reg_alpha": [0, 0.01, 0.1],
    "reg_lambda": [1, 1.5, 2]
}

# --- Perform Grid Search and Refit for Each Model ---
# Random Forest (Team 1)
rf_team_1_params, rf_team_1_score = perform_grid_search(
    RandomForestRegressor(random_state=42),
    rf_param_grid,
    X_train,
    y_train_team_1
)
rf_team_1 = RandomForestRegressor(random_state=42, **rf_team_1_params)
rf_team_1.fit(X_train, y_train_team_1)
print(f"Best RF Params (Team 1): {rf_team_1_params}")

# Random Forest (Team 2)
rf_team_2_params, rf_team_2_score = perform_grid_search(
    RandomForestRegressor(random_state=42),
    rf_param_grid,
    X_train,
    y_train_team_2
)
rf_team_2 = RandomForestRegressor(random_state=42, **rf_team_2_params)
rf_team_2.fit(X_train, y_train_team_2)
print(f"Best RF Params (Team 2): {rf_team_2_params}")


# XGBoost (Team 1)
xgb_team_1_params, xgb_team_1_score = perform_grid_search(
    XGBRegressor(random_state=42, objective="reg:squarederror"),
    xgb_param_grid,
    X_train,
    y_train_team_1
)
xgb_team_1 = XGBRegressor(random_state=42, objective="reg:squarederror", **xgb_team_1_params)
xgb_team_1.fit(X_train, y_train_team_1)
print(f"Best XGB Params (Team 1): {xgb_team_1_params}")

# XGBoost (Team 2)
xgb_team_2_params, xgb_team_2_score = perform_grid_search(
    XGBRegressor(random_state=42, objective="reg:squarederror"),
    xgb_param_grid,
    X_train,
    y_train_team_2
)
xgb_team_2 = XGBRegressor(random_state=42, objective="reg:squarederror", **xgb_team_2_params)
xgb_team_2.fit(X_train, y_train_team_2)
print(f"Best XGB Params (Team 2): {xgb_team_2_params}")

with open("rf_team_1.pkl", "wb") as f:
    pickle.dump(rf_team_1, f)
with open("rf_team_2.pkl", "wb") as f:
    pickle.dump(rf_team_2, f)
with open("xgb_team_1.pkl", "wb") as f:
    pickle.dump(xgb_team_1, f)
with open("xgb_team_2.pkl", "wb") as f:
    pickle.dump(xgb_team_2, f)
print("All models saved successfully!")

# --- Evaluate on Validation Set ---
def evaluate_model(model, X, y_true):
    y_pred = model.predict(X)
    mae = mean_absolute_error(y_true, y_pred)
    mse = mean_squared_error(y_true, y_pred)
    r2 = r2_score(y_true, y_pred)
    return {"MAE": mae, "MSE": mse, "R2": r2}

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

# Evaluate the best models based on validation set
rf_team_1_metrics = evaluate_model(rf_team_1, X_val, y_val_team_1)
rf_team_2_metrics = evaluate_model(rf_team_2, X_val, y_val_team_2)
xgb_team_1_metrics = evaluate_model(xgb_team_1, X_val, y_val_team_1)
xgb_team_2_metrics = evaluate_model(xgb_team_2, X_val, y_val_team_2)

print("Random Forest (Team 1) Validation Metrics:", rf_team_1_metrics)
print("Random Forest (Team 2) Validation Metrics:", rf_team_2_metrics)
print("XGBoost (Team 1) Validation Metrics:", xgb_team_1_metrics)
print("XGBoost (Team 2) Validation Metrics:", xgb_team_2_metrics)

# Choose champion models
champion_models = {}

if rf_team_1_metrics["MAE"] < xgb_team_1_metrics["MAE"]:
    champion_models["team_1"] = {"name": "Random Forest", "model": rf_team_1}
else:
    champion_models["team_1"] = {"name": "XGBoost", "model": xgb_team_1}

if rf_team_2_metrics["MAE"] < xgb_team_2_metrics["MAE"]:
    champion_models["team_2"] = {"name": "Random Forest", "model": rf_team_2}
else:
    champion_models["team_2"] = {"name": "XGBoost", "model": xgb_team_2}

for team, info in champion_models.items():
    print(f"Champion Model for {team}: {info['name']}")


team_1_test_pred = champion_models["team_1"]["model"].predict(X_test)
team_2_test_pred = champion_models["team_2"]["model"].predict(X_test)

print("Predictions made using the loaded models.")

# --- Test the Champion Models ---
team_1_test_pred = champion_models["team_1"]["model"].predict(X_test)
team_2_test_pred = champion_models["team_2"]["model"].predict(X_test)


# --- Predict Match Results ---
draw_buffer = .3
test_data["predicted_result"] = [
    "W" if team_1_test_pred[i] > team_2_test_pred[i] + draw_buffer else
    ("L" if team_1_test_pred[i] + draw_buffer < team_2_test_pred[i] else "D")
    for i in range(len(team_1_test_pred))
]

actual_results = [
    "W" if y_test_team_1.iloc[i] > y_test_team_2.iloc[i] + draw_buffer else
    ("L" if y_test_team_1.iloc[i] + draw_buffer < y_test_team_2.iloc[i] else "D")
    for i in range(len(y_test_team_1))
]

# --- Calculate Accuracy ---
test_accuracy = accuracy_score(actual_results, test_data["predicted_result"])
print(f"Final Test Accuracy: {test_accuracy:.2f}")

# --- Visualize Confusion Matrix ---
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
    else:
        raise ValueError("Unsupported model type for feature importance extraction.")

    return pd.DataFrame({"Feature": features, "Importance": importance}).sort_values(by="Importance", ascending=False)

# Extract feature importance for champion models
team_1_feature_importance_df = extract_feature_importance(
    champion_models["team_1"]["model"], X_test.columns
)
team_2_feature_importance_df = extract_feature_importance(
    champion_models["team_2"]["model"], X_test.columns
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
