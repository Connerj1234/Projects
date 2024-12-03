import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, make_scorer, classification_report, confusion_matrix
from sklearn.model_selection import GridSearchCV, TimeSeriesSplit
from xgboost import XGBClassifier
from imblearn.over_sampling import SMOTE
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

# ---  Add Rolling Averages Based on Last 10 Games ---
rolling_features = ["gf", "ga", "xg", "xga", "poss", "sh", "sot", "cmp%", "ast", "kp", "sca", "gca", "tkl", "team_age",
                    "sh_opponent", "sot_opponent", "cmp%_opponent", "ast_opponent", "kp_opponent", "sca_opponent", "gca_opponent",
                    "tkl_opponent", "team_age_opponent"]

match_df = match_df.sort_values(by=["team_1", "date"])

for feature in rolling_features:
    match_df[f"team_1_{feature}_rolling"] = (
        match_df.groupby("team_1")[feature].apply(lambda x: x.shift(1).rolling(window=10, min_periods=1).mean())
    ).reset_index(level=0, drop=True)

    match_df[f"team_2_{feature}_rolling"] = (
        match_df.groupby("team_2")[feature].apply(lambda x: x.shift(1).rolling(window=10, min_periods=1).mean())
    ).reset_index(level=0, drop=True)

for feature in rolling_features:
    match_df[f"{feature}_diff"] = match_df[f"team_1_{feature}_rolling"] - match_df[f"team_2_{feature}_rolling"]

differential_feature_columns = [f"{feature}_diff" for feature in rolling_features]

base_features = ["is_home_team1", "hour", "day_code"]
features = base_features + differential_feature_columns

def map_result_to_target(row):
    if row["result"] == "D":
        return 1
    elif row["result"] == "W":
        return 2
    else:
        return 0

match_df["target"] = match_df.apply(map_result_to_target, axis=1)

# ---  Split Data into Training (<2023) and Test (2023-2024) ---
match_df["year"] = pd.to_datetime(match_df["date"]).dt.year
train_subset = match_df[match_df["year"] < 2023]
test_data = match_df[match_df["year"] >= 2023]

train_subset = train_subset.dropna(subset=features)
test_data = test_data.dropna(subset=features)

X_train = train_subset[features]
y_train = train_subset["target"]
y_train = y_train.astype("int")

X_test = test_data[features]
y_test = test_data["target"]
y_test = y_test.astype("int")

smote = SMOTE(random_state=42)
X_train, y_train = smote.fit_resample(X_train, y_train)

def perform_grid_search(model, param_grid, X_train, y_train, n_splits=5):
    tscv = TimeSeriesSplit(n_splits=n_splits)
    grid_search = GridSearchCV(
        estimator=model,
        param_grid=param_grid,
        scoring="accuracy",
        cv=tscv,
        verbose=1,
        n_jobs=-1
    )

    grid_search.fit(X_train, y_train)
    return grid_search.best_estimator_, grid_search.best_params_, -grid_search.best_score_

rf_param_grid = {
    "n_estimators": [100, 200, 300],
    #"max_depth": [5, 10, 15],
    #"min_samples_split": [2, 5, 10],
    #"min_samples_leaf": [1, 2, 4],
}

xgb_param_grid = {
    "n_estimators": [100, 200, 300],
    #"learning_rate": [0.01, 0.05, 0.1],
    #"max_depth": [3, 5, 7],
    #"subsample": [0.8, 1.0],
}

rf_classifier, rf_best_params, rf_best_score = perform_grid_search(
    RandomForestClassifier(random_state=42, class_weight="balanced"),
    rf_param_grid,
    X_train,
    y_train
)
print(f"Best RF Params: {rf_best_params}, Best Score: {rf_best_score:.4f}")

xgb_classifier, xgb_best_params, xgb_best_score = perform_grid_search(
    XGBClassifier(random_state=42, objective="multi:softmax", eval_metric="logloss", num_class=3),
    xgb_param_grid,
    X_train,
    y_train
)
print(f"Best XGB Params: {xgb_best_params}, Best Score: {xgb_best_score:.4f}")

def evaluate_model(model, X_test, y_test):
    y_pred = model.predict(X_test)
    print(classification_report(y_test, y_pred, target_names=["Loss", "Win", "Draw"]))
    accuracy = accuracy_score(y_test, y_pred)
    print(f"Accuracy: {accuracy:.4f}")
    return accuracy

print("\nRandom Forest Classifier Performance:")
rf_test_accuracy = evaluate_model(rf_classifier, X_test, y_test)

print("\nXGBoost Classifier Performance:")
xgb_test_accuracy = evaluate_model(xgb_classifier, X_test, y_test)

if rf_test_accuracy > xgb_test_accuracy:
    best_model = rf_classifier
    model_name = "Random Forest"
else:
    best_model = xgb_classifier
    model_name = "XGBoost"

print(f"\nBest Model: {model_name}")
"""
with open("best_classifier.pkl", "wb") as f:
    pickle.dump(best_model, f)

with open("best_classifier.pkl", "rb") as f:
    loaded_model = pickle.load(f)

# Predict on new data
new_predictions = loaded_model.predict(X_test)
print(new_predictions)
"""

test_pred = best_model.predict(X_test)

# Check if predictions match exactly
matches = (test_pred == y_test).sum()
print(f"\nTotal Matches Correct: {matches}/{len(y_test)}")



# --- Visualize Confusion Matrix ---
conf_matrix = confusion_matrix(y_test, test_pred)
conf_matrix_df = pd.DataFrame(
    conf_matrix,
    index=["Loss", "Draw", "Win"],
    columns=["Loss", "Draw", "Win"]
)

plt.figure(figsize=(8, 6))
sns.heatmap(conf_matrix_df, annot=True, fmt="d", cmap="Blues")
plt.title("Confusion Matrix for Match Result Predictions")
plt.ylabel("Actual Result")
plt.xlabel("Predicted Result")
plt.show()

from collections import Counter
print("\nPrediction Distribution:", Counter(test_pred))

from sklearn.metrics import classification_report
print(f"\n{classification_report(y_test, test_pred, target_names=["Loss", "Win", "Draw"])}")
