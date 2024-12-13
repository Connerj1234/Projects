# MLS Predictions Using ML

### Predicting Soccer Match Outcomes Using Python, Web Scraping, and Machine Learning

This project predicts soccer match outcomes using two complementary machine learning approaches: regression, to forecast the goals scored by both teams, and classification, to directly predict match results (win, draw, loss). By combining web-scraped match data with advanced machine learning techniques, we analyze match statistics, account for opponent difficulty, and develop predictive models to evaluate team performance.

## 1. Data Collection: Web Scraping with Beautiful Soup

Using Python's requests and BeautifulSoup libraries, we scrape match data from FBref.com. The data includes:

- Team performance metrics: goals scored (GF), goals conceded (GA), shots, shots on target, xG (expected goals), etc.

- Opponent statistics for each match, such as defensive strength, recent form, and rolling averages of key metrics.

This comprehensive dataset enables the models to account for both team strengths and the difficulty of their opponents.

## 2. Data Cleaning and Feature Engineering

We preprocess the scraped data using pandas, focusing on:

- Standardizing Team Names: Ensuring consistent naming across datasets for seamless merges.

- Incorporating Opponent Data: Adding rolling averages of key opponent metrics (e.g., goals conceded, shots faced, defensive actions) to evaluate match difficulty.

- Rolling Averages: Calculating rolling averages for the last ten games for both teams and their opponents to account for recent form.

- Venue Encoding: Encoding home and away matches with binary flags (is_home_team1, is_home_team2).

- Match Metadata: Extracting features such as match time and day of the week.

- Team Assignments (Regression): Teams were assigned as "Team 1" and "Team 2" based on home and away status to ensure neutrality and equal representation. Each match was duplicated in the dataset: one entry for the home team as Team 1 and another for the away team as Team 1. This neutral representation allowed the regression model to predict goals scored by both teams).

- Team Assignments (Classification): Matches were represented from the home team’s perspective only, with the home team always assigned as Team 1. This reduced the dataset size by eliminating duplication and aligned with the classification task of directly predicting match outcomes (win, draw, loss).

## 3. Machine Learning Framework

This project employs two distinct approaches to predict match outcomes:

### Regression Approach

The regression models predict the number of goals scored by each team (Team 1 and Team 2). Predicted scores are then compared to determine the match result.

### Classification Approach

The classification models directly predict match results (win, draw, loss) using a labeled target variable.

### Feature Selection:

Features used in modeling include:

- Team Performance Metrics: Rolling averages of goals scored (gf), goals conceded (ga), shots on target (sot), xG (xg), and xGA (xga).

- Opponent Metrics: Rolling averages of the opponent's goals conceded (opponent_ga_rolling), shots faced, and other defensive metrics.

- Home/Away Indicators: (is_home_team1, is_home_team2).

- Match Metadata: Hour of the match (hour), day of the week (day_code).

### Model Training:

We use the following machine learning models:

- Random Forest Regressor/Classifier: Captures complex interactions between features through ensemble decision trees.

- XGBoost Regressor/Classifier: A gradient-boosted decision tree model optimized for structured datasets.

### Opponent Data Integration:

Both regression and classification models incorporate rolling averages of opponent statistics (e.g., defensive strength, recent goals conceded) as predictive features. This allows the models to adjust predictions based on match difficulty, reflecting real-world conditions.

### Model Tuning:

We perform hyperparameter tuning using GridSearchCV to optimize model performance. Parameters such as n_estimators, max_depth, and learning_rate are tuned for each model.

## 4. Model Evaluation

To evaluate the models:

### Regression Models:

- Mean Absolute Error (MAE): Quantifies prediction accuracy for goals scored by both teams.

### Classification Models:

- Accuracy Score: Compares predicted match outcomes against actual match outcomes.

## 5. Match Outcome Predictions

Using the trained models:

### Regression Approach:

- Predict goals scored by Team 1 and Team 2.

- Compare predicted scores with a buffer threshold to determine match results (Win, Draw, Loss).

### Classification Approach:

- Predict match outcomes directly using labeled targets.

## 6. Feature Importance

We analyze feature importance to identify the factors influencing match outcomes:

- Regression Models: Analyze the importance of rolling averages and performance metrics for predicting goals.

- Classification Models: Evaluate which features are most impactful for determining win, draw, or loss outcomes.

Feature importance analysis provides actionable insights into which metrics are most influential in determining match outcomes.

## 7. Visualization

We use matplotlib and seaborn to create:

- Confusion matrices to assess model accuracy in predicting match results.

- Feature importance bar charts to highlight key drivers of performance for both teams.

### Libraries and Tools Used

- Web Scraping: requests, BeautifulSoup

- Data Analysis: pandas, numpy

- Machine Learning: scikit-learn, xgboost

- Hyperparameter Tuning: GridSearchCV

- Data Balancing: imblearn, ADASYN

- Evaluation and Visualization: matplotlib, seaborn

## 8. Results

  ### Regression
-   By assigning teams as Team 1 (home) and Team 2 (away), the dataset maintained an equal distribution of wins and losses but fewer draws. This imbalance influenced the model's ability to predict draws effectively.
-  The regression models achieved strong recall for wins (71%) and losses (76%), reflecting their ability to accurately predict decisive outcomes. However, recall for draws was low (4%), as the rarity of draws in the data limited the model's performance in this category.
-  Overall accuracy for match outcomes (derived from predicted goals) reached 55%, highlighting the effectiveness of the regression approach for most outcomes, except draws.

### Classification 
-  In this approach, the home team was always designated as Team 1, resulting in a dataset where wins were significantly more prevalent than losses or draws. This class imbalance caused the model to prioritize predicting wins at the expense of other outcomes.
-  The ensemble model achieved an overall accuracy of 42%, with recall scores of 63% for wins, 29% for losses, and 20% for draws. While the model handled wins reasonably well, its performance for losses and draws was weaker, reflecting the challenges of class imbalance in the data.
