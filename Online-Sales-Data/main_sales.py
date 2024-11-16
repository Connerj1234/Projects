import pandas as pd
import matplotlib.pyplot as plt

total_data = pd.read_csv('/Users/connerjamison/Desktop/school/1302/project/shop.csv')
graph_data = pd.read_csv('/Users/connerjamison/Desktop/school/1302/project/shop.csv', nrows = 500)
data = total_data.dropna()
data2 = graph_data.dropna()

print(total_data.head())

print("AGE")
print("Mean: " + str(round(data['Age'].mean(), 2)))
print("Median: " + str(round(data['Age'].median(), 2)))
print("Variance: " + str(round(data['Age'].var(), 2)))
print("Standard Deviation : " + str(round(data['Age'].std(), 2)))
print("Min Number: " + str(round(data['Age'].min(), 2)))
print("Max Number: " + str(round(data['Age'].max(), 2)))

print("\nREVENUE (in €)")
print("Mean: " + str(round(data['Revenue'].mean(), 2)))
print("Median: " + str(round(data['Revenue'].median(), 2)))
print("Variance: " + str(round(data['Revenue'].var(), 2)))
print("Standard Deviation : " + str(round(data['Revenue'].std(), 2)))
print("Min Number: " + str(round(data['Revenue'].min(), 2)))
print("Max Number: " + str(round(data['Revenue'].max(), 2)))

print("\nNUMBER OF PURCHASES")
print("Mean: " + str(round(data['NumPurchases'].mean(), 2)))
print("Median: " + str(round(data['NumPurchases'].median(), 2)))
print("Variance: " + str(round(data['NumPurchases'].var(), 2)))
print("Standard Deviation : " + str(round(data['NumPurchases'].std(), 2)))
print("Min Number: " + str(round(data['NumPurchases'].min(), 2)))
print("Max Number: " + str(round(data['NumPurchases'].max(), 2)))

print("\nTIME SPENT (in seconds)")
print("Mean: " + str(round(data['TimeSpent'].mean(), 2)))
print("Median: " + str(round(data['TimeSpent'].median(), 2)))
print("Variance: " + str(round(data['TimeSpent'].var(), 2)))
print("Standard Deviation : " + str(round(data['TimeSpent'].std(), 2)))
print("Min Number: " + str(round(data['TimeSpent'].min(), 2)))
print("Max Number: " + str(round(data['TimeSpent'].max(), 2)))

df = pd.DataFrame(data2)
df = df.sort_values('Age', ascending = True).reset_index(drop=True)

df.plot(x='Age', y='PurchaseValue', kind='bar')
plt.xlabel('Age in Years')
plt.ylabel('Value of Purchase in €')
plt.title("Age vs. Value of Purchase in €n")
plt.legend()
plt.show()

df.plot(x='Age', y='NumPurchases', kind='bar')
plt.xlabel('Age in Years')
plt.ylabel('Number of Purchases')
plt.title("Age vs. Number of Purchases")
plt.legend()
plt.show()

df.plot(x='Age', y='TimeSpent', kind='line')
plt.xlabel('Age in Years')
plt.ylabel('Time Spent on Website in Seconds')
plt.title("Age vs. Time Spent on Website in Seconds")
plt.legend()
plt.show()

df = df.sort_values('NumPurchases', ascending = True).reset_index(drop=True)

df.plot(x='NumPurchases', y='PurchaseValue', kind='bar')
plt.xlabel('Number of Purchases')
plt.ylabel('Value of Purchases in €')
plt.title("Number of Purchases vs. Value of Purchases in €")
plt.legend()
plt.show()
