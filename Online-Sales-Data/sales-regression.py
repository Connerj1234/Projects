from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score
import pandas as pd
import numpy as np

data = pd.read_csv('/Users/connerjamison/Desktop/school/1302/project/shop.csv')

features = ['Age', 'Gender', 'NumPurchases', 'TimeSpent', 'Newsletter', 'Voucher']
X = data[features]
y = data['Revenue']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = LinearRegression()
model.fit(X_train, y_train)

y_pred = model.predict(X_test)

r2 = r2_score(y_test, y_pred)

coefficients = pd.DataFrame({
    'Feature': features,
    'Coefficient': model.coef_
}).sort_values(by='Coefficient', ascending=False)

# Display results
print("r2 Score: " + str(r2) + "\n")
print(coefficients)
