# Data manipulation
import pandas as pd
import numpy as np

# Data visualization
import matplotlib.pyplot as plt
import seaborn as sns

# Data preprocessing
from sklearn.feature_extraction.text import CountVectorizer

# Data modeling
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.metrics import classification_report, accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, ConfusionMatrixDisplay

from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from xgboost import plot_importance

data = pd.read_csv("/Users/connerjamison/Downloads/tiktok_dataset.csv")

""" Examining Data"""
data.head()
data.shape
data.info()
data.describe()

data.isna().sum()
data = data.dropna(axis=0)
data.duplicated().sum()

data["claim_status"].value_counts(normalize=True) # Target variable class balance

""" Feature Engineering"""
data['text_length'] = data['video_transcription_text'].str.len()

data[['claim_status', 'text_length']].groupby('claim_status').mean()

# Visualize the distribution of text_length for claims and opinions using a histogram
sns.histplot(data=data, stat="count", x="text_length",hue="claim_status", element="bars", legend=True)
plt.title("Distribution of video_transcription_text length for claims and opinions")
plt.show()

"""Feature Selection and Transformation"""
X = data.copy()
X = X.drop(['#', 'video_id'], axis=1)
X['claim_status'] = X['claim_status'].replace({'opinion': 0, 'claim': 1}) # Encoding target variable
X = pd.get_dummies(X, columns=['verified_status', 'author_ban_status'], drop_first=True)

"""Splitting Data"""
y = X['claim_status']
X = X.drop(['claim_status'], axis=1)

"""Creating train/validate/test sets"""
X_tr, X_test, y_tr, y_test = train_test_split(X, y, test_size=0.2, random_state=0)
X_train, X_val, y_train, y_val = train_test_split(X_tr, y_tr, test_size=0.25, random_state=0) # Splitting the training data into training and validation sets
X_train.shape, X_val.shape, X_test.shape, y_train.shape, y_val.shape, y_test.shape # Verifying the shapes of the datasets

"""Building Models"""
# Random Forest
rf = RandomForestClassifier(random_state=0)
cv_params = {'max_depth': [5, 7, None], 'max_features': [0.3, 0.6], 'max_samples': [0.7], 'min_samples_leaf': [1,2], 'min_samples_split': [2,3], 'n_estimators': [75,100,200]}
scoring = {'accuracy', 'precision', 'recall', 'f1'}
rf_cv = GridSearchCV(rf, cv_params, scoring=scoring, cv=5, refit='recall') # Using gridsearch for optimal hyperparameters according to maximum recall

rf_cv.fit(X_train, y_train)

rf_cv.best_score_ # Best recall score

rf_cv.best_params_

# XGBoost
xgb = XGBClassifier(objective='binary:logistic', random_state=0)
cv_params = {'max_depth': [4,8,12], 'min_child_weight': [3, 5], 'learning_rate': [0.01, 0.1], 'n_estimators': [300, 500]}
xgb_cv = GridSearchCV(xgb, cv_params, scoring=scoring, cv=5, refit='recall')

xgb_cv.fit(X_train, y_train)

xgb_cv.best_score_

xgb_cv.best_params_

"""Model Evaluation (against validation data)"""
# Random Forest
y_pred = rf_cv.best_estimator_.predict(X_val)

# Random Forest Confusion Matrix
log_cm = confusion_matrix(y_val, y_pred)
log_disp = ConfusionMatrixDisplay(confusion_matrix=log_cm, display_labels=None)
log_disp.plot()
plt.show()

# Classification Report
target_labels = ['opinion', 'claim']
print(classification_report(y_val, y_pred, target_names=target_labels))

# XGBoost
y_pred = xgb_cv.best_estimator_.predict(X_val)

# XGBoost Confusion Matrix
log_cm = confusion_matrix(y_val, y_pred)
log_disp = ConfusionMatrixDisplay(confusion_matrix=log_cm, display_labels=None)
log_disp.plot()
plt.show()

# Classification Report
target_labels = ['opinion', 'claim']
print(classification_report(y_val, y_pred, target_names=target_labels))

"""Champion Model Evaluation (against test data)"""
y_pred = rf_cv.best_estimator_.predict(X_test)

# Confusion Matrix
log_cm = confusion_matrix(y_test, y_pred)
log_disp = ConfusionMatrixDisplay(confusion_matrix=log_cm, display_labels=None)
log_disp.plot()
plt.title('Random forest - test set');
plt.show()

# Feature Importance
importances = rf_cv.best_estimator_.feature_importances_
rf_importances = pd.Series(importances, index=X_test.columns)

fig, ax = plt.subplots()
rf_importances.plot.bar(ax=ax)
ax.set_title('Feature importances')
ax.set_ylabel('Mean decrease in impurity')
fig.tight_layout()
