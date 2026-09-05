"""
Train the 11-feature ClinicalNet (v2) and save medroute_nn_model.pt + scaler.pkl.

Run order:
  1. python generate_data_nn_v2.py
  2. python train_nn_v2.py
  3. python ml_server.py
"""
import pandas as pd
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import pickle

print("Loading v2 dataset...")
df = pd.read_csv('medroute_nn_training_data_v2.csv')

# 11 features (was 9 in v1)
features = [
    'urgency', 'wait_days', 'distance_km', 'exp_years',
    'queue_speed_mins', 'financial_cost_index', 'total_round_trip_hrs',
    'doctor_rating', 'hospital_tier',
    'transport_mode', 'flight_viable'
]

X = df[features].values
y = df['optimal_score'].values.reshape(-1, 1)

print(f"Training on {len(df)} samples, {len(features)} features")
print(f"Mode distribution in data: {df['transport_mode'].value_counts().to_dict()}")

print("Scaling features...")
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

with open('scaler.pkl', 'wb') as f:
    pickle.dump(scaler, f)
print("Scaler saved -> scaler.pkl")

X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, test_size=0.2, random_state=42
)

X_train_t = torch.FloatTensor(X_train)
y_train_t = torch.FloatTensor(y_train)
X_test_t  = torch.FloatTensor(X_test)
y_test_t  = torch.FloatTensor(y_test)

train_loader = DataLoader(
    TensorDataset(X_train_t, y_train_t),
    batch_size=512, shuffle=True
)


class ClinicalNet(nn.Module):
    def __init__(self, input_dim):
        super().__init__()
        self.fc1 = nn.Linear(input_dim, 64)
        self.relu1 = nn.ReLU()
        self.dropout1 = nn.Dropout(0.2)
        self.fc2 = nn.Linear(64, 128)
        self.relu2 = nn.ReLU()
        self.dropout2 = nn.Dropout(0.2)
        self.fc3 = nn.Linear(128, 64)
        self.relu3 = nn.ReLU()
        self.fc4 = nn.Linear(64, 1)

    def forward(self, x):
        x = self.dropout1(self.relu1(self.fc1(x)))
        x = self.dropout2(self.relu2(self.fc2(x)))
        x = self.relu3(self.fc3(x))
        return self.fc4(x)


model = ClinicalNet(len(features))
criterion = nn.MSELoss()
optimizer = optim.Adam(model.parameters(), lr=0.001)

print("Training...")
epochs = 30
for epoch in range(epochs):
    model.train()
    total_loss = 0
    for batch_X, batch_y in train_loader:
        optimizer.zero_grad()
        out = model(batch_X)
        loss = criterion(out, batch_y)
        loss.backward()
        optimizer.step()
        total_loss += loss.item()
    avg = total_loss / len(train_loader)
    if (epoch + 1) % 5 == 0 or epoch == 0:
        print(f"  Epoch [{epoch+1}/{epochs}] loss={avg:.4f}")

print("Evaluating...")
model.eval()
with torch.no_grad():
    preds = model(X_test_t)
    rmse = np.sqrt(criterion(preds, y_test_t).item())
    mae = (preds - y_test_t).abs().mean().item()
print(f"Test RMSE: {rmse:.4f}, MAE: {mae:.4f}")

print("Saving model -> medroute_nn_model.pt")
torch.save(model.state_dict(), 'medroute_nn_model.pt')

# Sanity check: reload the saved state with the same input_dim
sanity = ClinicalNet(len(features))
sanity.load_state_dict(torch.load('medroute_nn_model.pt', weights_only=True))
print("Reload check: OK")
