import pandas as pd
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import pickle
import time

print("Loading dataset...")
df = pd.read_csv('medroute_nn_training_data.csv')

features = ['urgency', 'wait_days', 'distance_km', 'exp_years', 
            'queue_speed_mins', 'financial_cost_index', 'total_round_trip_hrs', 
            'doctor_rating', 'hospital_tier']

X = df[features].values
y = df['optimal_score'].values.reshape(-1, 1)

print("Scaling features...")
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Save scaler for API
with open('scaler.pkl', 'wb') as f:
    pickle.dump(scaler, f)

X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)

# Convert to PyTorch tensors
X_train_t = torch.FloatTensor(X_train)
y_train_t = torch.FloatTensor(y_train)
X_test_t = torch.FloatTensor(X_test)
y_test_t = torch.FloatTensor(y_test)

train_dataset = TensorDataset(X_train_t, y_train_t)
train_loader = DataLoader(train_dataset, batch_size=256, shuffle=True)

class ClinicalNet(nn.Module):
    def __init__(self, input_dim):
        super(ClinicalNet, self).__init__()
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
        x = self.fc4(x)
        return x

model = ClinicalNet(len(features))
criterion = nn.MSELoss()
optimizer = optim.Adam(model.parameters(), lr=0.001)

print("Training PyTorch Neural Network...")
epochs = 20
for epoch in range(epochs):
    model.train()
    total_loss = 0
    for batch_X, batch_y in train_loader:
        optimizer.zero_grad()
        outputs = model(batch_X)
        loss = criterion(outputs, batch_y)
        loss.backward()
        optimizer.step()
        total_loss += loss.item()
        
    avg_loss = total_loss / len(train_loader)
    print(f"Epoch [{epoch+1}/{epochs}], Loss: {avg_loss:.4f}")

print("Evaluating...")
model.eval()
with torch.no_grad():
    preds = model(X_test_t)
    mse = criterion(preds, y_test_t).item()
    rmse = np.sqrt(mse)
    print(f"Test RMSE: {rmse:.4f}")

print("Saving PyTorch model...")
torch.save(model.state_dict(), 'medroute_nn_model.pt')
print("Model saved successfully!")
