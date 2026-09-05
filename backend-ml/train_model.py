import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error
import pickle
import os

print("Loading data...")
df = pd.read_csv('medroute_training_data.csv')

X = df[['urgency', 'wait_days', 'distance_km', 'exp_years', 'queue_speed_mins']]
y = df['optimal_score']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print("Training RandomForestRegressor model...")
model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
model.fit(X_train, y_train)

print("Evaluating...")
preds = model.predict(X_test)
import numpy as np
rmse = np.sqrt(mean_squared_error(y_test, preds))
print(f"RMSE: {rmse:.4f}")

# Test some edge cases manually
def test_edge_case(desc, features):
    pred = model.predict([features])[0]
    print(f"[{desc}] Predicted Score: {pred:.2f}")

print("\n--- Edge Case Predictions ---")
# [urgency, wait_days, distance_km, exp_years, queue_speed_mins]
test_edge_case("Routine, 5 days, 5km (Ideal)", [1, 5, 5, 25, 10])
test_edge_case("Routine, 5 days, 850km (Terrible distance)", [1, 5, 850, 25, 10])
test_edge_case("Critical, 1 day, 850km (Worth the travel)", [10, 1, 850, 25, 10])
test_edge_case("Critical, 14 days, 5km (Too long wait)", [10, 14, 5, 25, 10])

print("\nSaving model to medroute_model.pkl...")
with open('medroute_model.pkl', 'wb') as f:
    pickle.dump(model, f)
print("Model saved successfully.")
