# MLS Predictions Using ML

### Project Description

**Predicting Soccer Match Outcomes Using Python, Web Scraping, and Machine Learning**

This project predicts the outcome of soccer matches by forecasting the goals scored by two teams (Team 1 and Team 2). By combining web-scraped match data with advanced machine learning techniques, we analyze match statistics, incorporate opponent difficulty, and develop predictive models to evaluate team performance and determine match winners.

#### **1. Data Collection: Web Scraping with Beautiful Soup**
Using Python's `requests` and `BeautifulSoup` libraries, we scrape match data from FBref.com. The data includes:
- Team performance metrics: goals scored (GF), goals conceded (GA), shots, shots on target, xG (expected goals), etc.
- Opponent statistics for each match, such as defensive strength, recent form, and rolling averages of key metrics.

This comprehensive dataset enables the model to account for not just the team's strengths but also the difficulty of their opponents.

#### **2. Data Cleaning and Feature Engineering**
We preprocess the scraped data using `pandas`, focusing on:
- **Standardizing Team Names**: Ensuring consistent naming across datasets for seamless merges.
- **Incorporating Opponent Data**: Adding rolling averages of key opponent metrics (e.g., goals conceded, shots faced, defensive actions) to evaluate match difficulty.
- **Rolling Averages**: Calculating rolling averages for the last five games for both teams and their opponents to account for recent form.
- **Venue Encoding**: Encoding home and away matches with binary flags (`is_home_team1`, `is_home_team2`).
- **Match Metadata**: Extracting features such as match time and day of the week.
- **Team Assignments**: Assigning teams as "Team 1" and "Team 2" for neutral representation of matches.

The cleaned and enriched dataset is saved as a CSV file for reproducibility.

#### **3. Machine Learning Framework**
To predict goals scored by each team, the framework incorporates features representing both Team 1 and Team 2, as well as their opponents. This enables the model to assess match difficulty and team performance simultaneously.

##### **Feature Selection:**
Features used in modeling include:
- **Team Performance Metrics**: Rolling averages of goals scored (`gf`), goals conceded (`ga`), shots on target (`sot`), etc.
- **Opponent Metrics**: Rolling averages of the opponent's goals conceded (`opponent_ga_rolling`), shots faced, and other defensive metrics.
- **Home/Away Indicators**: (`is_home_team1`, `is_home_team2`).
- **Match Metadata**: Hour of the match (`hour`), day of the week (`day_code`).

##### **Model Training:**
We use two machine learning models:
- **Random Forest Regressor**: Captures complex interactions between features through ensemble decision trees.
- **XGBoost Regressor**: A gradient-boosted decision tree model optimized for structured datasets.

##### **Opponent Data Integration:**
The model incorporates rolling averages of opponent statistics (e.g., defensive strength, recent goals conceded) as predictive features. This allows the model to adjust its predictions based on the difficulty of the opponent, reflecting real-world match conditions.

##### **Model Tuning:**
We perform hyperparameter tuning using `GridSearchCV` to optimize model performance. Parameters such as `n_estimators`, `max_depth`, and `learning_rate` are tuned for each model.

#### **4. Model Evaluation**
To evaluate the models:
- **Mean Absolute Error (MAE)**: Quantifies prediction accuracy for goals scored by both teams.
- **Confusion Matrix**: Visualizes the accuracy of match outcome predictions (win, draw, loss).

The inclusion of opponent data significantly improves the model's ability to predict match outcomes by accounting for match difficulty.

#### **5. Match Outcome Predictions**
Using the trained models:
- We predict goals scored by Team 1 and Team 2 for test matches.
- Compare predicted scores to determine the match result (Win, Draw, or Loss).
- Calculate prediction accuracy using `accuracy_score`.

#### **6. Feature Importance**
We analyze feature importance to identify the factors influencing goals scored by both teams:
- **Team Performance Metrics**: Rolling averages of goals scored and conceded by the team.
- **Opponent Metrics**: Rolling averages of the opponent's goals conceded and defensive actions.
- **Home Advantage**: Whether the team played at home or away.
- **Match Timing**: The impact of match timing and day of the week.

Feature importance analysis provides actionable insights into which metrics are most influential in determining match outcomes.

#### **7. Visualization**
We use `matplotlib` and `seaborn` to create:
- A confusion matrix to assess model accuracy in predicting match results.
- Feature importance bar charts to highlight key drivers of performance for both teams.

#### **Libraries and Tools Used**
- **Web Scraping**: `requests`, `BeautifulSoup`
- **Data Analysis**: `pandas`, `numpy`
- **Machine Learning**: `scikit-learn`, `xgboost`
- **Hyperparameter Tuning**: `GridSearchCV`
- **Evaluation and Visualization**: `matplotlib`, `seaborn`

#### **8. Insights and Applications**
By combining team and opponent data, this project provides a robust framework for predicting soccer match outcomes. It demonstrates how opponent difficulty influences performance, enabling predictions that closely reflect real-world dynamics. The approach is applicable to sports analytics, betting, and team strategy optimization.
