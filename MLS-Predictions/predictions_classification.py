import pandas as pd
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.metrics import accuracy_score, make_scorer, f1_score, classification_report, confusion_matrix
from sklearn.model_selection import GridSearchCV, TimeSeriesSplit
from xgboost import XGBClassifier
from imblearn.over_sampling import ADASYN
import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
import pickle

match_df = pd.read_csv("/Users/connerjamison/VSCode/GitHub/Projects/MLS-Predictions/MLS_cleaned.csv")
#match_df = pd.read_csv(r"C:\Users\mailt\Documents\GitHub\Projects\MLS-Predictions\MLS_cleaned.csv")

match_df["date"] = pd.to_datetime(match_df["date"], errors="coerce")

# Create team_1 and team_2 columns from is_home perspective
match_df["team_1"] = np.where(match_df["is_home"] == 1, match_df["team"], match_df["opponent"])
match_df["team_2"] = np.where(match_df["is_home"] == 1, match_df["opponent"], match_df["team"])

def assign_perspective(row):
    if row["is_home"] == 1:
        row["team_1_gf"] = row["gf"]
        row["team_1_ga"] = row["ga"]
        row["team_1_xg"] = row["xg"]
        row["team_1_xga"] = row["xga"]
        row["team_2_gf"] = row["ga"]
        row["team_2_ga"] = row["gf"]
        row["team_2_xg"] = row["xga"]
        row["team_2_xga"] = row["xg"]
        row["team_1_poss"] = row["poss"]
        row["team_1_ast"] = row["ast"]
        row["team_2_ast"] = row["ast_opponent"]
        row["team_1_gca"] = row["gca"]
        row["team_2_gca"] = row["gca_opponent"]
    else:
        row["team_1_gf"] = row["ga"]
        row["team_1_ga"] = row["gf"]
        row["team_1_xg"] = row["xga"]
        row["team_1_xga"] = row["xg"]
        row["team_2_gf"] = row["gf"]
        row["team_2_ga"] = row["ga"]
        row["team_2_xg"] = row["xg"]
        row["team_2_xga"] = row["xga"]
        row["team_2_poss"] = row["poss"]
        row["team_2_ast"] = row["ast"]
        row["team_1_ast"] = row["ast_opponent"]
        row["team_2_gca"] = row["gca"]
        row["team_1_gca"] = row["gca_opponent"]
    return row

match_df = match_df.apply(assign_perspective, axis=1)

match_df = match_df.dropna(subset=["result"])
match_df = match_df.fillna(0)

# Create a corrected result column based on gf and ga
match_df["correct_result"] = match_df.apply(
    lambda row: "D" if row["gf"] == row["ga"]
    else "W" if row["gf"] > row["ga"]
    else "L",
    axis=1
)

match_df["result"] = match_df["correct_result"]

new_columns = {}

match_df = match_df.sort_values(by=["team_1", "date"])
rolling_features = ["team_1_gf", "team_1_ga", "team_1_xg", "team_1_xga", "team_1_poss", "team_1_ast", "team_1_gca"]
for feature in rolling_features:
    new_columns[f"{feature}_rolling"] = (
        match_df.groupby("team_1")[feature]
        .transform(lambda x: x.shift(1).rolling(window=10, min_periods=1).mean().fillna(0))
    )

match_df = match_df.sort_values(by=["team_2", "date"])
rolling_features_team2 = ["team_2_gf", "team_2_ga", "team_2_xg", "team_2_xga", "team_2_poss", "team_2_ast", "team_2_gca"]
for feature in rolling_features_team2:
    new_columns[f"{feature}_rolling"] = (
        match_df.groupby("team_2")[feature]
        .transform(lambda x: x.shift(1).rolling(window=10, min_periods=1).mean().fillna(0))
    )

new_columns["team_1_goal_diff_rolling"] = (
    new_columns["team_1_gf_rolling"] - new_columns["team_1_ga_rolling"]
)
new_columns["team_2_goal_diff_rolling"] = (
    new_columns["team_2_gf_rolling"] - new_columns["team_2_ga_rolling"]
)
new_columns["team_1_xg_diff_rolling"] = (
    new_columns["team_1_xg_rolling"] - new_columns["team_1_xga_rolling"]
)
new_columns["team_2_xg_diff_rolling"] = (
    new_columns["team_2_xg_rolling"] - new_columns["team_2_xga_rolling"]
)

match_df = pd.concat([match_df, pd.DataFrame(new_columns)], axis=1)
match_df = match_df.copy()

match_df["result"] = match_df.apply(
    lambda row: "D" if row["team_1_gf"] == row["team_2_gf"]
    else ("W" if row["team_1_gf"] > row["team_2_gf"] else "L"),
    axis=1
)

def map_result_to_target(r):
    return 2 if r == "W" else (1 if r == "D" else 0)

match_df["target"] = match_df["result"].apply(map_result_to_target)

# Calculate the distribution of the target variable
target_counts = match_df["target"].value_counts()
target_percentages = match_df["target"].value_counts(normalize=True) * 100

distribution_df = pd.DataFrame({
    "Counts": target_counts,
    "Percentage (%)": target_percentages
})

print("\nOverall Class Distribution:")
print(distribution_df)
print()

