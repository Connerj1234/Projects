import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, accuracy_score, make_scorer, classification_report, confusion_matrix, mean_squared_error, r2_score
from sklearn.model_selection import GridSearchCV, TimeSeriesSplit
from xgboost import XGBRegressor
import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
import pickle

match_df = pd.read_csv("/Users/connerjamison/VSCode/GitHub/Projects/MLS-Predictions/MLS_cleaned.csv")

# Calculate the distribution of the result column
target_counts = match_df["result"].value_counts()
target_percentages = match_df["result"].value_counts(normalize=True) * 100

distribution_df = pd.DataFrame({
    "Counts": target_counts,
    "Percentage (%)": target_percentages
})

print("\nResult Distribution:")
print(distribution_df)
print()

# Assigns team_1 and team_2 columns based on is_home flag
match_df["team_1"] = match_df.apply(lambda row: row["team"] if row["is_home"] == 1 else row["opponent"], axis=1)
match_df["team_2"] = match_df.apply(lambda row: row["opponent"] if row["is_home"] == 1 else row["team"], axis=1)

# Assign home/away flags
match_df["is_home_team1"] = match_df["is_home"]
match_df["is_home_team2"] = match_df["is_home"].apply(lambda x: 0 if x == 1 else 1)

# Creates rolling window features for team_1 and team_2 based on the last 10 games
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

# Creates rolling window features for goal difference
match_df["team_1_goal_diff_rolling"] = (
    match_df["team_1_gf_rolling"] - match_df["team_1_ga_rolling"]
)
match_df["team_2_goal_diff_rolling"] = (
    match_df["team_2_gf_rolling"] - match_df["team_2_ga_rolling"]
)

# Combines all rolling features into a single list
rolling_feature_columns = [
    f"team_1_{feature}_rolling" for feature in rolling_features
] + [
    f"team_2_{feature}_rolling" for feature in rolling_features
] + [
    "team_1_goal_diff_rolling", "team_2_goal_diff_rolling"
]

base_features = ["is_home_team1", "hour", "day_code"]
features = base_features + rolling_feature_columns

# Split data into training and test
train_subset = match_df[(match_df["season"] >= 2020) & (match_df["season"] <= 2022)]
test_data = match_df[match_df["season"] >= 2023]

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
    "n_estimators": [350, 375, 400],
    "max_depth": [24, 27, 30],
    "min_samples_split": [2, 3],
    "min_samples_leaf": [2, 3]
}
xgb_param_grid = {
    "n_estimators": [275, 300, 325],
    "learning_rate": [0.075, 0.1],
    "max_depth": [9, 10, 11],
    "subsample": [0.8, 0.9],
    "colsample_bytree": [0.4, 0.5],
    "min_child_weight": [2, 3, 4],
    "reg_alpha": [0, 0.01],
    "reg_lambda": [0, 0.25]
}

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

# Evaluates models on Test Set based on MAE
def evaluate_model(model, X, y_true):
    y_pred = model.predict(X)
    mae = mean_absolute_error(y_true, y_pred)
    return f"{mae:.4f}"

# Evaluate all the models based on test set
rf_team_1_metrics = evaluate_model(rf_team_1_model, X_test, y_test_team_1)
rf_team_2_metrics = evaluate_model(rf_team_2_model, X_test, y_test_team_2)
xgb_team_1_metrics = evaluate_model(xgb_team_1_model, X_test, y_test_team_1)
xgb_team_2_metrics = evaluate_model(xgb_team_2_model, X_test, y_test_team_2)

print("Random Forest (Team 1) MAE:", rf_team_1_metrics)
print("Random Forest (Team 2) MAE:", rf_team_2_metrics)
print("\nXGBoost (Team 1) MAE:", xgb_team_1_metrics)
print("XGBoost (Team 2) MAE:", xgb_team_2_metrics)

# Choose champion models for both teams
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
print(f"Best Model (Team 2): {model_name2}\n")

"""
with open("best_model_team_1.pkl", "wb") as f:
    pickle.dump(champion_model1, f)
with open("best_model_team_2.pkl", "wb") as f:
    pickle.dump(champion_model2, f)
print("\nAll models saved successfully!")

with open("best_model_team_1.pkl", "rb") as f:
    champion_model1 = pickle.load(f)
with open("best_model_team_2.pkl", "rb") as f:
    champion_model2 = pickle.load(f)
print("All models loaded successfully!")
"""

# Test the champion models
team_1_test_pred = champion_model1.predict(X_test)
team_2_test_pred = champion_model2.predict(X_test)

# Predict match results + accuracy for different buffer values
best_buffer = None
highest_accuracy = 0
buffer_accuracies = {}
for buffer in [0.025, 0.05, 0.075]:
    test_data["predicted_result"] = [
        "W" if team_1_test_pred[i] > team_2_test_pred[i] + buffer else
        ("L" if team_1_test_pred[i] + buffer < team_2_test_pred[i] else "D")
        for i in range(len(team_1_test_pred))
    ]
    test_data["actual_results"] = [
        "W" if y_test_team_1.iloc[i] > y_test_team_2.iloc[i] + buffer else
        ("L" if y_test_team_1.iloc[i] + buffer < y_test_team_2.iloc[i] else "D")
        for i in range(len(y_test_team_1))
    ]
    accuracy = accuracy_score(test_data["actual_results"], test_data["predicted_result"])
    buffer_accuracies[buffer] = accuracy

    print(f"Buffer: {buffer}, Accuracy: {accuracy:.2f}")

    if accuracy > highest_accuracy:
        highest_accuracy = accuracy
        best_buffer = buffer

print(f"\nBest Buffer: {best_buffer}, Highest Accuracy: {highest_accuracy:.2f}")

# Use the best buffer for final predictions
test_data["final_predicted_result"] = [
    "W" if team_1_test_pred[i] > team_2_test_pred[i] + best_buffer else
    ("L" if team_1_test_pred[i] + best_buffer < team_2_test_pred[i] else "D")
    for i in range(len(team_1_test_pred))
]
test_data["actual_results"] = [
        "W" if y_test_team_1.iloc[i] > y_test_team_2.iloc[i] else
        ("L" if y_test_team_1.iloc[i] < y_test_team_2.iloc[i] else "D")
        for i in range(len(y_test_team_1))
    ]

matches = (test_data["final_predicted_result"] == test_data["actual_results"]).sum()
print(f"Total Matches Predicted Correctly: {matches}/{len(test_data['actual_results'])}\n")

# Generate and display classification report
report = classification_report(
    test_data["actual_results"],
    test_data["final_predicted_result"],
    labels=["W", "D", "L"],  # Specify the class order
    target_names=["Wins", "Draws", "Losses"]  # Optional: Human-readable class names
)
print("Classification Report:")
print(report)


# Visualize confusion matrix for match result predictions
conf_matrix = confusion_matrix(test_data["actual_results"], test_data["final_predicted_result"], labels=["W", "D", "L"])
conf_matrix_df = pd.DataFrame(conf_matrix, index=["W", "D", "L"], columns=["W", "D", "L"])

plt.figure(figsize=(8, 6))
sns.heatmap(conf_matrix_df, annot=True, fmt="d", cmap="Blues")
plt.title("Confusion Matrix for Match Result Predictions")
plt.ylabel("Actual Result")
plt.xlabel("Predicted Result")
plt.show()

# Feature importance extraction
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
