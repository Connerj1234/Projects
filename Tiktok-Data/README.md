# Tiktok Claims Data

**Background**

At TikTok, the platform empowers users to report videos and comments containing user claims, flagging them for review by moderators. However, the sheer volume of reports makes it challenging to review all flagged content promptly.


**The Problem**

TikTok needs a way to streamline the moderation process by automatically identifying whether a video contains a claim or represents an opinion. A predictive model capable of distinguishing between the two would:
- reduce the backlog of user reports
- help prioritize content review more efficiently.


**The Project**

In this project, I developed a machine learning pipeline to address this challenge, leveraging techniques like:
- Data preprocessing: Handling missing data, feature engineering, and encoding categorical variables.
- Model selection and hyperparameter tuning: Using GridSearchCV to optimize hyperparameters for Random Forest and XGBoost, prioritizing recall for balanced moderation.
- Evaluation: Comparing models using validation data and selecting the best model for final testing.


**Desired Outcome**

The goal was to build an accurate and efficient predictive model that distinguishes claims from opinions. With this model, TikTok moderators can better allocate resources and maintain a platform that supports user creativity while ensuring timely content review.


**TLDR**
I used statsmodels and scikit-learn to predict whether TikTok videos presented claims or opinions to improve the triaging process of videos for human review.