base_features = ["hour", "day_code"]
team_1_rolling_features = [
    "team_1_gf_rolling", "team_1_ga_rolling", "team_1_xg_rolling",
    "team_1_xga_rolling", "team_1_poss_rolling", "team_1_ast_rolling",
    "team_1_gca_rolling"
]

team_2_rolling_features = [
    "team_2_gf_rolling", "team_2_ga_rolling", "team_2_xg_rolling",
    "team_2_xga_rolling", "team_2_poss_rolling", "team_2_ast_rolling",
    "team_2_gca_rolling"
]

difference_columns = [
    "team_1_goal_diff_rolling", "team_2_goal_diff_rolling", "team_1_xg_diff_rolling", "team_2_xg_diff_rolling"
]

all_features = base_features + team_1_rolling_features + team_2_rolling_features + difference_columns

# ---  Split Data into Training and Test ---
match_df["year"] = pd.to_datetime(match_df["date"]).dt.year

train_subset = match_df[(match_df["year"] >= 2020) & (match_df["year"] <= 2022)]
test_data = match_df[match_df["year"] >= 2023]

train_subset = train_subset.dropna(subset=all_features)
test_data = test_data.dropna(subset=all_features)

X_train = train_subset[all_features]
y_train = train_subset["target"]

adasyn = ADASYN(random_state=42)
X_train, y_train = adasyn.fit_resample(X_train, y_train)

X_test = test_data[all_features]
y_test = test_data["target"]

scorer = make_scorer(f1_score, average='macro')

def perform_grid_search(model, param_grid, X_train, y_train, n_splits=5):
    tscv = TimeSeriesSplit(n_splits=n_splits)
    grid_search = GridSearchCV(
        estimator=model,
        param_grid=param_grid,
        scoring=scorer,
        cv=tscv,
        verbose=1,
        n_jobs=-1
    )
    grid_search.fit(X_train, y_train)
    return grid_search.best_estimator_, grid_search.best_params_, grid_search.best_score_

rf_param_grid = {
    "n_estimators": [125, 150, 175],
    "max_depth": [10, 17, 18, 20],
    "min_samples_split": [2, 3, 4],
    "min_samples_leaf": [2, 3]
}

xgb_param_grid = {
    "n_estimators": [300, 350],
    "learning_rate": [0.075, 0.01],
    "max_depth": [2],
    "subsample": [0.1, 0.25],
    "colsample_bytree": [0.04, 0.06],
    "min_child_weight": [4, 5],
    "reg_alpha": [0, 0.005],
    "reg_lambda": [0.5, 1]
}

rf_classifier, rf_best_params, rf_best_score = perform_grid_search(
    RandomForestClassifier(random_state=42),
    rf_param_grid,
    X_train,
    y_train
)
print(f"Best RF Params: {rf_best_params}, Best Score: {rf_best_score:.4f}\n")

xgb_classifier, xgb_best_params, xgb_best_score = perform_grid_search(
    XGBClassifier(random_state=42),
    xgb_param_grid,
    X_train,
    y_train
)
print(f"Best XGB Params: {xgb_best_params}, Best Score: {xgb_best_score:.4f}")

def evaluate_model(model, X_test, y_test):
    y_pred = model.predict(X_test)
    print(classification_report(y_test, y_pred, target_names=["Loss", "Draw", "Win"]))
    accuracy = accuracy_score(y_test, y_pred)
    print(f"Accuracy: {accuracy:.4f}\n")
    return accuracy

print("\nRandom Forest Classifier Performance:")
rf_test_accuracy = evaluate_model(rf_classifier, X_test, y_test)

print("\nXGBoost Classifier Performance:")
xgb_test_accuracy = evaluate_model(xgb_classifier, X_test, y_test)

ensemble_model = VotingClassifier(
    estimators=[
        ("rf", rf_classifier),
        ("xgb", xgb_classifier)  # Ensure xgb_classifier is trained and available
    ],
    voting="soft"
)
ensemble_model.fit(X_train, y_train)

"""
with open("best_classifier.pkl", "wb") as f:
    pickle.dump(best_model, f)

with open("best_classifier.pkl", "rb") as f:
    loaded_model = pickle.load(f)

# Predict on new data
new_predictions = loaded_model.predict(X_test)
print(new_predictions)
"""
test_pred = ensemble_model.predict(X_test)

print("Emsemble Model Performance: ")
final_accuracy = evaluate_model(ensemble_model, X_test, y_test)

matches = (test_pred == y_test).sum()
print(f"Total Matches Correct: {matches}/{len(y_test)}")

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
prediction_distribution = Counter(test_pred)
print("\nPrediction Distribution:", {int(k): int(v) for k, v in prediction_distribution.items()})

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
feature_importance_rf = extract_feature_importance(
    rf_classifier, X_test.columns
)
feature_importance_xgb = extract_feature_importance(
    xgb_classifier, X_test.columns
)

# Plot feature importance for Team 1
plt.figure(figsize=(10, 6))
sns.barplot(x="Importance", y="Feature", data=feature_importance_rf)
plt.title("Feature Importance for Random Forest Model")
plt.show()

# Plot feature importance for Team 2
plt.figure(figsize=(10, 6))
sns.barplot(x="Importance", y="Feature", data=feature_importance_xgb)
plt.title("Feature Importance for XGBoost Model")
plt.show()
